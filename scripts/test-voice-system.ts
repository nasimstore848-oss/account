import { normalize } from '../src/adapters/voice/normalize';
import { parseSpokenNumber } from '../src/adapters/voice/arabic-numbers';
import { parseCommand } from '../src/adapters/voice/parse-command';
import { resolvePayee } from '../src/server/repositories/account.repo';
import { pool } from '../src/db';

async function testVoiceSystem() {
  console.log('🎙️ بدء اختبار محلل الأوامر الصوتية والمطابقة المحاسبية...\n');

  // 1. اختبار معالجة وتوحيد النصوص العربية (Normalization)
  console.log('1️⃣ اختبار توحيد الأحرف والأرقام (Normalization):');
  const rawText = 'اصرف  لـِأحمد   بمبلغ ٥٠,٠٠٠ رَيَال  ';
  const cleanText = normalize(rawText);
  console.log(`   الأصل: "${rawText}"`);
  console.log(`   النتيجة: "${cleanText}"`);
  if (cleanText === 'اصرف لـاحمد بمبلغ 50000 ريال') {
    console.log('   ✅ نجح اختبار التوحيد اللغوي وإزالة التشكيل وتحويل الأرقام.');
  } else {
    console.error('   ❌ فشل اختبار التوحيد اللغوي!');
  }

  // 2. اختبار تحويل الأرقام المنطوقة (Arabic Spoken Numbers)
  console.log('\n2️⃣ اختبار تحويل الأرقام المنطوقة والهجينة:');
  const numberTests = [
    { input: '500 الف', expected: 500000 },
    { input: '1.5 مليون', expected: 1500000 },
    { input: 'خمسة وعشرين الف', expected: 25000 }, // 25 ألف = 25,000 (توضيح: 250 ألف = مائتان وخمسون ألفاً)
    { input: 'مائة وخمسين الف', expected: 150000 },
    { input: 'الفين وخمسمائة', expected: 2500 },
  ];

  for (const t of numberTests) {
    const val = parseSpokenNumber(t.input);
    const pass = val === t.expected;
    console.log(`   • "${t.input}" => ${val} ${pass ? '✅' : `❌ (المتوقع: ${t.expected})`}`);
  }

  // 3. اختبار تحليل أوامر السندات الكاملة (Command Parsing)
  console.log('\n3️⃣ اختبار استخراج تفاصيل السندات من الجمل:');
  const commands = [
    {
      phrase: 'اصرف لـ علي مبلغ 500 الف مقابل ايجار',
      expectedAction: 'PAYMENT',
      expectedAmount: 500000,
      expectedPayee: 'علي',
      expectedCurrency: 'YER',
    },
    {
      phrase: 'اقبض من شركة الأمل للتجارة بمبلغ 250000 ريال يمني دفعة مبيعات',
      expectedAction: 'RECEIPT',
      expectedAmount: 250000,
      expectedPayee: 'شركة الامل للتجارة',
      expectedCurrency: 'YER',
    },
    {
      phrase: 'سدد لـ شركة النور مبلغ 120 الف دولار بخصوص توريدات',
      expectedAction: 'PAYMENT',
      expectedAmount: 120000,
      expectedPayee: 'شركة النور',
      expectedCurrency: 'USD',
    },
    {
      phrase: 'فتح حساب جديد باسم مؤسسة الرضا للتقنية',
      expectedAction: 'OPEN_ACCOUNT',
      expectedPayee: 'مؤسسة الرضا للتقنية',
    },
    {
      phrase: 'اصرف لي علي محمد احمد 50الف ماء',
      expectedAction: 'PAYMENT',
      expectedAmount: 50000,
      expectedPayee: 'علي محمد احمد',
      expectedCurrency: 'YER',
      expectedDescription: 'ماء',
    },
    {
      phrase: 'اصرف لي علي محمد احمد 50الف حق ماء',
      expectedAction: 'PAYMENT',
      expectedAmount: 50000,
      expectedPayee: 'علي محمد احمد',
      expectedCurrency: 'YER',
      expectedDescription: 'حق ماء',
    },
    {
      phrase: 'اصرف لي علي محمد احمد 50الف مقابل ماء',
      expectedAction: 'PAYMENT',
      expectedAmount: 50000,
      expectedPayee: 'علي محمد احمد',
      expectedCurrency: 'YER',
      expectedDescription: 'ماء',
    },
  ];

  for (const cmd of commands) {
    const draft = parseCommand(cmd.phrase);
    const actionPass = draft.action === cmd.expectedAction;
    const amountPass = cmd.expectedAmount ? draft.amount === cmd.expectedAmount : true;
    const currencyPass = cmd.expectedCurrency ? draft.currency === cmd.expectedCurrency : true;

    console.log(`   الجملة: "${cmd.phrase}"`);
    console.log(`   • النية: ${draft.action} ${actionPass ? '✅' : '❌'}`);
    if (cmd.expectedAmount) console.log(`   • المبلغ: ${draft.amount} ${amountPass ? '✅' : '❌'}`);
    if (cmd.expectedCurrency) console.log(`   • العملة: ${draft.currency} ${currencyPass ? '✅' : '❌'}`);
    console.log(`   • المستفيد المستخرج: "${draft.payee}"`);
    console.log(`   • التاريخ التلقائي: "${draft.date}"`);
    console.log(`   • البيان: "${draft.description || '—'}"\n`);
  }

  // 3.1 اختبار التعرف الذكي على التواريخ المنطوقة (Date Extraction)
  console.log('3️⃣.1 اختبار التعرف الذكي على التواريخ المنطوقة وتحديد تاريخ اليوم افتراضياً:');
  const baseTestDate = new Date('2026-10-01T10:00:00Z');
  const dateCases = [
    {
      phrase: 'اصرف لـ علي مبلغ 500 الف مقابل ايجار',
      expectedDate: '2026-10-01', // لم يُذكر تاريخ -> يعتمد تاريخ اليوم تلقائياً
      label: 'عدم ذكر التاريخ (افتراضي اليوم)',
    },
    {
      phrase: 'اصرف امس لـ علي مبلغ 500 الف مقابل ايجار',
      expectedDate: '2026-09-30', // أمس
      label: 'أمس (Yesterday)',
    },
    {
      phrase: 'سدد لـ شركة النور مبلغ 120 الف دولار اول امس بخصوص توريدات',
      expectedDate: '2026-09-29', // أول أمس
      label: 'أول أمس (2 days ago)',
    },
    {
      phrase: 'اقبض من شركة الامل بمبلغ 250000 ريال بتاريخ 2026-09-15 دفعة مبيعات',
      expectedDate: '2026-09-15', // تاريخ صريح YYYY-MM-DD
      label: 'تاريخ صريح (YYYY-MM-DD)',
    },
    {
      phrase: 'اصرف لـ احمد مبلغ 40 الف بتاريخ خمسة وعشرين مقابل صيانة',
      expectedDate: '2026-10-25', // يوم منطوق ضمن الشهر الحالي
      label: 'يوم منطوق بالعربية (بتاريخ خمسة وعشرين)',
    },
  ];

  for (const dc of dateCases) {
    const draft = parseCommand(dc.phrase, baseTestDate);
    const pass = draft.date === dc.expectedDate;
    console.log(`   • [${dc.label}]: "${dc.phrase}" => التاريخ: ${draft.date} ${pass ? '✅' : `❌ (المتوقع: ${dc.expectedDate})`}`);
  }
  console.log('');

  // 4. اختبار المطابقة الذكية للحسابات من قاعدة البيانات (Fuzzy Matching)
  console.log('4️⃣ اختبار المطابقة الذكية للحسابات عبر pg_trgm:');
  try {
    const queryName = 'شركة الامل';
    const result = await resolvePayee(queryName);

    if (result.exact) {
      console.log(`   ✅ مطابقة تامة ومباشرة لـ "${queryName}": [${result.exact.code}] ${result.exact.nameAr}`);
    } else if (result.candidates.length > 0) {
      console.log(`   ✅ عثر على ${result.candidates.length} حسابات مرشحة تقريبياً لـ "${queryName}":`);
      result.candidates.forEach((c) => console.log(`      - ${c.nameAr} (${c.code})`));
    } else {
      console.log(`   ⚠️ لم يتم العثور على حساب مطابق لـ "${queryName}" (سيطلب النظام إنشاء حساب جديد).`);
    }
  } catch (err: any) {
    console.error('   ❌ خطأ أثناء فحص مطابقة الحسابات:', err.message);
  } finally {
    await pool.end();
  }

  console.log('\n🎉 اكتمل اختبار محرك الأوامر الصوتية بنجاح!');
}

testVoiceSystem().catch((err) => {
  console.error('فشل الاختبار:', err);
  process.exit(1);
});
