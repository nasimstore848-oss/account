import { PoolClient } from 'pg';

export type CashEvent = {
  date: string;
  rank: number;
  serial: number;
  delta: string;
  ref: string;
};

export async function fetchCashEvents(
  client: PoolClient,
  cashAccountId: string,
  exclude: { voucherId?: string; journalId?: string } = {}
): Promise<CashEvent[]> {
  const query = `
    SELECT v."voucherDate"::text AS date,
           CASE WHEN l.debit > 0 THEN 0 ELSE 1 END AS rank,
           v.serial, (l.debit - l.credit)::text AS delta, v.id AS ref
      FROM "VoucherLine" l JOIN "Voucher" v ON v.id = l."voucherId"
     WHERE l."accountId" = $1 AND v.status = 'POSTED'
       AND v.id IS DISTINCT FROM $2
    UNION ALL
    SELECT j."entryDate"::text, 
           CASE WHEN l.debit > 0 THEN 0 ELSE 1 END,
           j.serial, (l.debit - l.credit)::text, j.id
      FROM "JournalEntryLine" l JOIN "JournalEntry" j ON j.id = l."entryId"
     WHERE l."accountId" = $1 AND j.status = 'POSTED'
       AND j.id IS DISTINCT FROM $3
  `;

  const res = await client.query<CashEvent>(query, [
    cashAccountId,
    exclude.voucherId ?? null,
    exclude.journalId ?? null,
  ]);

  return res.rows;
}
