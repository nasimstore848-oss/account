'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Search,
  Filter,
  Printer,
  Eye,
  RotateCcw,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { VoucherDetails } from '@/server/services/voucher.service';
import { AccountRecord } from '@/server/repositories/account.repo';
import { VoucherFormModal } from './VoucherFormModal';
import { VoidVoucherModal } from './VoidVoucherModal';

interface VoucherListPageClientProps {
  type: 'RECEIPT' | 'PAYMENT';
  vouchers: VoucherDetails[];
  total: number;
  cashBoxes: AccountRecord[];
  postableAccounts: AccountRecord[];
  initialFilters: {
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  };
}

export function VoucherListPageClient({
  type,
  vouchers,
  total,
  cashBoxes,
  postableAccounts,
  initialFilters,
}: VoucherListPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isReceipt = type === 'RECEIPT';
  const title = isReceipt ? 'سندات القبض (Receipts)' : 'سندات الصرف (Payments)';
  const subtitle = isReceipt
    ? 'إدارة وأرشفة وطباعة سندات قبض النقدية وإثبات التحصيل'
    : 'إدارة وأرشفة وطباعة سندات صرف النقدية والمصروفات والدفعات';

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<VoucherDetails | null>(null);

  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [voucherToVoid, setVoucherToVoid] = useState<VoucherDetails | null>(null);

  const [search, setSearch] = useState(initialFilters.search || '');
  const [status, setStatus] = useState(initialFilters.status || 'ALL');
  const [startDate, setStartDate] = useState(initialFilters.startDate || '');
  const [endDate, setEndDate] = useState(initialFilters.endDate || '');

  const handleFilterApply = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status && status !== 'ALL') params.set('status', status);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    const basePath = isReceipt ? '/vouchers/receipts' : '/vouchers/payments';
    router.push(`${basePath}?${params.toString()}`);
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatus('ALL');
    setStartDate('');
    setEndDate('');
    const basePath = isReceipt ? '/vouchers/receipts' : '/vouchers/payments';
    router.push(basePath);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${
              isReceipt
                ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-md shadow-emerald-100'
                : 'bg-gradient-to-tr from-rose-600 to-red-500 shadow-md shadow-rose-100'
            }`}
          >
            {isReceipt ? <ArrowDownLeft className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">{title}</h1>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingVoucher(null);
            setFormModalOpen(true);
          }}
          className={`py-2.5 px-5 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-2 shadow-sm transition-all ${
            isReceipt
              ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
              : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>{isReceipt ? 'إنشاء سند قبض جديد' : 'إنشاء سند صرف جديد'}</span>
        </button>
      </div>

      {/* Filters Bar */}
      <form
        onSubmit={handleFilterApply}
        className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center gap-3"
      >
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="بحث برقم السند أو اسم الطرف المقابل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pr-9 pl-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="w-36">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
          >
            <option value="ALL">جميع الحالات</option>
            <option value="POSTED">معتمد فقط</option>
            <option value="VOID">ملغي فقط</option>
          </select>
        </div>

        <div className="flex items-center gap-1 text-xs">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="text-xs px-2.5 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white font-mono"
            title="من تاريخ"
          />
          <span className="text-slate-400">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="text-xs px-2.5 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white font-mono"
            title="إلى تاريخ"
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all"
        >
          تطبيق التصفية
        </button>

        {(search || (status && status !== 'ALL') || startDate || endDate) && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-3 py-2.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            إعادة تعيين
          </button>
        )}
      </form>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>إجمالي السندات: <b>{total}</b> سند</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-bold">
              <tr>
                <th className="py-3 px-4 text-start">الرقم التسلسلي</th>
                <th className="py-3 px-4 text-start">التاريخ</th>
                <th className="py-3 px-4 text-start">الطرف المقابل / المستفيد</th>
                <th className="py-3 px-4 text-start">الصندوق النقدي</th>
                <th className="py-3 px-4 text-start">البيان</th>
                <th className="py-3 px-4 text-end">المبلغ</th>
                <th className="py-3 px-4 text-center">الحالة</th>
                <th className="py-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vouchers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    لا توجد سندات مطابقة لشروط البحث
                  </td>
                </tr>
              ) : (
                vouchers.map((v) => {
                  const isVoid = v.status === 'VOID';
                  return (
                    <tr
                      key={v.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isVoid ? 'opacity-60 bg-slate-50/50' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {v.serial} / {v.fiscalYear}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{v.voucherDate}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {v.counterpartyAccountName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{v.cashAccountName}</td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                        {v.description || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-end font-mono font-bold text-slate-900" dir="ltr">
                        {Number(v.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {v.currency}
                      </td>
                      <td className="py-3.5 px-4 text-center">
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
                      <td className="py-3.5 px-4 text-center">
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
                            title="عرض التفاصيل"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          {!isVoid && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingVoucher(v);
                                  setFormModalOpen(true);
                                }}
                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="تعديل السند"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setVoucherToVoid(v);
                                  setVoidModalOpen(true);
                                }}
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
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingVoucher(null);
        }}
        cashBoxes={cashBoxes}
        postableAccounts={postableAccounts}
        initialType={type}
        editingVoucher={editingVoucher}
      />

      {/* Void Modal */}
      <VoidVoucherModal
        voucher={voucherToVoid}
        isOpen={voidModalOpen}
        onClose={() => {
          setVoidModalOpen(false);
          setVoucherToVoid(null);
        }}
      />
    </div>
  );
}
