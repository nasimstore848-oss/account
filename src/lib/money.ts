import Decimal from 'decimal.js';

export function toDecimal(val: string | number | Decimal): Decimal {
  if (val instanceof Decimal) return val;
  return new Decimal(val || 0);
}

export function formatMoney(amount: string | number | Decimal, currency = 'YER'): string {
  const dec = toDecimal(amount);
  const formatted = dec.toNumber().toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${currency}`;
}

export function formatNumber(amount: string | number | Decimal): string {
  const dec = toDecimal(amount);
  return dec.toNumber().toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
