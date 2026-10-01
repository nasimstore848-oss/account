import { pgTable, text, integer, date, timestamp, boolean, numeric, jsonb, primaryKey, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('User', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('passwordHash').notNull(),
  role: text('role').notNull().default('ACCOUNTANT'), // ADMIN, ACCOUNTANT, VIEWER
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

export const accounts = pgTable('Account', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  nameAr: text('nameAr').notNull(),
  type: text('type').notNull(), // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
  currency: text('currency').notNull().default('YER'), // YER, SAR, USD
  isCashBox: boolean('isCashBox').notNull().default(false),
  isPostable: boolean('isPostable').notNull().default(true),
  isActive: boolean('isActive').notNull().default(true),
  parentId: text('parentId'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => [
  index('acc_parent_idx').on(table.parentId),
  index('acc_type_idx').on(table.type),
  index('acc_cashbox_idx').on(table.isCashBox),
  index('acc_name_ar_idx').on(table.nameAr),
]);

export const vouchers = pgTable('Voucher', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // RECEIPT, PAYMENT
  fiscalYear: integer('fiscalYear').notNull(),
  serial: integer('serial').notNull(),
  voucherDate: date('voucherDate').notNull(),
  status: text('status').notNull().default('POSTED'), // POSTED, VOID
  currency: text('currency').notNull().default('YER'),
  amount: numeric('amount', { precision: 18, scale: 2 }).notNull(),
  description: text('description'),
  cashAccountId: text('cashAccountId').notNull().references(() => accounts.id),
  counterpartyAccountId: text('counterpartyAccountId').notNull().references(() => accounts.id),
  createdById: text('createdById').notNull().references(() => users.id),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  voidedAt: timestamp('voidedAt'),
  voidReason: text('voidReason'),
}, (table) => [
  uniqueIndex('voucher_type_fy_serial_uniq').on(table.type, table.fiscalYear, table.serial),
  index('voucher_cash_date_serial_idx').on(table.cashAccountId, table.voucherDate, table.serial),
  index('voucher_counterparty_date_idx').on(table.counterpartyAccountId, table.voucherDate),
  index('voucher_status_idx').on(table.status),
]);

export const voucherLines = pgTable('VoucherLine', {
  id: text('id').primaryKey(),
  voucherId: text('voucherId').notNull().references(() => vouchers.id, { onDelete: 'cascade' }),
  lineNo: integer('lineNo').notNull(),
  accountId: text('accountId').notNull().references(() => accounts.id),
  debit: numeric('debit', { precision: 18, scale: 2 }).notNull().default('0'),
  credit: numeric('credit', { precision: 18, scale: 2 }).notNull().default('0'),
  memo: text('memo'),
}, (table) => [
  uniqueIndex('vl_voucher_line_uniq').on(table.voucherId, table.lineNo),
  index('vl_account_idx').on(table.accountId),
]);

export const journalEntries = pgTable('JournalEntry', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull().default('GENERAL'), // GENERAL, OPENING, ADJUSTING
  fiscalYear: integer('fiscalYear').notNull(),
  serial: integer('serial').notNull(),
  entryDate: date('entryDate').notNull(),
  status: text('status').notNull().default('POSTED'), // POSTED, VOID
  description: text('description'),
  createdById: text('createdById').notNull().references(() => users.id),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  voidedAt: timestamp('voidedAt'),
}, (table) => [
  uniqueIndex('journal_fy_serial_uniq').on(table.fiscalYear, table.serial),
  index('journal_date_idx').on(table.entryDate),
]);

export const journalEntryLines = pgTable('JournalEntryLine', {
  id: text('id').primaryKey(),
  entryId: text('entryId').notNull().references(() => journalEntries.id, { onDelete: 'cascade' }),
  lineNo: integer('lineNo').notNull(),
  accountId: text('accountId').notNull().references(() => accounts.id),
  debit: numeric('debit', { precision: 18, scale: 2 }).notNull().default('0'),
  credit: numeric('credit', { precision: 18, scale: 2 }).notNull().default('0'),
  memo: text('memo'),
}, (table) => [
  uniqueIndex('jl_entry_line_uniq').on(table.entryId, table.lineNo),
  index('jl_account_idx').on(table.accountId),
]);

export const documentSequences = pgTable('DocumentSequence', {
  scope: text('scope').notNull(), // 'RECEIPT', 'PAYMENT', 'JOURNAL'
  fiscalYear: integer('fiscalYear').notNull(),
  lastValue: integer('lastValue').notNull().default(0),
}, (table) => [
  primaryKey({ columns: [table.scope, table.fiscalYear] }),
]);

export const auditLogs = pgTable('AuditLog', {
  id: text('id').primaryKey(),
  at: timestamp('at').defaultNow().notNull(),
  userId: text('userId').notNull().references(() => users.id),
  action: text('action').notNull(), // CREATE, UPDATE, VOID, LOGIN, ACCOUNT_CREATE
  entity: text('entity').notNull(), // Voucher, JournalEntry, Account
  entityId: text('entityId').notNull(),
  before: jsonb('before'),
  after: jsonb('after'),
  reason: text('reason'),
}, (table) => [
  index('audit_entity_idx').on(table.entity, table.entityId),
  index('audit_at_idx').on(table.at),
  index('audit_user_idx').on(table.userId),
  index('audit_entity_at_idx').on(table.entity, table.at),
]);

// Drizzle relations
export const usersRelations = relations(users, ({ many }) => ({
  vouchers: many(vouchers),
  journals: many(journalEntries),
  audits: many(auditLogs),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  parent: one(accounts, {
    fields: [accounts.parentId],
    references: [accounts.id],
    relationName: 'AccountTree',
  }),
  children: many(accounts, { relationName: 'AccountTree' }),
  voucherLines: many(voucherLines),
  journalLines: many(journalEntryLines),
}));

export const vouchersRelations = relations(vouchers, ({ one, many }) => ({
  cashAccount: one(accounts, {
    fields: [vouchers.cashAccountId],
    references: [accounts.id],
  }),
  counterpartyAccount: one(accounts, {
    fields: [vouchers.counterpartyAccountId],
    references: [accounts.id],
  }),
  createdBy: one(users, {
    fields: [vouchers.createdById],
    references: [users.id],
  }),
  lines: many(voucherLines),
}));

export const voucherLinesRelations = relations(voucherLines, ({ one }) => ({
  voucher: one(vouchers, {
    fields: [voucherLines.voucherId],
    references: [vouchers.id],
  }),
  account: one(accounts, {
    fields: [voucherLines.accountId],
    references: [accounts.id],
  }),
}));

export const journalEntriesRelations = relations(journalEntries, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [journalEntries.createdById],
    references: [users.id],
  }),
  lines: many(journalEntryLines),
}));

export const journalEntryLinesRelations = relations(journalEntryLines, ({ one }) => ({
  entry: one(journalEntries, {
    fields: [journalEntryLines.entryId],
    references: [journalEntries.id],
  }),
  account: one(accounts, {
    fields: [journalEntryLines.accountId],
    references: [accounts.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));
