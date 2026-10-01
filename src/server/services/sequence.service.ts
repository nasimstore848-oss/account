import { PoolClient } from 'pg';

export async function nextSerial(
  client: PoolClient,
  scope: string,
  fiscalYear: number
): Promise<number> {
  const res = await client.query<{ lastValue: number }>(
    `
    INSERT INTO "DocumentSequence" (scope, "fiscalYear", "lastValue")
    VALUES ($1, $2, 1)
    ON CONFLICT (scope, "fiscalYear")
    DO UPDATE SET "lastValue" = "DocumentSequence"."lastValue" + 1
    RETURNING "lastValue"
    `,
    [scope, fiscalYear]
  );

  return res.rows[0].lastValue;
}
