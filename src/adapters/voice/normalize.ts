const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function normalize(s: string): string {
  if (!s) return '';
  return s
    .replace(/[\u064B-\u065F\u0670]/g, '') // tashkeel
    .replace(/(?<!ل)\u0640+/g, '') // tatweel (except when attached to preposition لـ)
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/[,،]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
