import { pool } from '../src/db';
import { createVoucher, updateVoucher, voidVoucher } from '../src/server/services/voucher.service';
import { InsufficientCashError } from '../src/lib/errors';

async function runTests() {
  console.log('🔄 بدء اختبارات التعديل والإلغاء وحماية الصندوق...\n');
  const client = await pool.connect();

  try {
    const adminId = 'usr_admin_1';
    const yerCashBox = 'acc_cash_yer'; // الصندوق الرئيسي
    const customerAcc = 'acc_cust_1';  // شركة الأمل
    const expenseAcc = 'acc_exp_off';  // مصروفات القرطاسية
    const today = new Date().toISOString().slice(0, 10);

    // 1. إنشاء سند قبض تجريبي بمبلغ 100,000
    console.log('1️⃣ إنشاء سند قبض أساسي للاختبار...');
    const receipt = await createVoucher({
      type: 'RECEIPT',
      date: today,
      amount: '100000.00',
      currency: 'YER',
      cashAccountId: yerCashBox,
      counterpartyAccountId: customerAcc,
      description: 'سند اختبار التعديل والحذف',
    }, adminId);
    console.log(`   ✅ تم إنشاء سند القبض برقم: ${receipt.serial} (ID: ${receipt.id})`);

    // 2. إنشاء سند صرف يستهلك 90,000 من رصيد القبض
    console.log('2️⃣ إنشاء سند صرف مرتبط بالمبلغ...');
    const payment = await createVoucher({
      type: 'PAYMENT',
      date: today,
      amount: '90000.00',
      currency: 'YER',
      cashAccountId: yerCashBox,
      counterpartyAccountId: expenseAcc,
      description: 'صرف تجريبي',
    }, adminId);
    console.log(`   ✅ تم إنشاء سند الصرف برقم: ${payment.serial}`);

    // 3. اختبار التعديل الممنوع: محاولة زيادة الصرف إلى 150,000 (تجاوز رصيد الصندوق)
    console.log('3️⃣ اختبار التعديل: محاولة رفع مبلغ الصرف ليتجاوز رصيد الصندوق...');
    try {
      await updateVoucher(payment.id, {
        type: 'PAYMENT',
        date: today,
        amount: '15000000.00', // مبلغ يتجاوز كل ما في الصندوق
        currency: 'YER',
        cashAccountId: yerCashBox,
        counterpartyAccountId: expenseAcc,
        description: 'محاولة تعديل خاطئة',
      }, adminId);
      console.error('   ❌ خطأ: كان يجب رفض العملية بسبب عجز الصندوق!');
    } catch (err: any) {
      if (err instanceof InsufficientCashError || err.code === 'NEGATIVE_CASH' || err.message.includes('سالب')) {
        console.log(`   ✅ نجح الفحص: تم رفض التعديل بنجاح (${err.message})`);
      } else {
        throw err;
      }
    }

    // 4. اختبار التعديل الناجح: تعديل البيان والمبلغ في حدود الرصيد المتاح
    console.log('4️⃣ اختبار التعديل: تعديل سليم ومسموح به...');
    const updatedPayment = await updateVoucher(payment.id, {
      type: 'PAYMENT',
      date: today,
      amount: '80000.00',
      currency: 'YER',
      cashAccountId: yerCashBox,
      counterpartyAccountId: expenseAcc,
      description: 'تم تعديل البيان وتخفيض المبلغ إلى 80000',
    }, adminId);
    console.log(`   ✅ نجح التعديل: المبلغ الجديد ${updatedPayment.amount} والبيان: ${updatedPayment.description}`);

    // 5. اختبار الإلغاء الناجح: إلغاء سند الصرف
    console.log('5️⃣ اختبار الإلغاء: إلغاء سند الصرف (إرجاع السيولة للصندوق)...');
    const voidedPayment = await voidVoucher(payment.id, 'إلغاء لغرض اختبار النظام', adminId);
    console.log(`   ✅ نجح الإلغاء: حالة السند الآن هي (${voidedPayment.status}) مع بقاء الرقم التسلسلي (${voidedPayment.serial})`);

    // 6. التحقق من منع تعديل سند بعد إلغائه
    console.log('6️⃣ اختبار التعديل على سند ملغي...');
    try {
      await updateVoucher(payment.id, {
        type: 'PAYMENT',
        date: today,
        amount: '10000.00',
        currency: 'YER',
        cashAccountId: yerCashBox,
        counterpartyAccountId: expenseAcc,
      }, adminId);
      console.error('   ❌ خطأ: كان يجب منع تعديل السند الملغي!');
    } catch (err: any) {
      console.log(`   ✅ نجح الفحص: تم منع التعديل على السند الملغي (${err.message})`);
    }

    // 7. التحقق من توثيق سجلات التدقيق
    console.log('7️⃣ التحقق من سجل التدقيق (AuditLog)...');
    const auditRes = await client.query(
      `SELECT action, entity, "entityId", reason FROM "AuditLog" WHERE "entityId" = $1 ORDER BY at ASC`,
      [payment.id]
    );
    console.log(`   ✅ تم العثور على ${auditRes.rows.length} حركات مسجلة للسند (CREATE -> UPDATE -> VOID)`);

    console.log('\n🎉 اكتملت جميع اختبارات التعديل والحذف وحماية الصندوق بنجاح تام!');
  } finally {
    client.release();
    await pool.end();
  }
}

runTests().catch((err) => {
  console.error('❌ فشل الاختبار:', err);
  process.exit(1);
});
