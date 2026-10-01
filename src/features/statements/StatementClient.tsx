'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  Building,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Download,
} from 'lucide-react';
import { AccountRecord } from '@/server/repositories/account.repo';
import { AccountStatementResult } from '@/server/services/statement.service';

interface StatementClientProps {
  statement: AccountStatementResult;
  accounts: AccountRecord[];
}

export function StatementClient({ statement, accounts }: StatementClientProps) {
  const router = useRouter();
  const [selectedAccId, setSelectedAccId] = useState(statement.account.id);
  const [startDate, setStartDate] = useState(statement.startDate);
  const [endDate, setEndDate] = useState(statement.endDate);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/statements/${selectedAccId}?startDate=${startDate}&endDate=${endDate}`);
  };

  const handlePrint = () => {
    window.open(
      `/print/statement/${selectedAccId}?startDate=${startDate}&endDate=${endDate}`,
      '_blank'
    );
  };

  const formatBalType = (t: string) => {
    if (t === 'DEBIT') return '(مدين)';
    if (t === 'CREDIT') return '(دائن)';
    return '(متزن)';
  };

  const handleExportCSV = () => {
    const escapeCsv = (val: string | number | null | undefined) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const lines: string[] = [
      `"كشف حساب تفصيلي: ${statement.account.nameAr.replace(/"/g, '""')}"`,
      `"رقم الحساب",${escapeCsv(statement.account.code)},"العملة",${escapeCsv(statement.account.currency)},"نوع الحساب",${escapeCsv(statement.account.type)}`,
      `"الفترة الزمنية من",${escapeCsv(startDate)},"إلى",${escapeCsv(endDate)}`,
      `"رصيد أول المدة",${escapeCsv(statement.openingBalance)},${escapeCsv(formatBalType(statement.openingBalanceType))}`,
      '',
      ['التاريخ', 'الرقم', 'نوع المستند', 'البيان والتفاصيل', 'مدين (+)', 'دائن (-)', 'الرصيد التراكمي'].map(escapeCsv).join(','),
      [escapeCsv(statement.startDate), '—', 'رصيد افتتاحي', 'رصيد ما قبل تاريخ البداية', '0.00', '0.00', escapeCsv(statement.openingBalance)].join(','),
    ];

    statement.movements.forEach((m) => {
      lines.push([
        escapeCsv(m.date),
        escapeCsv(m.serial),
        escapeCsv(m.doc),
        escapeCsv(m.memo || '—'),
        escapeCsv(m.debit),
        escapeCsv(m.credit),
        escapeCsv(m.balance),
      ].join(','));
    });

    lines.push('');
    lines.push(['"إجمالي الحركات المدينة"', escapeCsv(statement.totalDebit), '', '', '', '', ''].join(','));
    lines.push(['"إجمالي الحركات الدائنة"', escapeCsv(statement.totalCredit), '', '', '', '', ''].join(','));
    lines.push(['"رصيد نهاية المدة"', escapeCsv(statement.closingBalance), escapeCsv(formatBalType(statement.closingBalanceType)), '', '', '', ''].join(','));

    // استخدام UTF-8 BOM (\uFEFF) لدعم اللغة العربية في برنامج Microsoft Excel تلقائياً
    const csvString = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `كشف_حساب_${statement.account.code}_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-700 to-teal-800 text-white flex items-center justify-center shadow-md">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">
                كشف حساب تفصيلي: {statement.account.nameAr}
              </h1>
              <p className="text-xs text-slate-500">
                رقم الحساب: <span className="font-mono font-bold">{statement.account.code}</span> | العملة: {statement.account.currency} | النوع: {statement.account.type}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>تصدير Excel / CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة كشف الحساب (A4)</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <form
          onSubmit={handleFilter}
          className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs"
        >
          <div>
            <label className="block text-slate-500 font-bold mb-1">اختر الحساب</label>
            <select
              value={selectedAccId}
              onChange={(e) => setSelectedAccId(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:bg-white"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} - {a.nameAr} ({a.currency})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-bold mb-1">من تاريخ</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:bg-white font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-bold mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:bg-white font-mono"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl transition-all cursor-pointer"
            >
              تحديث الكشف
            </button>
          </div>
        </form>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <span className="text-slate-400 block mb-1">رصيد أول المدة</span>
          <div className="text-base font-bold font-mono text-slate-800" dir="ltr">
            {Number(statement.openingBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500 font-semibold">
            {formatBalType(statement.openingBalanceType)}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <span className="text-emerald-600 font-semibold block mb-1">إجمالي الحركات المدينة (+)</span>
          <div className="text-base font-bold font-mono text-emerald-700" dir="ltr">
            {Number(statement.totalDebit).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400">{statement.account.currency}</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <span className="text-rose-600 font-semibold block mb-1">إجمالي الحركات الدائنة (-)</span>
          <div className="text-base font-bold font-mono text-rose-700" dir="ltr">
            {Number(statement.totalCredit).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400">{statement.account.currency}</span>
        </div>

        <div className="bg-gradient-to-br from-blue-900 to-indigo-900 text-white rounded-2xl p-4 shadow-sm">
          <span className="text-blue-200 block mb-1">رصيد نهاية المدة</span>
          <div className="text-lg font-black font-mono" dir="ltr">
            {Number(statement.closingBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-blue-200 font-bold">
            {formatBalType(statement.closingBalanceType)} {statement.account.currency}
          </span>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-bold">
              <tr>
                <th className="py-3 px-4 text-start">التاريخ</th>
                <th className="py-3 px-4 text-start">الرقم</th>
                <th className="py-3 px-4 text-start">نوع المستند</th>
                <th className="py-3 px-4 text-start">البيان</th>
                <th className="py-3 px-4 text-end">مدين (+)</th>
                <th className="py-3 px-4 text-end">دائن (-)</th>
                <th className="py-3 px-4 text-end">الرصيد التراكمي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Opening balance row */}
              <tr className="bg-slate-50/70 font-semibold">
                <td className="py-3 px-4 font-mono">{statement.startDate}</td>
                <td className="py-3 px-4">—</td>
                <td className="py-3 px-4">رصيد افتتاحي</td>
                <td className="py-3 px-4 text-slate-500">رصيد ما قبل تاريخ البداية</td>
                <td className="py-3 px-4 text-end">—</td>
                <td className="py-3 px-4 text-end">—</td>
                <td className="py-3 px-4 text-end font-mono font-bold text-slate-900" dir="ltr">
                  {Number(statement.openingBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>

              {statement.movements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    لا توجد حركات مسجلة خلال الفترة المحددة
                  </td>
                </tr>
              ) : (
                statement.movements.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-600">{m.date}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{m.serial}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {m.doc}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{m.memo || '—'}</td>
                    <td className="py-3 px-4 text-end font-mono font-bold text-emerald-700" dir="ltr">
                      {Number(m.debit) > 0
                        ? Number(m.debit).toLocaleString('en-US', { minimumFractionDigits: 2 })
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-end font-mono font-bold text-rose-700" dir="ltr">
                      {Number(m.credit) > 0
                        ? Number(m.credit).toLocaleString('en-US', { minimumFractionDigits: 2 })
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-end font-mono font-bold text-slate-900" dir="ltr">
                      {Number(m.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold border-t border-slate-200">
                <td colSpan={4} className="py-3 px-4 text-center">الإجماليات:</td>
                <td className="py-3 px-4 text-end font-mono text-emerald-700" dir="ltr">
                  {Number(statement.totalDebit).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-4 text-end font-mono text-rose-700" dir="ltr">
                  {Number(statement.totalCredit).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-4 text-end font-mono text-blue-900 font-black text-sm" dir="ltr">
                  {Number(statement.closingBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
