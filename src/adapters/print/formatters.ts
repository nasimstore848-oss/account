export function formatDateAr(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '—';
  return d.toISOString().slice(0, 10);
}

export function formatDateTimeAr(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '—';
  return `${d.toISOString().slice(0, 10)} ${d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;
}

export function currencyNameAr(currency = 'YER'): string {
  switch (currency) {
    case 'YER':
      return 'ريال يمني';
    case 'SAR':
      return 'ريال سعودي';
    case 'USD':
      return 'دولار أمريكي';
    default:
      return currency;
  }
}
