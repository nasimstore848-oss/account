import Decimal from 'decimal.js';
import { CashEvent } from '../repositories/ledger.repo';
import { InsufficientCashError } from '@/lib/errors';

export { InsufficientCashError };

/**
 * events: all existing cash events EXCLUDING the record being mutated.
 * injected: zero or more hypothetical events (the new/edited effect).
 */
export function assertNeverNegative(events: CashEvent[], injected: CashEvent[]) {
  const all = [...events, ...injected].sort(
    (a, b) => a.date.localeCompare(b.date) || a.rank - b.rank || a.serial - b.serial
  );

  let bal = new Decimal(0);
  for (const e of all) {
    bal = bal.plus(e.delta);
    if (bal.isNegative()) {
      throw new InsufficientCashError(e.date, bal.abs().toFixed(2));
    }
  }
}

/**
 * Helper to compute the current running balance of a cash box.
 */
export function computeCurrentBalance(events: CashEvent[]): Decimal {
  const sorted = [...events].sort(
    (a, b) => a.date.localeCompare(b.date) || a.rank - b.rank || a.serial - b.serial
  );
  let bal = new Decimal(0);
  for (const e of sorted) {
    bal = bal.plus(e.delta);
  }
  return bal;
}
