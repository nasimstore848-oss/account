import { parseSpokenNumber } from './arabic-numbers';

export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface ExtractedDateResult {
  date?: string; // YYYY-MM-DD
  cleaned: string;
}

/**
 * استخراج التاريخ من النص الصوتي المنطوق بالعربية.
 * يدعم:
 * - الكلمات النسبية: "اليوم", "امس", "البارحة", "قبل امس", "اول امس"
 * - التواريخ الصريحة: "بتاريخ 2026-10-01", "بتاريخ 15/09/2026", "بتاريخ 25/9"
 * - الأيام ضمن الشهر: "بتاريخ 15 الشهر", "بتاريخ 20 من هذا الشهر"
 * - الأرقام المنطوقة للأيام: "بتاريخ خمسة وعشرين", "بتاريخ خمسة عشر"
 */
export function extractDate(text: string, baseDate = new Date()): ExtractedDateResult {
  let cleaned = text;

  // 1. قبل امس / اول امس (يومان إلى الوراء)
  const twoDaysAgoRe = /(?:^|\s)(قبل\s+امس|اول\s+امس)(?=\s|$)/;
  if (twoDaysAgoRe.test(cleaned)) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - 2);
    cleaned = cleaned.replace(twoDaysAgoRe, ' ').replace(/\s+/g, ' ').trim();
    return { date: formatDate(d), cleaned };
  }

  // 2. امس / البارحه (يوم إلى الوراء)
  const yesterdayRe = /(?:^|\s)(امس|البارحه)(?=\s|$)/;
  if (yesterdayRe.test(cleaned)) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - 1);
    cleaned = cleaned.replace(yesterdayRe, ' ').replace(/\s+/g, ' ').trim();
    return { date: formatDate(d), cleaned };
  }

  // 3. اليوم
  const todayRe = /(?:^|\s)اليوم(?=\s|$)/;
  if (todayRe.test(cleaned)) {
    cleaned = cleaned.replace(todayRe, ' ').replace(/\s+/g, ' ').trim();
    return { date: formatDate(baseDate), cleaned };
  }

  // 4. صيغة YYYY-MM-DD أو YYYY/MM/DD
  const isoRe = /(?:^|\s)بتاريخ\s+(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?=\s|$)/;
  const isoM = cleaned.match(isoRe);
  if (isoM) {
    const y = isoM[1];
    const m = isoM[2].padStart(2, '0');
    const d = isoM[3].padStart(2, '0');
    cleaned = cleaned.replace(isoRe, ' ').replace(/\s+/g, ' ').trim();
    return { date: `${y}-${m}-${d}`, cleaned };
  }

  // 5. صيغة DD-MM-YYYY أو DD/MM/YYYY
  const dmyRe = /(?:^|\s)بتاريخ\s+(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?=\s|$)/;
  const dmyM = cleaned.match(dmyRe);
  if (dmyM) {
    const d = dmyM[1].padStart(2, '0');
    const m = dmyM[2].padStart(2, '0');
    const y = dmyM[3];
    cleaned = cleaned.replace(dmyRe, ' ').replace(/\s+/g, ' ').trim();
    return { date: `${y}-${m}-${d}`, cleaned };
  }

  // 6. صيغة DD/MM (ضمن السنة الحالية)
  const dmRe = /(?:^|\s)بتاريخ\s+(\d{1,2})[-/](\d{1,2})(?=\s|$)/;
  const dmM = cleaned.match(dmRe);
  if (dmM) {
    const d = dmM[1].padStart(2, '0');
    const m = dmM[2].padStart(2, '0');
    const y = baseDate.getFullYear();
    cleaned = cleaned.replace(dmRe, ' ').replace(/\s+/g, ' ').trim();
    return { date: `${y}-${m}-${d}`, cleaned };
  }

  // 7. صيغة اليوم الرقمي: بتاريخ 15 أو بتاريخ 25 الشهر
  const dayRe = /(?:^|\s)بتاريخ\s+(\d{1,2})(?:\s*(?:من\s*)?(?:هذا\s*)?الشهر)?(?=\s|$)/;
  const dayM = cleaned.match(dayRe);
  if (dayM) {
    const d = Number(dayM[1]);
    if (d >= 1 && d <= 31) {
      const y = baseDate.getFullYear();
      const m = String(baseDate.getMonth() + 1).padStart(2, '0');
      cleaned = cleaned.replace(dayRe, ' ').replace(/\s+/g, ' ').trim();
      return { date: `${y}-${m}-${String(d).padStart(2, '0')}`, cleaned };
    }
  }

  // 8. صيغة اليوم المنطوق: بتاريخ خمسة وعشرين / بتاريخ عشره
  const spokenDayRe = /(?:^|\s)بتاريخ\s+([^\s]+(?:\s+[^\s]+)?)(?:\s*(?:من\s*)?(?:هذا\s*)?الشهر)?(?=\s|$)/;
  const spokenM = cleaned.match(spokenDayRe);
  if (spokenM) {
    const num = parseSpokenNumber(spokenM[1]);
    if (num && num >= 1 && num <= 31) {
      const y = baseDate.getFullYear();
      const m = String(baseDate.getMonth() + 1).padStart(2, '0');
      cleaned = cleaned.replace(spokenDayRe, ' ').replace(/\s+/g, ' ').trim();
      return { date: `${y}-${m}-${String(num).padStart(2, '0')}`, cleaned };
    }
  }

  return { date: undefined, cleaned };
}
