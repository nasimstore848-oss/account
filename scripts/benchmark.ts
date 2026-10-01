import { performance } from 'perf_hooks';
import { pool } from '../src/db';
import { createVoucher } from '../src/server/services/voucher.service';
import { createJournalEntry } from '../src/server/services/journal.service';

interface MetricResult {
  operation: string;
  totalRuns: number;
  avgTimeMs: number;
  minTimeMs: number;
  maxTimeMs: number;
  p95TimeMs: number;
  opsPerSec: number;
}

function calculateMetrics(name: string, times: number[]): MetricResult {
  times.sort((a, b) => a - b);
  const total = times.reduce((acc, t) => acc + t, 0);
  const avg = total / times.length;
  const p95Index = Math.floor(times.length * 0.95);

  return {
    operation: name,
    totalRuns: times.length,
    avgTimeMs: Number(avg.toFixed(2)),
    minTimeMs: Number(times[0].toFixed(2)),
    maxTimeMs: Number(times[times.length - 1].toFixed(2)),
    p95TimeMs: Number(times[p95Index].toFixed(2)),
    opsPerSec: Number((1000 / avg).toFixed(1)),
  };
}

async function benchmark() {
  console.log('⚡ بدء اختبار سرعة حفظ العمليات المالية (Benchmarking)...\n');
  const adminId = 'usr_admin_1';
  const cashBoxId = 'acc_cash_yer';
  const customerId = 'acc_cust_1';
  const supplierId = 'acc_supp_1';
  const today = new Date().toISOString().slice(0, 10);

  // 1. اختبار الحفظ الفردي لسندات القبض (50 عملية متتالية)
  console.log('⏳ جاري فحص سرعة حفظ 50 سند قبض متتالي (Sequential Receipts)...');
  const receiptTimes: number[] = [];

  for (let i = 0; i < 50; i++) {
    const t0 = performance.now();
    await createVoucher(
      {
        type: 'RECEIPT',
        date: today,
        amount: '15000.00',
        currency: 'YER',
        cashAccountId: cashBoxId,
        counterpartyAccountId: customerId,
        description: `سند اختبار سرعة رقم ${i + 1}`,
      },
      adminId
    );
    const t1 = performance.now();
    receiptTimes.push(t1 - t0);
  }

  // 2. اختبار الحفظ الفردي لسندات الصرف (50 عملية متتالية)
  console.log('⏳ جاري فحص سرعة حفظ 50 سند صرف متتالي مع محاكاة الرصيد (Sequential Payments)...');
  const paymentTimes: number[] = [];

  for (let i = 0; i < 50; i++) {
    const t0 = performance.now();
    await createVoucher(
      {
        type: 'PAYMENT',
        date: today,
        amount: '5000.00',
        currency: 'YER',
        cashAccountId: cashBoxId,
        counterpartyAccountId: supplierId,
        description: `سند صرف اختبار سرعة رقم ${i + 1}`,
      },
      adminId
    );
    const t1 = performance.now();
    paymentTimes.push(t1 - t0);
  }

  // 3. اختبار قيود اليومية المركبة مع تفعيل Database Trigger (30 قيد)
  console.log('⏳ جاري فحص سرعة حفظ 30 قيد يومية متزن مع فحص التريجر (Journal Entries)...');
  const journalTimes: number[] = [];

  for (let i = 0; i < 30; i++) {
    const t0 = performance.now();
    await createJournalEntry(
      {
        kind: 'GENERAL',
        date: today,
        description: `قيد اختبار أداء رقم ${i + 1}`,
        lines: [
          { accountId: 'acc_exp_rent', debit: '12000.00', credit: '0.00', memo: 'مصروف إيجار' },
          { accountId: 'acc_bank_1', debit: '0.00', credit: '12000.00', memo: 'خصم من البنك' },
        ],
      },
      adminId
    );
    const t1 = performance.now();
    journalTimes.push(t1 - t0);
  }

  // 4. اختبار التزامن والتسلسل (Concurrency / Lock Contention)
  console.log('⏳ جاري فحص سرعة 10 عمليات حفظ متزامنة في نفس اللحظة (Concurrent Saves)...');
  const tConcurrentStart = performance.now();
  await Promise.all(
    Array.from({ length: 10 }).map((_, idx) =>
      createVoucher(
        {
          type: 'RECEIPT',
          date: today,
          amount: '2000.00',
          currency: 'YER',
          cashAccountId: cashBoxId,
          counterpartyAccountId: customerId,
          description: `سند متزامن ${idx + 1}`,
        },
        adminId
      )
    )
  );
  const concurrentTotalTime = performance.now() - tConcurrentStart;

  // عرض النتائج في جدول
  const rReceipt = calculateMetrics('سند قبض (Voucher Receipt)', receiptTimes);
  const rPayment = calculateMetrics('سند صرف (Voucher Payment)', paymentTimes);
  const rJournal = calculateMetrics('قيد يومية (Journal Entry)', journalTimes);

  console.log('\n📊 نتائج تقرير سرعة الأداء (Performance Benchmark Results):');
  console.table([rReceipt, rPayment, rJournal]);

  console.log(`⏱️ إجمالي زمن 10 عمليات متزامنة مع القفل التسلسلي: ${concurrentTotalTime.toFixed(2)} ms`);
  console.log(`⚡ متوسط زمن المعاملة الواحدة أثناء التزامن: ${(concurrentTotalTime / 10).toFixed(2)} ms\n`);

  await pool.end();
}

benchmark().catch((err) => {
  console.error('❌ خطأ أثناء تنفيذ الفحص:', err);
  process.exit(1);
});
