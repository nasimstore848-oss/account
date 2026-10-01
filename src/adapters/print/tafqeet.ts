const ONES = [
  '',
  'واحد',
  'اثنان',
  'ثلاثة',
  'أربعة',
  'خمسة',
  'ستة',
  'سبعة',
  'ثمانية',
  'تسعة',
  'عشرة',
  'أحد عشر',
  'اثنا عشر',
  'ثلاثة عشر',
  'أربعة عشر',
  'خمسة عشر',
  'ستة عشر',
  'سبعة عشر',
  'ثمانية عشر',
  'تسعة عشر',
];

const TENS = [
  '',
  '',
  'عشرون',
  'ثلاثون',
  'أربعون',
  'خمسون',
  'ستون',
  'سبعون',
  'ثمانون',
  'تسعون',
];

const HUNDREDS = [
  '',
  'مائة',
  'مائتان',
  'ثلاثمائة',
  'أربعمائة',
  'خمسمائة',
  'ستمائة',
  'سبعمائة',
  'ثمانمائة',
  'تسعمائة',
];

function below1000(n: number): string {
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (h) parts.push(HUNDREDS[h]);
  if (r) {
    if (r < 20) {
      parts.push(ONES[r]);
    } else {
      const t = Math.floor(r / 10);
      const u = r % 10;
      parts.push(u ? `${ONES[u]} و${TENS[t]}` : TENS[t]);
    }
  }
  return parts.join(' و');
}

// [singular, dual, plural(3-10), accusative-singular(11+)]
const SCALES: [string, string, string, string][] = [
  ['', '', '', ''],
  ['ألف', 'ألفان', 'آلاف', 'ألفاً'],
  ['مليون', 'مليونان', 'ملايين', 'مليوناً'],
  ['مليار', 'ملياران', 'مليارات', 'ملياراً'],
];

function scaled(group: number, idx: number): string {
  if (!group) return '';
  const [one, two, few, many] = SCALES[idx];
  if (group === 1) return one;
  if (group === 2) return two;
  if (group <= 10) return `${below1000(group)} ${few}`;
  return `${below1000(group)} ${many}`;
}

export function integerToWords(n: number): string {
  if (n === 0) return 'صفر';
  const groups: number[] = [];
  let temp = n;
  while (temp > 0) {
    groups.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }
  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    if (!groups[i]) continue;
    parts.push(i === 0 ? below1000(groups[i]) : scaled(groups[i], i));
  }
  return parts.join(' و');
}

const CCY: Record<string, { major: [string, string, string, string]; minor: [string, string, string, string] }> = {
  YER: {
    major: ['ريال يمني', 'ريالان يمنيان', 'ريالات يمنية', 'ريالاً يمنياً'],
    minor: ['فلس', 'فلسان', 'فلوس', 'فلساً'],
  },
  SAR: {
    major: ['ريال سعودي', 'ريالان سعوديان', 'ريالات سعودية', 'ريالاً سعودياً'],
    minor: ['هللة', 'هللتان', 'هللات', 'هللة'],
  },
  USD: {
    major: ['دولار أمريكي', 'دولاران أمريكيان', 'دولارات أمريكية', 'دولاراً أمريكياً'],
    minor: ['سنت', 'سنتان', 'سنتات', 'سنتاً'],
  },
};

function withUnit(n: number, names: [string, string, string, string]): string {
  if (n === 1) return names[0];
  if (n === 2) return names[1];
  const words = integerToWords(n);
  return n >= 3 && n <= 10 ? `${words} ${names[2]}` : `${words} ${names[3]}`;
}

export function tafqeet(amount: string | number, currency = 'YER'): string {
  const str = String(amount || '0');
  const [i, f = '00'] = str.split('.');
  const major = Math.floor(Math.abs(Number(i) || 0));
  const minor = Number(f.padEnd(2, '0').slice(0, 2)) || 0;
  const c = CCY[currency] ?? CCY.YER;

  let majorText = '';
  if (major === 0 && minor === 0) {
    return `فقط صفر ${c.major[0]} لا غير`;
  }

  if (major > 0) {
    majorText =
      major === 1
        ? `ريال واحد ${c.major[0].split(' ').slice(1).join(' ')}`.trim()
        : major === 2
        ? c.major[1]
        : withUnit(major, c.major);
  }

  let minorText = '';
  if (minor > 0) {
    minorText = `${major > 0 ? ' و' : ''}${withUnit(minor, c.minor)}`;
  }

  return `فقط ${majorText}${minorText} لا غير`.trim();
}
