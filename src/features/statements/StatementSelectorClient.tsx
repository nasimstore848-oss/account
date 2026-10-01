'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileSpreadsheet,
  Calendar,
  Printer,
  Search,
  ArrowRight,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { AccountRecord } from '@/server/repositories/account.repo';

interface StatementSelectorClientProps {
  accounts: AccountRecord[];
}

export function StatementSelectorClient({ accounts }: StatementSelectorClientProps) {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`);

  const filteredAccounts = accounts.filter(
    (acc) =>
      acc.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.code.includes(searchTerm)
  );

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  const setPreset = (preset: 'year' | 'month' | 'today') => {
    if (preset === 'year') {
      setStartDate(`${currentYear}-01-01`);
      setEndDate(`${currentYear}-12-31`);
    } else if (preset === 'month') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    }
  };

  const handleView = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) return;
    router.push(`/statements/${selectedAccountId}?startDate=${startDate}&endDate=${endDate}`);
  };

  const handleDirectPrint = () => {
    if (!selectedAccountId) return;
    window.open(
      `/print/statement/${selectedAccountId}?startDate=${startDate}&endDate=${endDate}`,
      '_blank'
    );
  };

  return (
    <form onSubmit={handleView} className="space-y-6">
      {/* Account Selection */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-700">
          اختر الحساب المحاسبي
        </label>
        
        {/* Search input if accounts list is long */}
        <div className="relative mb-2">
          <Search className="w-4 h-4 absolute inset-y-0 start-3 my-auto text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="بحث برقم الحساب أو الاسم العربي..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs ps-9 pe-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-slate-900 focus:outline-none transition-colors"
          />
        </div>

        <select
          value={selectedAccountId}
          onChange={(e) => setSelectedAccountId(e.target.value)}
          className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white text-xs font-semibold focus:border-slate-900 focus:outline-none transition-colors"
          size={filteredAccounts.length > 5 ? 5 : Math.max(3, filteredAccounts.length)}
        >
          {filteredAccounts.map((a) => (
            <option key={a.id} value={a.id} className="p-2 border-b border-slate-100 last:border-0">
              {a.code} — {a.nameAr} ({a.currency}) {a.isCashBox ? '⭐ صندوق نقدي' : ''}
            </option>
          ))}
          {filteredAccounts.length === 0 && (
            <option disabled className="p-2 text-slate-400">
              لا توجد حسابات مطابقة لمعايير البحث
            </option>
          )}
        </select>

        {selectedAccount && (
          <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>الحساب المحدد: <b>{selectedAccount.nameAr}</b> (رمز: {selectedAccount.code} | نوع: {selectedAccount.type} | عملة: {selectedAccount.currency})</span>
          </div>
        )}
      </div>

      {/* Date Range Selection */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>الفترة الزمنية للتقرير</span>
          </label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPreset('today')}
              className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
            >
              اليوم
            </button>
            <button
              type="button"
              onClick={() => setPreset('month')}
              className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
            >
              الشهر الحالي
            </button>
            <button
              type="button"
              onClick={() => setPreset('year')}
              className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
            >
              السنة المالية ({currentYear})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">من تاريخ</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:bg-white text-xs font-mono focus:border-slate-900 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:bg-white text-xs font-mono focus:border-slate-900 focus:outline-none"
              required
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
        <button
          type="submit"
          disabled={!selectedAccountId}
          className="w-full sm:flex-1 py-3 px-5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>استعراض كشف الحساب التفصيلي</span>
        </button>

        <button
          type="button"
          onClick={handleDirectPrint}
          disabled={!selectedAccountId}
          className="w-full sm:w-auto py-3 px-5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
        >
          <Printer className="w-4 h-4 text-slate-500" />
          <span>طباعة فورية (A4)</span>
        </button>
      </div>
    </form>
  );
}
