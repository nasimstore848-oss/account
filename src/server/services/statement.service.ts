import { pool } from '@/db';
import Decimal from 'decimal.js';
import { getAccountById, AccountRecord } from '../repositories/account.repo';

export type StatementMovement = {
  date: string;
  serial: number;
  doc: string;
  memo: string | null;
  debit: string;
  credit: string;
  balance: string;
  ref: string;
};

export type AccountStatementResult = {
  account: AccountRecord;
  startDate: string;
  endDate: string;
  openingBalance: string;
  openingBalanceType: 'DEBIT' | 'CREDIT' | 'ZERO';
  totalDebit: string;
  totalCredit: string;
  closingBalance: string;
  closingBalanceType: 'DEBIT' | 'CREDIT' | 'ZERO';
  movements: StatementMovement[];
};

export async function getAccountStatement(
  accountId: string,
  startDate?: string,
  endDate?: string
): Promise<AccountStatementResult> {
  const account = await getAccountById(accountId);
  if (!account) {
    throw new Error('الحساب غير موجود');
  }

  const currentYear = new Date().getFullYear();
  const start = startDate || `${currentYear}-01-01`;
  const end = endDate || `${currentYear}-12-31`;

  let client;
  try {
    client = await pool.connect();
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.message?.includes('connect')) {
      return {
        account,
        startDate: start,
        endDate: end,
        openingBalance: '0.00',
        openingBalanceType: 'ZERO',
        totalDebit: '0.00',
        totalCredit: '0.00',
        closingBalance: '0.00',
        closingBalanceType: 'ZERO',
        movements: [],
      };
    }
    throw err;
  }
  try {
    // 1. Opening balance before `start`
    const openingRes = await client.query<{ balance_before: string }>(
      `
      WITH moves_before AS (
        SELECT l.debit, l.credit
          FROM "VoucherLine" l
          JOIN "Voucher" v ON v.id = l."voucherId"
         WHERE l."accountId" = $1 AND v.status = 'POSTED' AND v."voucherDate" < $2
        UNION ALL
        SELECT l.debit, l.credit
          FROM "JournalEntryLine" l
          JOIN "JournalEntry" j ON j.id = l."entryId"
         WHERE l."accountId" = $1 AND j.status = 'POSTED' AND j."entryDate" < $2
      )
      SELECT COALESCE(SUM(debit - credit), 0)::text as balance_before
        FROM moves_before
      `,
      [accountId, start]
    );

    const openBalDec = new Decimal(openingRes.rows[0]?.balance_before || '0');

    // 2. Movements in range [start, end]
    const movementsRes = await client.query<{
      date: string;
      serial: number;
      doc: string;
      memo: string | null;
      debit: string;
      credit: string;
      ref: string;
    }>(
      `
      SELECT v."voucherDate"::text AS date,
             v.serial,
             'سند ' || CASE v.type WHEN 'RECEIPT' THEN 'قبض' ELSE 'صرف' END AS doc,
             v.description AS memo,
             l.debit::text,
             l.credit::text,
             v.id as ref
        FROM "VoucherLine" l
        JOIN "Voucher" v ON v.id = l."voucherId"
       WHERE l."accountId" = $1 AND v.status = 'POSTED' AND v."voucherDate" BETWEEN $2 AND $3
      UNION ALL
      SELECT j."entryDate"::text AS date,
             j.serial,
             'قيد يومية' AS doc,
             j.description AS memo,
             l.debit::text,
             l.credit::text,
             j.id as ref
        FROM "JournalEntryLine" l
        JOIN "JournalEntry" j ON j.id = l."entryId"
       WHERE l."accountId" = $1 AND j.status = 'POSTED' AND j."entryDate" BETWEEN $2 AND $3
       ORDER BY date ASC, serial ASC
      `,
      [accountId, start, end]
    );

    let runningBal = openBalDec;
    let periodDebit = new Decimal(0);
    let periodCredit = new Decimal(0);

    const movements: StatementMovement[] = movementsRes.rows.map((row) => {
      const d = new Decimal(row.debit);
      const c = new Decimal(row.credit);
      periodDebit = periodDebit.plus(d);
      periodCredit = periodCredit.plus(c);
      runningBal = runningBal.plus(d).minus(c);

      return {
        date: row.date,
        serial: row.serial,
        doc: row.doc,
        memo: row.memo,
        debit: d.toFixed(2),
        credit: c.toFixed(2),
        balance: runningBal.toFixed(2),
        ref: row.ref,
      };
    });

    const closingBal = runningBal;

    const getBalType = (val: Decimal): 'DEBIT' | 'CREDIT' | 'ZERO' => {
      if (val.greaterThan(0)) return 'DEBIT';
      if (val.isNegative()) return 'CREDIT';
      return 'ZERO';
    };

    return {
      account,
      startDate: start,
      endDate: end,
      openingBalance: openBalDec.toFixed(2),
      openingBalanceType: getBalType(openBalDec),
      totalDebit: periodDebit.toFixed(2),
      totalCredit: periodCredit.toFixed(2),
      closingBalance: closingBal.toFixed(2),
      closingBalanceType: getBalType(closingBal),
      movements,
    };
  } finally {
    client.release();
  }
}
