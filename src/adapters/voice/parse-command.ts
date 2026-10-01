import { normalize } from './normalize';
import { parseSpokenNumber } from './arabic-numbers';
import { extractDate, formatDate } from './parse-date';

export type VoiceDraft = {
  action: 'PAYMENT' | 'RECEIPT' | 'OPEN_ACCOUNT' | null;
  payee?: string;
  amount?: number;
  currency: 'YER' | 'SAR' | 'USD';
  description?: string;
  date?: string; // صيغة YYYY-MM-DD
  raw: string;
};

const ACTIONS: [RegExp, VoiceDraft['action']][] = [
  [/(?:^|\s)(اصرف|صرف|ادفع|سدد|سداد|دفع)(?:\s|$)/, 'PAYMENT'],
  [/(?:^|\s)(اقبض|قبض|استلم|استلمنا|استلمت|تحصيل|ايداع)(?:\s|$)/, 'RECEIPT'],
  [/(?:^|\s)(فتح حساب|افتح حساب|انشي حساب|انشئ حساب|حساب جديد)(?:\s|$)/, 'OPEN_ACCOUNT'],
];

const CURRENCIES: [RegExp, VoiceDraft['currency']][] = [
  [/(سعودي|ريال سعودي)/, 'SAR'],
  [/(دولار|دولار امريكي|دولارات)/, 'USD'],
  [/(يمني|ريال يمني)/, 'YER'],
];

export function parseCommand(transcript: string, baseDate = new Date()): VoiceDraft {
  let normalized = normalize(transcript);

  // 1. فصل الأرقام الملتصقة بالوحدات (مثل 50الف -> 50 الف)
  normalized = normalized.replace(/(\d+)(الف|الاف|الفين|مليون|ملايين|مليار)/g, '$1 $2');

  // 2. استخراج التاريخ (أمس، أول أمس، اليوم، بتاريخ...) واعتماد اليوم افتراضياً عند عدم الذكر
  const { date: extractedDate, cleaned: tAfterDate } = extractDate(normalized, baseDate);
  const date = extractedDate ?? formatDate(baseDate);

  let t = tAfterDate.replace(/\s+/g, ' ').trim();

  // 3. تحديد نوع العملية (Action)
  const action = ACTIONS.find(([re]) => re.test(t))?.[1] ?? null;

  // في حال فتح حساب جديد: معالجة سريعة لاسم الحساب
  if (action === 'OPEN_ACCOUNT') {
    const m = t.match(/حساب(?: جديد)?\s+(?:باسم\s+)?(.+)$/);
    const payee = m ? m[1].trim() : undefined;
    return {
      action,
      payee,
      currency: 'YER',
      date,
      raw: transcript,
    };
  }

  // 4. تحديد العملة (الافتراضي: YER)
  let currency: VoiceDraft['currency'] = 'YER';
  for (const [re, ccy] of CURRENCIES) {
    if (re.test(t)) {
      currency = ccy;
      break;
    }
  }

  // 5. استخراج البيان الذكي (Description):
  // يدعم الكلمات الدلالية: مقابل، حق، بخصوص، فاتورة، قيمة، حساب، عن، لأجل، بسبب، رسوم، دفعة، سلفة
  let description: string | undefined;
  let remaining = t;

  const descExplicitMatch = remaining.match(
    /(?:^|\s)(مقابل|حق|بخصوص|فاتوره|فاتورة|قيمه|قيمة|حساب|عن|لاجل|بسبب|رسوم|دفعه|دفعة|سلفه|سلفة)\s+(.+)$/
  );

  if (descExplicitMatch) {
    const kw = descExplicitMatch[1];
    const val = descExplicitMatch[2].trim();
    if (['مقابل', 'بخصوص', 'لاجل', 'بسبب', 'عن'].includes(kw)) {
      description = val;
    } else {
      description = `${kw} ${val}`;
    }
    remaining = remaining.slice(0, descExplicitMatch.index).trim();
  }

  // 6. استخراج المبلغ (Amount):
  // إما مسبوق بـ (مبلغ / بمبلغ / بقيمة / قدره) أو رقم مباشر (مثل: 50 الف، 250000)
  let amount: number | undefined;

  const amtPrefixMatch = remaining.match(/(?:بمبلغ|مبلغ|بقدر|قدره|بقيمه|بقيمة)\s+(.+)$/);
  if (amtPrefixMatch) {
    let amtPart = amtPrefixMatch[1]
      .replace(/(?:ريال(?: يمني| سعودي)?|دولار(?: امريكي)?)$/, '')
      .trim();

    amount = parseSpokenNumber(amtPart) ?? undefined;
    if (!amount) {
      const parts = amtPart.split(' ');
      for (let i = parts.length - 1; i >= 1; i--) {
        const testAmt = parts.slice(0, i).join(' ');
        const testDesc = parts.slice(i).join(' ');
        const parsed = parseSpokenNumber(testAmt);
        if (parsed) {
          amount = parsed;
          if (!description) description = testDesc;
          break;
        }
      }
    }
    remaining = remaining.slice(0, amtPrefixMatch.index).trim();
  } else {
    // المبلغ بدون كلمة "مبلغ" (مثل: اصرف لي علي محمد 50الف ماء)
    const directNumMatch = remaining.match(
      /(?:^|\s)(\d+(?:\.\d+)?\s*(?:الف|الاف|الفين|مليون|ملايين|مليار)?|\d+)(?:\s*(?:ريال(?: يمني| سعودي)?|دولار(?: امريكي)?))?(?:\s+(.+))?$/
    );

    if (directNumMatch) {
      const numStr = directNumMatch[1].trim();
      const trailing = directNumMatch[2]?.trim();
      amount = parseSpokenNumber(numStr) ?? undefined;
      if (trailing && !description) {
        description = trailing;
      }
      remaining = remaining.slice(0, directNumMatch.index).trim();
    } else {
      // فحص الأعداد المنطوقة مثل "خمسين الف"
      const tokens = remaining.split(' ');
      for (let i = 1; i < tokens.length; i++) {
        const possibleAmt = tokens.slice(i).join(' ');
        const parsed = parseSpokenNumber(possibleAmt);
        if (parsed) {
          amount = parsed;
          remaining = tokens.slice(0, i).join(' ');
          break;
        }
      }
    }
  }

  // 7. استخراج اسم المستفيد (Payee):
  // يدعم صيغ: (لـ، لي، ل، الى، لل) للصرف، و(من) للقبض
  let payee: string | undefined;
  if (action === 'RECEIPT') {
    const m = remaining.match(/(?:^|\s)من\s+(.+)$/);
    if (m) payee = m[1].replace(/^السيد\s+/, '').trim();
  } else if (action === 'PAYMENT') {
    const m = remaining.match(/(?:^|\s)(?:لـ|لي|ل|الى|لل)\s+(.+)$/);
    if (m) payee = m[1].replace(/^السيد\s+/, '').trim();
  }

  return {
    action,
    payee,
    amount,
    currency,
    description,
    date,
    raw: transcript,
  };
}
