'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  Printer,
  ShieldCheck,
  Plus,
  Eye,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { VoucherDetails } from '@/server/services/voucher.service';
import { AccountRecord } from '@/server/repositories/account.repo';
import { VoucherFormModal } from '@/features/vouchers/components/VoucherFormModal';
import { VoidVoucherModal } from '@/features/vouchers/components/VoidVoucherModal';
import { JournalFormModal } from '@/features/journal/components/JournalFormModal';
import { useVoiceStore } from '@/features/voice/voice.store';
import { GlossySilverCard } from '@/components/ui/GlossySilverCard';

interface DashboardClientProps {
  cashBalances: Array<{ id: string; code: string; nameAr: string; currency: string; balance: string }>;
  recentVouchers: VoucherDetails[];
  cashBoxes: AccountRecord[];
  postableAccounts: AccountRecord[];
  metrics: {
    totalReceipts: string;
    totalPayments: string;
    receiptsCount: number;
    paymentsCount: number;
    journalsCount: number;
  };
}

export function DashboardClient({
  cashBalances,
  recentVouchers,
  cashBoxes,
  postableAccounts,
  metrics,
}: DashboardClientProps) {
  const { openModal: openVoiceModal } = useVoiceStore();

  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [voucherType, setVoucherType] = useState<'RECEIPT' | 'PAYMENT'>('PAYMENT');
  const [editingVoucher, setEditingVoucher] = useState<VoucherDetails | null>(null);

  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [voucherToVoid, setVoucherToVoid] = useState<VoucherDetails | null>(null);

  const [journalModalOpen, setJournalModalOpen] = useState(false);

  const handleOpenVoucher = (type: 'RECEIPT' | 'PAYMENT') => {
    setEditingVoucher(null);
    setVoucherType(type);
    setVoucherModalOpen(true);
  };

  const handleEditVoucher = (v: VoucherDetails) => {
    setEditingVoucher(v);
    setVoucherModalOpen(true);
  };

  const handleVoidVoucher = (v: VoucherDetails) => {
    setVoucherToVoid(v);
    setVoidModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Quick Actions */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center md:text-start">
          <h1 className="text-2xl font-black">لوحة التحكم المالية</h1>
          <p className="text-xs text-blue-100 max-w-xl">
            متابعة حركة الصناديق النقدية، وإصدار سندات القبض والصرف، وقيود اليومية العامة.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => handleOpenVoucher('RECEIPT')}
            className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>سند قبض جديد</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenVoucher('PAYMENT')}
            className="py-2.5 px-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>سند صرف جديد</span>
          </button>
          <button
            type="button"
            onClick={() => setJournalModalOpen(true)}
            className="py-2.5 px-4 bg-white/15 hover:bg-white/25 text-white rounded-2xl text-xs font-bold flex items-center gap-2 backdrop-blur-md transition-all"
          >
            <BookOpen className="w-4 h-4" />
            <span>قيد يومية جديد</span>
          </button>
          <button
            type="button"
            onClick={openVoiceModal}
            className="py-2.5 px-4 bg-amber-400 hover:bg-amber-500 text-amber-950 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>أمر صوتي</span>
          </button>
        </div>
      </div>

      {/* Cash Box Cards (Live Balances) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800">أرصدة الصناديق النقدية</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cashBalances.map((box) => (
            <GlossySilverCard
              key={box.id}
              title={box.nameAr}
              value={Number(box.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              currency={box.currency}
              href={`/statements/${box.id}`}
              statusLabel="نشط"
            />
          ))}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-medium block">إجمالي المقبوضات (المعتمدة)</span>
            <span className="text-base font-bold font-mono text-slate-900" dir="ltr">
              {Number(metrics.totalReceipts).toLocaleString('en-US', { minimumFractionDigits: 2 })} YER
            </span>
            <span className="text-[10px] text-emerald-600 font-bold block">{metrics.receiptsCount} سند قبض</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-medium block">إجمالي المصروفات (المعتمدة)</span>
            <span className="text-base font-bold font-mono text-slate-900" dir="ltr">
              {Number(metrics.totalPayments).toLocaleString('en-US', { minimumFractionDigits: 2 })} YER
            </span>
            <span className="text-[10px] text-rose-600 font-bold block">{metrics.paymentsCount} سند صرف</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-medium block">قيود اليومية العامة المعتمدة</span>
            <span className="text-base font-bold font-mono text-slate-900">
              {metrics.journalsCount} قيد محاسبي
            </span>
            <span className="text-[10px] text-blue-600 font-bold block">قيود معتمدة</span>
          </div>
        </div>
      </div>

      {/* Recent Vouchers Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">أحدث سندات القبض والصرف</h3>
            <p className="text-xs text-slate-500">متابعة السندات الصادرة وحالتها وخيارات الطباعة الفورية</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/vouchers/receipts"
              className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition-colors"
            >
              عرض المقبوضات
            </Link>
            <Link
              href="/vouchers/payments"
              className="text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl transition-colors"
            >
              عرض المصروفات
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-bold">
              <tr>
                <th className="py-3 px-4 text-start">الرقم / السنة</th>
                <th className="py-3 px-4 text-start">النوع</th>
                <th className="py-3 px-4 text-start">التاريخ</th>
                <th className="py-3 px-4 text-start">الطرف المقابل / المستفيد</th>
                <th className="py-3 px-4 text-start">الصندوق</th>
                <th className="py-3 px-4 text-end">المبلغ</th>
                <th className="py-3 px-4 text-center">الحالة</th>
                <th className="py-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentVouchers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    لا توجد سندات مسجلة حتى الآن
                  </td>
                </tr>
              ) : (
                recentVouchers.map((v) => {
                  const isReceipt = v.type === 'RECEIPT';
                  const isVoid = v.status === 'VOID';

                  return (
                    <tr key={v.id} className={`hover:bg-slate-50/80 transition-colors ${isVoid ? 'opacity-60 bg-slate-50/50' : ''}`}>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {v.serial} / {v.fiscalYear}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isReceipt
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isReceipt ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {isReceipt ? 'قبض' : 'صرف'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{v.voucherDate}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {v.counterpartyAccountName}
                        {v.description && (
                          <span className="block text-[11px] text-slate-400 font-normal truncate max-w-xs">
                            {v.description}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{v.cashAccountName}</td>
                      <td className="py-3 px-4 text-end font-mono font-bold text-slate-900" dir="ltr">
                        {Number(v.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {v.currency}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isVoid
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isVoid ? 'ملغي' : 'معتمد'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => window.open(`/print/voucher/${v.id}`, '_blank')}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="طباعة السند"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <Link
                            href={`/vouchers/${v.id}`}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="تفاصيل السند"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          {!isVoid && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleEditVoucher(v)}
                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="تعديل السند"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleVoidVoucher(v)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="إلغاء السند (Void)"
                              >
                                <AlertTriangle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Voucher Form Modal */}
      <VoucherFormModal
        isOpen={voucherModalOpen}
        onClose={() => {
          setVoucherModalOpen(false);
          setEditingVoucher(null);
        }}
        cashBoxes={cashBoxes}
        postableAccounts={postableAccounts}
        initialType={voucherType}
        editingVoucher={editingVoucher}
      />

      {/* Void Voucher Modal */}
      <VoidVoucherModal
        voucher={voucherToVoid}
        isOpen={voidModalOpen}
        onClose={() => {
          setVoidModalOpen(false);
          setVoucherToVoid(null);
        }}
      />

      {/* Journal Entry Modal */}
      <JournalFormModal
        isOpen={journalModalOpen}
        onClose={() => setJournalModalOpen(false)}
        accounts={postableAccounts}
      />
    </div>
  );
}
