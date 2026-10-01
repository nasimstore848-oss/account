-- 1. Amount sanity on every line
ALTER TABLE "VoucherLine" DROP CONSTRAINT IF EXISTS vl_amount_chk;
ALTER TABLE "VoucherLine" ADD CONSTRAINT vl_amount_chk CHECK (debit >= 0 AND credit >= 0 AND NOT (debit > 0 AND credit > 0));

ALTER TABLE "JournalEntryLine" DROP CONSTRAINT IF EXISTS jl_amount_chk;
ALTER TABLE "JournalEntryLine" ADD CONSTRAINT jl_amount_chk CHECK (debit >= 0 AND credit >= 0 AND NOT (debit > 0 AND credit > 0));

ALTER TABLE "Voucher" DROP CONSTRAINT IF EXISTS v_amount_pos;
ALTER TABLE "Voucher" ADD CONSTRAINT v_amount_pos CHECK (amount > 0);

-- 2. Double-entry balance enforced by the DB itself (deferred: checked at COMMIT)
CREATE OR REPLACE FUNCTION assert_balanced() RETURNS trigger AS $$
DECLARE d numeric; c numeric; tbl text := TG_ARGV[0]; fk text := TG_ARGV[1]; oid text;
BEGIN
  oid := COALESCE(to_jsonb(NEW)->>fk, to_jsonb(OLD)->>fk);
  EXECUTE format('SELECT COALESCE(SUM(debit),0), COALESCE(SUM(credit),0) FROM %I WHERE %I = $1', tbl, fk)
    INTO d, c USING oid;
  IF d <> c THEN RAISE EXCEPTION 'UNBALANCED_ENTRY: debit % <> credit %', d, c; END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vl_balanced ON "VoucherLine";
CREATE CONSTRAINT TRIGGER vl_balanced AFTER INSERT OR UPDATE OR DELETE ON "VoucherLine"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION assert_balanced('VoucherLine','voucherId');

DROP TRIGGER IF EXISTS jl_balanced ON "JournalEntryLine";
CREATE CONSTRAINT TRIGGER jl_balanced AFTER INSERT OR UPDATE OR DELETE ON "JournalEntryLine"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION assert_balanced('JournalEntryLine','entryId');

-- 3. Fuzzy payee search (voice)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
DROP INDEX IF EXISTS account_name_trgm;
CREATE INDEX account_name_trgm ON "Account" USING gin ("nameAr" gin_trgm_ops);

-- 4. Only one guarded cash box per currency
DROP INDEX IF EXISTS one_cash_per_ccy;
CREATE UNIQUE INDEX one_cash_per_ccy ON "Account"(currency) WHERE "isCashBox" = true;
