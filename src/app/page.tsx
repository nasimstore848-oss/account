import { AppShell } from '@/components/layout/AppShell';
import { DashboardClient } from '@/features/dashboard/DashboardClient';
import { getCurrentUser } from '@/lib/auth';
import { getCashBoxes, getPostableAccounts, AccountRecord } from '@/server/repositories/account.repo';
import { getCashBoxBalances, listVouchers } from '@/server/services/voucher.service';
import { pool } from '@/db';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const currentUser = await getCurrentUser();
  let cashBoxes: AccountRecord[] = [];
  let postableAccounts: AccountRecord[] = [];
  let cashBalances: any[] = [];
  let recentVouchers: any[] = [];
  let metrics = {
    totalReceipts: '0',
    totalPayments: '0',
    receiptsCount: 0,
    paymentsCount: 0,
    journalsCount: 0,
  };

  try {
    cashBoxes = await getCashBoxes();
    postableAccounts = await getPostableAccounts();
    cashBalances = await getCashBoxBalances();
    const res = await listVouchers({ limit: 10 });
    recentVouchers = res.rows;

    const client = await pool.connect();
    try {
      const rRes = await client.query(
        `SELECT COALESCE(SUM(amount), 0)::text as sum, COUNT(*)::int as count 
           FROM "Voucher" WHERE type = 'RECEIPT' AND status = 'POSTED'`
      );
      const pRes = await client.query(
        `SELECT COALESCE(SUM(amount), 0)::text as sum, COUNT(*)::int as count 
           FROM "Voucher" WHERE type = 'PAYMENT' AND status = 'POSTED'`
      );
      const jRes = await client.query(
        `SELECT COUNT(*)::int as count FROM "JournalEntry" WHERE status = 'POSTED'`
      );

      metrics = {
        totalReceipts: rRes.rows[0]?.sum || '0',
        totalPayments: pRes.rows[0]?.sum || '0',
        receiptsCount: rRes.rows[0]?.count || 0,
        paymentsCount: pRes.rows[0]?.count || 0,
        journalsCount: jRes.rows[0]?.count || 0,
      };
    } finally {
      client.release();
    }
  } catch (err: any) {
    // خطة الاستجابة التلقائية عند عدم تشغيل خادم PostgreSQL محلياً
    cashBoxes = [
      { id: 'acc_cash_yer', code: '110101', nameAr: 'الصندوق الرئيسي (ريال يمني)', type: 'ASSET', currency: 'YER', isCashBox: true, isPostable: true, isActive: true, parentId: 'acc_1101', createdAt: new Date() },
      { id: 'acc_cash_sar', code: '110102', nameAr: 'صندوق الريال السعودي', type: 'ASSET', currency: 'SAR', isCashBox: true, isPostable: true, isActive: true, parentId: 'acc_1101', createdAt: new Date() },
      { id: 'acc_cash_usd', code: '110103', nameAr: 'صندوق الدولار الأمريكي', type: 'ASSET', currency: 'USD', isCashBox: true, isPostable: true, isActive: true, parentId: 'acc_1101', createdAt: new Date() },
    ];
    postableAccounts = [
      ...cashBoxes,
      { id: 'acc_bank_1', code: '110201', nameAr: 'بنك التضامن الإسلامي', type: 'ASSET', currency: 'YER', isCashBox: false, isPostable: true, isActive: true, parentId: 'acc_1102', createdAt: new Date() },
      { id: 'acc_bank_2', code: '110202', nameAr: 'بنك الكريمي الإسلامي', type: 'ASSET', currency: 'YER', isCashBox: false, isPostable: true, isActive: true, parentId: 'acc_1102', createdAt: new Date() },
      { id: 'acc_cust_1', code: '110301', nameAr: 'شركة الأمل للتجارة العامة', type: 'ASSET', currency: 'YER', isCashBox: false, isPostable: true, isActive: true, parentId: 'acc_1103', createdAt: new Date() },
      { id: 'acc_cust_2', code: '110302', nameAr: 'مؤسسة البركة للخدمات', type: 'ASSET', currency: 'YER', isCashBox: false, isPostable: true, isActive: true, parentId: 'acc_1103', createdAt: new Date() },
      { id: 'acc_supp_1', code: '210101', nameAr: 'شركة النور للتوريدات', type: 'LIABILITY', currency: 'USD', isCashBox: false, isPostable: true, isActive: true, parentId: 'acc_2101', createdAt: new Date() },
      { id: 'acc_exp_off', code: '510101', nameAr: 'مصروفات القرطاسية والمكتب', type: 'EXPENSE', currency: 'YER', isCashBox: false, isPostable: true, isActive: true, parentId: 'acc_51', createdAt: new Date() },
    ];
    cashBalances = cashBoxes.map((b) => ({
      id: b.id,
      code: b.code,
      nameAr: b.nameAr,
      currency: b.currency,
      balance: '0.00',
    }));
  }

  return (
    <AppShell
      currentUser={currentUser}
      cashBoxes={cashBoxes}
      postableAccounts={postableAccounts}
    >
      <DashboardClient
        cashBalances={cashBalances}
        recentVouchers={recentVouchers}
        cashBoxes={cashBoxes}
        postableAccounts={postableAccounts}
        metrics={metrics}
      />
    </AppShell>
  );
}
