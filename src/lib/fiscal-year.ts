export function fiscalYearOf(dateInput: string | Date): number {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) {
    return new Date().getFullYear();
  }
  return d.getFullYear();
}
