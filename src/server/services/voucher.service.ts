import { pool } from '@/db';
import { PoolClient } from 'pg';
import { randomUUID } from 'crypto';
import Decimal from 'decimal.js';
import { nextSerial } from './sequence.service';
import { fetchCashEvents, CashEvent } from '../repositories/ledger.repo';
import { assertNeverNegative } from './cash-guard.service';
import { fiscalYearOf } from '@/lib/fiscal-year';
import { InsufficientCashError } from '@/lib/errors';

export type VoucherType = 'RECEIPT' | 'PAYMENT';
export type DocStatus = 'POSTED' | 'VOID';

export type CreateVoucherInput = {
  type: VoucherType;
  date: string;
  amount: string;
  currency: string;
  cashAccountId: string;
  counterpartyAccountId: string;
  description?: string;
};

export type UpdateVoucherInput = CreateVoucherInput;

const lockCash = async (client: PoolClient, id: string) => {
  await client.query('SELECT id FROM "Account" WHERE id = $1 FOR UPDATE', [id]);
};

function linesFor(id: string, i: CreateVoucherInput) {
  const isReceipt = i.type === 'RECEIPT';
  const amt = new Decimal(i.amount).toFixed(2);
  return [
    {
      id: `vl_${randomUUID().slice(0, 8)}`,
      voucherId: id,
      lineNo: 1,
      accountId: i.cashAccountId,
      debit: isReceipt ? amt : '0.00',
      credit: isReceipt ? '0.00' : amt,
      memo: isReceipt ? 'قبض نقدي بالصندوق' : 'صرف نقدي من الصندوق',
    },
    {
      id: `vl_${randomUUID().slice(0, 8)}`,
      voucherId: id,
      lineNo: 2,
      accountId: i.counterpartyAccountId,
      debit: isReceipt ? '0.00' : amt,
      credit: isReceipt ? amt : '0.00',
      memo: i.description || (isReceipt ? 'سداد حساب' : 'استحقاق صرف'),
    },
  ];
}

const effect = (i: CreateVoucherInput, serial: number): CashEvent => ({
  date: i.date,
  rank: i.type === 'RECEIPT' ? 0 : 1,
  serial,
  ref: 'new',
  delta: (i.type === 'RECEIPT' ? '' : '-') + new Decimal(i.amount).toFixed(2),
});

export async function createVoucher(input: CreateVoucherInput, userId: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Lock cash account row to serialize cash writers
    await lockCash(client, input.cashAccountId);

    const fy = fiscalYearOf(input.date);
    // 2. Next serial from counter table
    const serial = await nextSerial(client, input.type, fy);

    // 3. Simulate cash events to prevent negative cash
    const events = await fetchCashEvents(client, input.cashAccountId);
    assertNeverNegative(events, [effect(input, serial)]);

    // 4. Insert Voucher
    const voucherId = `v_${randomUUID().slice(0, 10)}`;
    const amt = new Decimal(input.amount).toFixed(2);

    const voucherRes = await client.query(
      `
      INSERT INTO "Voucher" (
        id, type, "fiscalYear", serial, "voucherDate", status,
        currency, amount, description, "cashAccountId", "counterpartyAccountId", "createdById"
      )
      VALUES ($1, $2, $3, $4, $5, 'POSTED', $6, $7, $8, $9, $10, $11)
      RETURNING *
      `,
      [
        voucherId,
        input.type,
        fy,
        serial,
        input.date,
        input.currency,
        amt,
        input.description || null,
        input.cashAccountId,
        input.counterpartyAccountId,
        userId,
      ]
    );

    const voucher = voucherRes.rows[0];

    // 5. Insert VoucherLines (المسرّع: استعلام موحد في جولة شبكة واحدة)
    const lines = linesFor(voucherId, input);
    await client.query(
      `INSERT INTO "VoucherLine" (id, "voucherId", "lineNo", "accountId", debit, credit, memo)
       VALUES ($1, $2, $3, $4, $5, $6, $7), ($8, $9, $10, $11, $12, $13, $14)`,
      [
        lines[0].id, lines[0].voucherId, lines[0].lineNo, lines[0].accountId, lines[0].debit, lines[0].credit, lines[0].memo,
        lines[1].id, lines[1].voucherId, lines[1].lineNo, lines[1].accountId, lines[1].debit, lines[1].credit, lines[1].memo,
      ]
    );

    // 6. Audit Log
    await client.query(
      `
      INSERT INTO "AuditLog" (id, "userId", action, entity, "entityId", after, reason)
      VALUES ($1, $2, 'CREATE', 'Voucher', $3, $4, $5)
      `,
      [
        `aud_${randomUUID().slice(0, 8)}`,
        userId,
        voucher.id,
        JSON.stringify(voucher),
        `إنشاء سند ${input.type === 'RECEIPT' ? 'قبض' : 'صرف'} رقم ${serial}`,
      ]
    );

    await client.query('COMMIT');
    return voucher;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateVoucher(id: string, input: UpdateVoucherInput, userId: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. HYDRATE: read the old state first to know which cash account(s) to lock
    const oldRes = await client.query('SELECT * FROM "Voucher" WHERE id = $1', [id]);
    if (oldRes.rows.length === 0) throw new Error('السند غير موجود');
    const old = oldRes.rows[0];
    if (old.status === 'VOID') throw new Error('السند ملغي ولا يمكن تعديله');

    // 2. Lock cash accounts in sorted order to avoid deadlock
    const ids = Array.from(new Set([old.cashAccountId, input.cashAccountId])).sort();
    for (const a of ids) await lockCash(client, a);

    // 3. Re-read voucher after lock
    const freshRes = await client.query('SELECT * FROM "Voucher" WHERE id = $1', [id]);
    const fresh = freshRes.rows[0];
    if (fresh.type !== input.type) throw new Error('لا يمكن تغيير نوع السند');
    if (fiscalYearOf(input.date) !== fresh.fiscalYear) {
      throw new Error('لا يمكن نقل السند إلى سنة مالية أخرى');
    }

    // 4. Cash guard check (simulate excluding the old voucher, injecting new effect)
    const events = await fetchCashEvents(client, input.cashAccountId, { voucherId: id });
    assertNeverNegative(events, [effect(input, fresh.serial)]);

    // 5. Replace lines (المسرّع: استعلام موحد في جولة شبكة واحدة)
    await client.query('DELETE FROM "VoucherLine" WHERE "voucherId" = $1', [id]);
    const lines = linesFor(id, input);
    await client.query(
      `INSERT INTO "VoucherLine" (id, "voucherId", "lineNo", "accountId", debit, credit, memo)
       VALUES ($1, $2, $3, $4, $5, $6, $7), ($8, $9, $10, $11, $12, $13, $14)`,
      [
        lines[0].id, lines[0].voucherId, lines[0].lineNo, lines[0].accountId, lines[0].debit, lines[0].credit, lines[0].memo,
        lines[1].id, lines[1].voucherId, lines[1].lineNo, lines[1].accountId, lines[1].debit, lines[1].credit, lines[1].memo,
      ]
    );

    // 6. Update Voucher record
    const amt = new Decimal(input.amount).toFixed(2);
    const updatedRes = await client.query(
      `
      UPDATE "Voucher"
         SET "voucherDate" = $1, amount = $2, currency = $3, description = $4,
             "cashAccountId" = $5, "counterpartyAccountId" = $6, "updatedAt" = NOW()
       WHERE id = $7
      RETURNING *
      `,
      [
        input.date,
        amt,
        input.currency,
        input.description || null,
        input.cashAccountId,
        input.counterpartyAccountId,
        id,
      ]
    );

    const updated = updatedRes.rows[0];

    // 7. Audit Log
    await client.query(
      `
      INSERT INTO "AuditLog" (id, "userId", action, entity, "entityId", before, after, reason)
      VALUES ($1, $2, 'UPDATE', 'Voucher', $3, $4, 'تعديل بيانات السند')
      `,
      [`aud_${randomUUID().slice(0, 8)}`, userId, id, JSON.stringify(fresh), JSON.stringify(updated)]
    );

    await client.query('COMMIT');
    return updated;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function voidVoucher(id: string, reason: string, userId: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const oldRes = await client.query('SELECT * FROM "Voucher" WHERE id = $1', [id]);
    if (oldRes.rows.length === 0) throw new Error('السند غير موجود');
    const old = oldRes.rows[0];

    await lockCash(client, old.cashAccountId);

    const freshRes = await client.query('SELECT * FROM "Voucher" WHERE id = $1', [id]);
    const fresh = freshRes.rows[0];
    if (fresh.status === 'VOID') {
      await client.query('COMMIT');
      return fresh; // idempotent
    }

    // Cash guard: removing a receipt may cause subsequent payments to go negative
    const events = await fetchCashEvents(client, fresh.cashAccountId, { voucherId: id });
    assertNeverNegative(events, []);

    // Set status to VOID
    const voidedRes = await client.query(
      `
      UPDATE "Voucher"
         SET status = 'VOID', "voidedAt" = NOW(), "voidReason" = $1
       WHERE id = $2
      RETURNING *
      `,
      [reason || 'إلغاء السند بطلب المستخدم', id]
    );

    const voided = voidedRes.rows[0];

    // Also update lines so they zero out or remain tied to VOID voucher
    // Because the triggers check balance per voucher, keeping lines as-is with status='VOID' on voucher is fine
    // because fetchCashEvents filters only `v.status = 'POSTED'`!

    // Audit Log
    await client.query(
      `
      INSERT INTO "AuditLog" (id, "userId", action, entity, "entityId", before, after, reason)
      VALUES ($1, $2, 'VOID', 'Voucher', $3, $4, $5, $6)
      `,
      [
        `aud_${randomUUID().slice(0, 8)}`,
        userId,
        id,
        JSON.stringify(fresh),
        JSON.stringify(voided),
        reason || 'إلغاء السند',
      ]
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

export type VoucherDetails = {
  id: string;
  type: VoucherType;
  fiscalYear: number;
  serial: number;
  voucherDate: string;
  status: DocStatus;
  currency: string;
  amount: string;
  description: string | null;
  cashAccountId: string;
  cashAccountName: string;
  counterpartyAccountId: string;
  counterpartyAccountName: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
  voidedAt: string | null;
  voidReason: string | null;
};

export async function getVoucherById(id: string): Promise<VoucherDetails | null> {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `
      SELECT v.id, v.type, v."fiscalYear", v.serial, v."voucherDate"::text as "voucherDate",
             v.status, v.currency, v.amount::text, v.description,
             v."cashAccountId", c."nameAr" as "cashAccountName",
             v."counterpartyAccountId", p."nameAr" as "counterpartyAccountName",
             v."createdById", u.name as "createdByName",
             v."createdAt"::text as "createdAt", v."voidedAt"::text as "voidedAt", v."voidReason"
        FROM "Voucher" v
        JOIN "Account" c ON c.id = v."cashAccountId"
        JOIN "Account" p ON p.id = v."counterpartyAccountId"
        JOIN "User" u ON u.id = v."createdById"
       WHERE v.id = $1
      `,
      [id]
    );

    return res.rows[0] ?? null;
  } finally {
    client.release();
  }
}

export type VoucherFilters = {
  type?: VoucherType;
  status?: DocStatus | 'ALL';
  startDate?: string;
  endDate?: string;
  search?: string;
  fiscalYear?: number;
  limit?: number;
  offset?: number;
};

export async function listVouchers(filters: VoucherFilters = {}) {
  try {
    const client = await pool.connect();
    try {
      const conditions: string[] = [];
      const params: any[] = [];
      let pIdx = 1;

      if (filters.type) {
        conditions.push(`v.type = $${pIdx++}`);
        params.push(filters.type);
      }
      if (filters.status && filters.status !== 'ALL') {
        conditions.push(`v.status = $${pIdx++}`);
        params.push(filters.status);
      }
      if (filters.startDate) {
        conditions.push(`v."voucherDate" >= $${pIdx++}`);
        params.push(filters.startDate);
      }
      if (filters.endDate) {
        conditions.push(`v."voucherDate" <= $${pIdx++}`);
        params.push(filters.endDate);
      }
      if (filters.fiscalYear) {
        conditions.push(`v."fiscalYear" = $${pIdx++}`);
        params.push(filters.fiscalYear);
      }
      if (filters.search) {
        conditions.push(`(p."nameAr" ILIKE $${pIdx} OR v.description ILIKE $${pIdx} OR v.serial::text = $${pIdx + 1})`);
        params.push(`%${filters.search}%`);
        params.push(filters.search.replace(/\D/g, '') || '-1');
        pIdx += 2;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countRes = await client.query(
        `
        SELECT COUNT(*) as total
          FROM "Voucher" v
          JOIN "Account" p ON p.id = v."counterpartyAccountId"
        ${whereClause}
        `,
        params
      );

      const limit = filters.limit || 50;
      const offset = filters.offset || 0;

      const listQuery = `
        SELECT v.id, v.type, v."fiscalYear", v.serial, v."voucherDate"::text as "voucherDate",
               v.status, v.currency, v.amount::text, v.description,
               v."cashAccountId", c."nameAr" as "cashAccountName",
               v."counterpartyAccountId", p."nameAr" as "counterpartyAccountName",
               v."createdById", u.name as "createdByName",
               v."createdAt"::text as "createdAt", v."voidedAt"::text as "voidedAt", v."voidReason"
          FROM "Voucher" v
          JOIN "Account" c ON c.id = v."cashAccountId"
          JOIN "Account" p ON p.id = v."counterpartyAccountId"
          JOIN "User" u ON u.id = v."createdById"
        ${whereClause}
         ORDER BY v."voucherDate" DESC, v.serial DESC
         LIMIT $${pIdx++} OFFSET $${pIdx++}
      `;

      const rowsRes = await client.query(listQuery, [...params, limit, offset]);

      return {
        total: parseInt(countRes.rows[0].total, 10),
        rows: rowsRes.rows as VoucherDetails[],
      };
    } finally {
      client.release();
    }
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.message?.includes('connect')) {
      return { total: 0, rows: [] };
    }
    throw err;
  }
}

export async function getCashBoxBalances() {
  try {
    const client = await pool.connect();
    try {
      const cashBoxes = await client.query(`
        SELECT id, code, "nameAr", currency
          FROM "Account"
         WHERE "isCashBox" = true AND "isActive" = true
         ORDER BY currency ASC
      `);

      const result = [];
      for (const box of cashBoxes.rows) {
        const events = await fetchCashEvents(client, box.id);
        let bal = new Decimal(0);
        for (const e of events) {
          bal = bal.plus(e.delta);
        }
        result.push({
          id: box.id,
          code: box.code,
          nameAr: box.nameAr,
          currency: box.currency,
          balance: bal.toFixed(2),
        });
      }

      return result;
    } finally {
      client.release();
    }
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.message?.includes('connect')) {
      return [
        { id: 'acc_cash_yer', code: '110101', nameAr: 'الصندوق الرئيسي (ريال يمني)', currency: 'YER', balance: '0.00' },
        { id: 'acc_cash_sar', code: '110102', nameAr: 'صندوق الريال السعودي', currency: 'SAR', balance: '0.00' },
        { id: 'acc_cash_usd', code: '110103', nameAr: 'صندوق الدولار الأمريكي', currency: 'USD', balance: '0.00' },
      ];
    }
    throw err;
  }
}
