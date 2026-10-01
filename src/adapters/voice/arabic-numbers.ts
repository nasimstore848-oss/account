const UNITS: Record<string, number> = {
  صفر: 0,
  واحد: 1,
  احد: 1,
  اثنين: 2,
  اثنان: 2,
  ثلاثه: 3,
  ثلاث: 3,
  اربعه: 4,
  اربع: 4,
  خمسه: 5,
  خمس: 5,
  سته: 6,
  ست: 6,
  سبعه: 7,
  سبع: 7,
  ثمانيه: 8,
  ثمان: 8,
  تسعه: 9,
  تسع: 9,
  عشره: 10,
  عشر: 10,
  احدعشر: 11,
  اثنعشر: 12,
  اثناعشر: 12,
};

const TENS: Record<string, number> = {
  عشرين: 20,
  عشرون: 20,
  ثلاثين: 30,
  ثلاثون: 30,
  اربعين: 40,
  اربعون: 40,
  خمسين: 50,
  خمسون: 50,
  ستين: 60,
  ستون: 60,
  سبعين: 70,
  سبعون: 70,
  ثمانين: 80,
  ثمانون: 80,
  تسعين: 90,
  تسعون: 90,
};

const HUNDREDS: Record<string, number> = {
  مايه: 100,
  مئه: 100,
  مائه: 100,
  ميتين: 200,
  مئتين: 200,
  مئتان: 200,
  ثلاثمايه: 300,
  ثلاثميه: 300,
  ثلاثمائه: 300,
  ثلاثمئه: 300,
  اربعمايه: 400,
  اربعميه: 400,
  اربعمائه: 400,
  اربعمئه: 400,
  خمسمايه: 500,
  خمسميه: 500,
  خمسمائه: 500,
  خمسمئه: 500,
  ستمايه: 600,
  ستميه: 600,
  ستمائه: 600,
  ستمئه: 600,
  سبعمايه: 700,
  سبعميه: 700,
  سبعمائه: 700,
  سبعمئه: 700,
  ثمانمايه: 800,
  ثمانميه: 800,
  ثمانمائه: 800,
  ثمانمئه: 800,
  تسعمايه: 900,
  تسعميه: 900,
  تسعمائه: 900,
  تسعمئه: 900,
};

const SCALES: Record<string, number> = {
  الف: 1e3,
  الاف: 1e3,
  الفين: 2e3,
  مليون: 1e6,
  مليونين: 2e6,
  ملايين: 1e6,
  مليار: 1e9,
  مليارين: 2e9,
};

import { normalize } from './normalize';

export function parseSpokenNumber(text: string): number | null {
  if (!text) return null;

  const clean = normalize(text);

  // If already pure digits (or digits with decimal)
  if (/^\d+(\.\d+)?$/.test(clean)) {
    return Number(clean);
  }

  // Handle hybrid cases like "500 الف" or "25 الف" or "1.5 مليون"
  const hybridMatch = clean.match(/^(\d+(?:\.\d+)?)\s*(الف|الاف|الفين|مليون|ملايين|مليار)$/);
  if (hybridMatch) {
    const num = Number(hybridMatch[1]);
    const scaleWord = hybridMatch[2];
    const multiplier = SCALES[scaleWord] ?? 1000;
    return num * multiplier;
  }

  const tokens = clean.split(' ').map((t) => t.replace(/^و(?=\S{3,})/, '')); // strip conjunction و
  let total = 0;
  let current = 0;
  let seen = false;

  for (const t of tokens) {
    if (/^\d+(\.\d+)?$/.test(t)) {
      current += Number(t);
      seen = true;
    } else if (t in UNITS) {
      current += UNITS[t];
      seen = true;
    } else if (t in TENS) {
      current += TENS[t];
      seen = true;
    } else if (t in HUNDREDS) {
      current += HUNDREDS[t];
      seen = true;
    } else if (t in SCALES) {
      const s = SCALES[t];
      if (t === 'الفين') {
        total += (current || 1) * 2000;
        current = 0;
      } else if (t === 'مليونين') {
        total += (current || 1) * 2000000;
        current = 0;
      } else {
        total += (current || 1) * s;
        current = 0;
      }
      seen = true;
    } else if (seen && !['ريال', 'دولار', 'سعودي', 'يمني', 'ل', 'مقابل', 'عن'].includes(t)) {
      break;
    }
  }

  const v = total + current;
  return seen && v > 0 ? v : null;
}
