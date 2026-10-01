'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Plus,
  Search,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { JournalFormModal } from './JournalFormModal';
import { AccountRecord } from '@/server/repositories/account.repo';
import { voidJournalAction } from '@/server/actions/journal.actions';

interface JournalPageClientProps {
  entries: any[];
  postableAccounts: AccountRecord[];
  initialFilters: { search?: string; startDate?: string; endDate?: string };
}

export function JournalPageClient({
  entries,
  postableAccounts,
  initialFilters,
}: JournalPageClientProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedLines, setExpandedLines] = useState<Record<string, any[]>>({});
  const [loadingLines, setLoadingLines] = useState<string | null>(null);

  const [search, setSearch] = useState(initialFilters.search || '');
  const [startDate, setStartDate] = useState(initialFilters.startDate || '');
  const [endDate, setEndDate] = useState(initialFilters.endDate || '');

  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidLoading, setVoidLoading] = useState(false);
  const [voidError, setVoidError] = useState<string | null>(null);

  const handleToggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(id);
    if (!expandedLines[id]) {
      setLoadingLines(id);
      try {
        const res = await fetch(`/api/journal/${id}`);
        if (res.ok) {
          const data = await res.json();
          setExpandedLines((prev) => ({ ...prev, [id]: data.lines || [] }));
        }
      } catch {
      } finally {
        setLoadingLines(null);
      }
    }
  };

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    router.push(`/journal?${params.toString()}`);
  };

  const handleVoidSubmit = async (id: string) => {
    if (!voidReason.trim()) {
      setVoidError('يرجى كتابة سبب الإلغاء');
      return;
    }

    setVoidLoading(true);
    setVoidError(null);
    try {
      const res = await voidJournalAction({ id, reason: voidReason });
      if (res.ok) {
        setVoidingId(null);
        setVoidReason('');
        router.refresh();
      } else {
        setVoidError(res.error || 'تعذر إلغاء القيد');
      }
    } catch (e: any) {
      setVoidError(e?.message || 'حدث خطأ غير متوقع');
    } finally {
      setVoidLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-900 to-indigo-900 text-white flex items-center justify-center shadow-md">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">دفتر اليومية العامة (General Journal)</h1>
            <p className="text-xs text-slate-500">
              تسجيل ومراجعة القيود المحاسبية المركبة والتسويات الدورية
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>إنشاء قيد يومية جديد</span>
        </button>
      </div>

      {/* Filter Bar */}
      <form
        onSubmit={handleFilter}
        className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center gap-3"
      >
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="بحث برقم القيد أو الشرح..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pr-9 pl-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1 text-xs">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="text-xs px-2.5 py-2 border border-slate-200 rounded-xl bg-slate-50 font-mono"
            title="من تاريخ"
          />
          <span className="text-slate-400">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="text-xs px-2.5 py-2 border border-slate-200 rounded-xl bg-slate-50 font-mono"
            title="إلى تاريخ"
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl"
        >
          تطبيق البحث
        </button>
      </form>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>إجمالي القيود: <b>{entries.length}</b> قيد</span>
          <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            جميع القيود متزنة بموجب Trigger قاعدة البيانات
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {entries.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              لا توجد قيود يومية مسجلة
            </div>
          ) : (
            entries.map((entry) => {
              const isVoid = entry.status === 'VOID';
              const isExpanded = expandedId === entry.id;
              const lines = expandedLines[entry.id] || [];

              return (
                <div key={entry.id} className={isVoid ? 'bg-slate-50/60 opacity-70' : ''}>
                  <div
                    onClick={() => handleToggleExpand(entry.id)}
                    className="p-4 hover:bg-slate-50/80 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="p-1 rounded-lg text-slate-400 hover:bg-slate-200"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            قيد #{entry.serial} / {entry.fiscalYear}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {entry.kind}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isVoid ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isVoid ? 'ملغي' : 'معتمد'}
                          </span>
                        </div>
                        <p className="text-slate-500 mt-0.5 font-medium">
                          {entry.description || 'بدون شرح عام'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 justify-between md:justify-end">
                      <div className="text-start md:text-end">
                        <span className="text-[11px] text-slate-400 block font-mono">
                          {entry.entryDate}
                        </span>
                        <span className="text-xs font-bold font-mono text-slate-900" dir="ltr">
                          {Number(entry.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })} YER
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isVoid && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setVoidingId(entry.id);
                              setVoidReason('');
                              setVoidError(null);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="إلغاء القيد"
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Lines */}
                  {isExpanded && (
                    <div className="px-6 pb-4 pt-1 bg-slate-50 border-t border-slate-100">
                      <span className="text-[11px] font-bold text-slate-600 block mb-2">
                        تفاصيل أسطر القيد المحاسبي:
                      </span>

                      {loadingLines === entry.id ? (
                        <div className="py-4 text-center text-xs text-slate-400">جارٍ تحميل الأسطر...</div>
                      ) : (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden text-xs">
                          <table className="w-full text-start">
                            <thead className="bg-slate-100 text-slate-600 font-bold">
                              <tr>
                                <th className="py-2 px-3 text-start">#</th>
                                <th className="py-2 px-3 text-start">الحساب</th>
                                <th className="py-2 px-3 text-end">مدين (+)</th>
                                <th className="py-2 px-3 text-end">دائن (-)</th>
                                <th className="py-2 px-3 text-start">بيان السطر</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {lines.map((l: any) => (
                                <tr key={l.id}>
                                  <td className="py-2 px-3 font-mono text-slate-400">{l.lineNo}</td>
                                  <td className="py-2 px-3 font-semibold text-slate-800">
                                    {l.accountCode} - {l.accountName}
                                  </td>
                                  <td className="py-2 px-3 text-end font-mono font-bold text-emerald-700" dir="ltr">
                                    {Number(l.debit) > 0 ? Number(l.debit).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}
                                  </td>
                                  <td className="py-2 px-3 text-end font-mono font-bold text-blue-700" dir="ltr">
                                    {Number(l.credit) > 0 ? Number(l.credit).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}
                                  </td>
                                  <td className="py-2 px-3 text-slate-500">{l.memo || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal for new Journal */}
      <JournalFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        accounts={postableAccounts}
      />

      {/* Void Dialog */}
      {voidingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setVoidingId(null)}
            title="اضغط للخروج"
          />
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 z-10" dir="rtl">
            <h3 className="font-bold text-slate-900 text-base mb-2">إلغاء قيد اليومية</h3>
            <p className="text-xs text-slate-500 mb-4">
              سيتم وسم القيد كـ ملغي وإلغاء أثره المحاسبي في كشوفات الحسابات.
            </p>

            {voidError && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl mb-3">
                {voidError}
              </div>
            )}

            <textarea
              rows={3}
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="سبب الإلغاء..."
              className="w-full text-xs border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white mb-4"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setVoidingId(null)}
                className="flex-1 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-all"
              >
                تراجع (إغلاق)
              </button>
              <button
                type="button"
                disabled={voidLoading}
                onClick={() => handleVoidSubmit(voidingId)}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                {voidLoading ? 'جارٍ الإلغاء...' : 'تأكيد الإلغاء'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
