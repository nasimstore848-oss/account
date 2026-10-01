import { pool } from '@/db';
import { randomUUID } from 'crypto';
import Decimal from 'decimal.js';
import { nextSerial } from './sequence.service';
import { fetchCashEvents, CashEvent } from '../repositories/ledger.repo';
import { assertNeverNegative } from './cash-guard.service';
import { fiscalYearOf } from '@/lib/fiscal-year';

export type JournalKind = 'GENERAL' | 'OPENING' | 'ADJUSTING';

export type JournalLineInput = {
  accountId: string;
  debit: string;
  credit: string;
  memo?: string;
};

export type CreateJournalInput = {
  kind?: JournalKind;
  date: string;
  description?: string;
  lines: JournalLineInput[];
};

export async function createJournalEntry(input: CreateJournalInput, userId: string) {
  if (!input.lines || input.lines.length < 2) {
    throw new Error('يجب إدخال سطرين على الأقل للقيد المحاسبي');
  }

  // Double entry validation in JS
  let totalDebit = new Decimal(0);
  let totalCredit = new Decimal(0);
  for (const l of input.lines) {
    const d = new Decimal(l.debit || 0);
    const c = new Decimal(l.credit || 0);
    if (d.isNegative() || c.isNegative()) {
      throw new Error('لا يمكن إدخال مبالغ سالبة في أسطر القيد');
    }
    if (d.greaterThan(0) && c.greaterThan(0)) {
      throw new Error('لا يمكن أن يحتوي السطر الواحد على مدين ودائن معاً');
    }
    totalDebit = totalDebit.plus(d);
    totalCredit = totalCredit.plus(c);
  }

  if (!totalDebit.equals(totalCredit)) {
    throw new Error(`القيد غير متزن: إجمالي المدين (${totalDebit.toFixed(2)}) لا يساوي إجمالي الدائن (${totalCredit.toFixed(2)})`);
  }

  if (totalDebit.equals(0)) {
    throw new Error('إجمالي القيد يجب أن يكون أكبر من صفر');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const fy = fiscalYearOf(input.date);

    // Check if any line touches a guarded cash box
    const accountIds = Array.from(new Set(input.lines.map((l) => l.accountId)));
    const cashBoxesRes = await client.query<{ id: string }>(
      'SELECT id FROM "Account" WHERE id = ANY($1) AND "isCashBox" = true ORDER BY id ASC',
      [accountIds]
    );

    // If cash boxes are touched, lock them in order and run cash guard
    for (const box of cashBoxesRes.rows) {
      await client.query('SELECT id FROM "Account" WHERE id = $1 FOR UPDATE', [box.id]);
    }

    const serial = await nextSerial(client, 'JOURNAL', fy);

    // Simulate for each cash box touched
    for (const box of cashBoxesRes.rows) {
      const boxLines = input.lines.filter((l) => l.accountId === box.id);
      const injected: CashEvent[] = boxLines.map((l) => {
        const d = new Decimal(l.debit || 0);
        const c = new Decimal(l.credit || 0);
        const delta = d.minus(c).toFixed(2);
        return {
          date: input.date,
          rank: d.greaterThan(0) ? 0 : 1,
          serial,
          ref: 'new_journal',
          delta,
        };
      });

      const events = await fetchCashEvents(client, box.id);
      assertNeverNegative(events, injected);
    }

    // Insert JournalEntry
    const entryId = `je_${randomUUID().slice(0, 10)}`;
    const entryRes = await client.query(
      `
      INSERT INTO "JournalEntry" (id, kind, "fiscalYear", serial, "entryDate", status, description, "createdById")
      VALUES ($1, $2, $3, $4, $5, 'POSTED', $6, $7)
      RETURNING *
      `,
      [
        entryId,
        input.kind || 'GENERAL',
        fy,
        serial,
        input.date,
        input.description || null,
        userId,
      ]
    );

    const entry = entryRes.rows[0];

    // Insert lines
    let lineNo = 1;
    for (const l of input.lines) {
      await client.query(
        `
        INSERT INTO "JournalEntryLine" (id, "entryId", "lineNo", "accountId", debit, credit, memo)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          `jel_${randomUUID().slice(0, 8)}`,
          entryId,
          lineNo++,
          l.accountId,
          new Decimal(l.debit || 0).toFixed(2),
          new Decimal(l.credit || 0).toFixed(2),
          l.memo || null,
        ]
      );
    }

    // Audit Log
    await client.query(
      `
      INSERT INTO "AuditLog" (id, "userId", action, entity, "entityId", after, reason)
      VALUES ($1, $2, 'CREATE', 'JournalEntry', $3, $4, $5)
      `,
      [
        `aud_${randomUUID().slice(0, 8)}`,
        userId,
        entryId,
        JSON.stringify(entry),
        `إنشاء قيد يومية رقم ${serial}`,
      ]
    );

    await client.query('COMMIT');
    return entry;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function voidJournalEntry(id: string, reason: string, userId: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const entryRes = await client.query('SELECT * FROM "JournalEntry" WHERE id = $1', [id]);
    if (entryRes.rows.length === 0) throw new Error('القيد غير موجود');
    const entry = entryRes.rows[0];
    if (entry.status === 'VOID') {
      await client.query('COMMIT');
      return entry;
    }

    // Check if any lines touch cash boxes
    const linesRes = await client.query(
      `SELECT l."accountId", a."isCashBox"
         FROM "JournalEntryLine" l
         JOIN "Account" a ON a.id = l."accountId"
        WHERE l."entryId" = $1 AND a."isCashBox" = true`,
      [id]
    );

    for (const row of linesRes.rows) {
      await client.query('SELECT id FROM "Account" WHERE id = $1 FOR UPDATE', [row.accountId]);
      const events = await fetchCashEvents(client, row.accountId, { journalId: id });
      assertNeverNegative(events, []);
    }

    const voidedRes = await client.query(
      `
      UPDATE "JournalEntry"
         SET status = 'VOID', "voidedAt" = NOW()
       WHERE id = $1
      RETURNING *
      `,
      [id]
    );

    const voided = voidedRes.rows[0];

    await client.query(
      `
      INSERT INTO "AuditLog" (id, "userId", action, entity, "entityId", before, after, reason)
      VALUES ($1, $2, 'VOID', 'JournalEntry', $3, $4, $5, $6)
      `,
      [`aud_${randomUUID().slice(0, 8)}`, userId, id, JSON.stringify(entry), JSON.stringify(voided), reason]
    );

    await client.query('COMMIT');
    return voided;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function listJournalEntries(filters: { search?: string; startDate?: string; endDate?: string } = {}) {
  try {
    const client = await pool.connect();
    try {
      const conditions: string[] = [];
      const params: any[] = [];
      let pIdx = 1;

      if (filters.startDate) {
        conditions.push(`j."entryDate" >= $${pIdx++}`);
        params.push(filters.startDate);
      }
      if (filters.endDate) {
        conditions.push(`j."entryDate" <= $${pIdx++}`);
        params.push(filters.endDate);
      }
      if (filters.search) {
        conditions.push(`(j.description ILIKE $${pIdx} OR j.serial::text = $${pIdx + 1})`);
        params.push(`%${filters.search}%`);
        params.push(filters.search.replace(/\D/g, '') || '-1');
        pIdx += 2;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const query = `
        SELECT j.id, j.kind, j."fiscalYear", j.serial, j."entryDate"::text as "entryDate",
               j.status, j.description, j."createdById", u.name as "createdByName",
               j."createdAt"::text as "createdAt",
               COALESCE((SELECT SUM(debit) FROM "JournalEntryLine" WHERE "entryId" = j.id), 0)::text as "totalAmount"
          FROM "JournalEntry" j
          JOIN "User" u ON u.id = j."createdById"
        ${whereClause}
         ORDER BY j."entryDate" DESC, j.serial DESC
      `;

      const res = await client.query(query, params);
      return res.rows;
    } finally {
      client.release();
    }
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.message?.includes('connect')) {
      return [];
    }
    throw err;
  }
}

export async function getJournalEntryWithLines(id: string) {
  const client = await pool.connect();
  try {
    const entryRes = await client.query(
      `
      SELECT j.id, j.kind, j."fiscalYear", j.serial, j."entryDate"::text as "entryDate",
             j.status, j.description, j."createdById", u.name as "createdByName",
             j."createdAt"::text as "createdAt", j."voidedAt"::text as "voidedAt"
        FROM "JournalEntry" j
        JOIN "User" u ON u.id = j."createdById"
       WHERE j.id = $1
      `,
      [id]
    );

    if (entryRes.rows.length === 0) return null;
    const entry = entryRes.rows[0];

    const linesRes = await client.query(
      `
      SELECT l.id, l."lineNo", l."accountId", a.code as "accountCode", a."nameAr" as "accountName",
             l.debit::text, l.credit::text, l.memo
        FROM "JournalEntryLine" l
        JOIN "Account" a ON a.id = l."accountId"
       WHERE l."entryId" = $1
       ORDER BY l."lineNo" ASC
      `,
      [id]
    );

    return {
      ...entry,
      lines: linesRes.rows,
    };
  } finally {
    client.release();
  }
}
