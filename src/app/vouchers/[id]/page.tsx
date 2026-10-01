import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Printer,
  Calendar,
  Building,
  User,
  DollarSign,
  Sparkles,
  ShieldCheck,
  AlertOctagon,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { getCurrentUser } from '@/lib/auth';
import { getCashBoxes, getPostableAccounts } from '@/server/repositories/account.repo';
import { getVoucherById } from '@/server/services/voucher.service';
import { tafqeet } from '@/adapters/print/tafqeet';
import { pool } from '@/db';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VoucherDetailPage({ params }: PageProps) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  const cashBoxes = await getCashBoxes();
  const postableAccounts = await getPostableAccounts();

  const voucher = await getVoucherById(id);
  if (!voucher) {
    notFound();
  }

  // Fetch lines for this voucher
  const client = await pool.connect();
  let lines: any[] = [];
  try {
    const linesRes = await client.query(
      `
      SELECT l.id, l."lineNo", l."accountId", a.code as "accountCode", a."nameAr" as "accountName",
             l.debit::text, l.credit::text, l.memo
        FROM "VoucherLine" l
        JOIN "Account" a ON a.id = l."accountId"
       WHERE l."voucherId" = $1
       ORDER BY l."lineNo" ASC
      `,
      [id]
    );
    lines = linesRes.rows;
  } finally {
    client.release();
  }

  const isReceipt = voucher.type === 'RECEIPT';
  const isVoid = voucher.status === 'VOID';
  const words = tafqeet(voucher.amount, voucher.currency);

  return (
    <AppShell
      currentUser={currentUser}
      cashBoxes={cashBoxes}
      postableAccounts={postableAccounts}
    >
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Back Link & Actions */}
        <div className="flex items-center justify-between">
          <Link
            href={isReceipt ? '/vouchers/receipts' : '/vouchers/payments'}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>العودة إلى قائمة السندات</span>
          </Link>

          <button
            type="button"
            onClick={() => {}} // Will be triggered by direct print button or link
            className="hidden"
          />
          <a
            href={`/print/voucher/${voucher.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة السند الرسمي (A5 / A4)</span>
          </a>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {/* Header */}
          <div
            className={`p-6 text-white flex items-center justify-between ${
              isReceipt
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700'
                : 'bg-gradient-to-r from-rose-600 to-red-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                {isReceipt ? <ArrowDownLeft className="w-6 h-6 text-white" /> : <ArrowUpRight className="w-6 h-6 text-white" />}
              </div>
              <div>
                <span className="text-xs text-white/80 font-mono block">
                  رقم السند: {voucher.serial} / السنة المالية: {voucher.fiscalYear}
                </span>
                <h1 className="text-xl font-black">
                  {isReceipt ? 'سند قبض نقدي' : 'سند صرف نقدي'}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  isVoid
                    ? 'bg-white text-rose-700'
                    : 'bg-white/20 text-white backdrop-blur-md'
                }`}
              >
                {isVoid ? 'سند ملغي' : 'سند معتمد'}
              </span>
            </div>
          </div>

          {/* Void notice if void */}
          {isVoid && (
            <div className="bg-rose-50 border-b border-rose-100 p-4 flex items-start gap-3 text-xs text-rose-800">
              <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-sm">تم إلغاء هذا السند رسمياً</span>
                <p>تاريخ الإلغاء: {voucher.voidedAt}</p>
                {voucher.voidReason && <p className="font-semibold mt-1">سبب الإلغاء: {voucher.voidReason}</p>}
              </div>
            </div>
          )}

          {/* Body */}
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <span className="text-slate-400 block mb-1">الطرف المقابل:</span>
                <span className="font-bold text-slate-900 text-sm">{voucher.counterpartyAccountName}</span>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <span className="text-slate-400 block mb-1">الصندوق النقدي:</span>
                <span className="font-bold text-slate-900 text-sm">{voucher.cashAccountName}</span>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <span className="text-slate-400 block mb-1">تاريخ إصدار السند:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{voucher.voucherDate}</span>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <span className="text-slate-400 block mb-1">المحاسب المنشئ:</span>
                <span className="font-bold text-slate-900 text-sm">{voucher.createdByName}</span>
              </div>
            </div>

            {/* Amount & Tafqeet */}
            <div className="bg-blue-50/50 border border-blue-200/80 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900">المبلغ الإجمالي للسند</span>
                <div className="text-2xl font-black font-mono text-blue-950" dir="ltr">
                  {Number(voucher.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {voucher.currency}
                </div>
              </div>

              <div className="pt-2 border-t border-blue-200/60 flex items-start gap-2 text-xs">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block text-[11px]">المبلغ كتابةً:</span>
                  <span className="font-bold text-blue-950 text-sm leading-relaxed">{words}</span>
                </div>
              </div>
            </div>

            {voucher.description && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
                <span className="text-slate-400 block mb-1">البيان والشرح:</span>
                <p className="font-medium text-slate-800">{voucher.description}</p>
              </div>
            )}

            {/* Double Entry Lines */}
            <div>
              <h3 className="text-xs font-bold text-slate-700 mb-2">تفاصيل القيد المحاسبي للسند</h3>
              <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                <table className="w-full text-start">
                  <thead className="bg-slate-100 text-slate-600 font-bold">
                    <tr>
                      <th className="py-2.5 px-3 text-start">#</th>
                      <th className="py-2.5 px-3 text-start">الحساب</th>
                      <th className="py-2.5 px-3 text-end">مدين (+)</th>
                      <th className="py-2.5 px-3 text-end">دائن (-)</th>
                      <th className="py-2.5 px-3 text-start">البيان</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lines.map((l) => (
                      <tr key={l.id}>
                        <td className="py-2.5 px-3 font-mono text-slate-400">{l.lineNo}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {l.accountCode} - {l.accountName}
                        </td>
                        <td className="py-2.5 px-3 text-end font-mono font-bold text-emerald-700" dir="ltr">
                          {Number(l.debit) > 0 ? Number(l.debit).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-end font-mono font-bold text-blue-700" dir="ltr">
                          {Number(l.credit) > 0 ? Number(l.credit).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{l.memo || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
