'use client';

import { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Eye,
  X,
  FileCode,
  ArrowRightLeft,
  Calendar,
  User,
  Activity,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';
import { AuditLogRow } from '@/server/services/audit.service';

interface AuditPageClientProps {
  initialLogs: AuditLogRow[];
}

export function AuditPageClient({ initialLogs }: AuditPageClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [selectedEntity, setSelectedEntity] = useState<string>('ALL');
  const [activeLog, setActiveLog] = useState<AuditLogRow | null>(null);
  const [copied, setCopied] = useState(false);

  // Statistics calculation
  const stats = useMemo(() => {
    return {
      total: initialLogs.length,
      creates: initialLogs.filter((l) => l.action === 'CREATE').length,
      updates: initialLogs.filter((l) => l.action === 'UPDATE').length,
      voids: initialLogs.filter((l) => l.action === 'VOID').length,
    };
  }, [initialLogs]);

  // Filtering
  const filteredLogs = useMemo(() => {
    return initialLogs.filter((log) => {
      const matchesSearch =
        searchTerm === '' ||
        log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entityId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.reason && log.reason.toLowerCase().includes(searchTerm.toLowerCase())) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entity.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesAction = selectedAction === 'ALL' || log.action === selectedAction;
      const matchesEntity = selectedEntity === 'ALL' || log.entity === selectedEntity;

      return matchesSearch && matchesAction && matchesEntity;
    });
  }, [initialLogs, searchTerm, selectedAction, selectedEntity]);

  const handleCopyJson = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            إنشاء
          </span>
        );
      case 'UPDATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            تعديل
          </span>
        );
      case 'VOID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            إلغاء
          </span>
        );
      case 'LOGIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            تسجيل دخول
          </span>
        );
      case 'ACCOUNT_CREATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            فتح حساب
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
            {action}
          </span>
        );
    }
  };

  const getEntityLabel = (entity: string) => {
    switch (entity) {
      case 'Voucher':
        return 'سند مالي (Voucher)';
      case 'JournalEntry':
        return 'قيد يومية (Journal)';
      case 'Account':
        return 'حساب مالي (Account)';
      case 'User':
        return 'مستخدم (User)';
      default:
        return entity;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-900 to-indigo-950 text-white flex items-center justify-center shadow-md">
              <ShieldCheck className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">سجل العمليات والتدقيق</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                متابعة حركة الإدخال والتعديل والإلغاء لضمان دقة العمليات المحاسبية.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              أحدث {initialLogs.length} سجل مدقق
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block mb-0.5 font-medium">إجمالي الحركات</span>
            <span className="text-lg font-black font-mono text-slate-900">{stats.total}</span>
          </div>
          <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100">
            <span className="text-emerald-700 block mb-0.5 font-medium">عمليات الإنشاء</span>
            <span className="text-lg font-black font-mono text-emerald-700">{stats.creates}</span>
          </div>
          <div className="bg-amber-50/60 p-3 rounded-2xl border border-amber-100">
            <span className="text-amber-700 block mb-0.5 font-medium">عمليات التعديل</span>
            <span className="text-lg font-black font-mono text-amber-700">{stats.updates}</span>
          </div>
          <div className="bg-rose-50/60 p-3 rounded-2xl border border-rose-100">
            <span className="text-rose-700 block mb-0.5 font-medium">عمليات الإلغاء</span>
            <span className="text-lg font-black font-mono text-rose-700">{stats.voids}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
          {/* Search Input */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 absolute inset-y-0 start-3 my-auto text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="بحث باسم المستخدم، رقم العملية، السبب، أو المعرف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs ps-9 pe-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-slate-900 focus:outline-none transition-colors"
            />
          </div>

          {/* Action Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-slate-900 focus:outline-none transition-colors font-medium text-slate-700"
            >
              <option value="ALL">جميع الإجراءات (All Actions)</option>
              <option value="CREATE">إنشاء (CREATE)</option>
              <option value="UPDATE">تعديل (UPDATE)</option>
              <option value="VOID">إلغاء (VOID)</option>
              <option value="LOGIN">تسجيل دخول (LOGIN)</option>
              <option value="ACCOUNT_CREATE">فتح حساب (ACCOUNT_CREATE)</option>
            </select>
          </div>

          {/* Entity Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-slate-900 focus:outline-none transition-colors font-medium text-slate-700"
            >
              <option value="ALL">جميع الكيانات (All Entities)</option>
              <option value="Voucher">السندات (Vouchers)</option>
              <option value="JournalEntry">القيود اليومية (Journals)</option>
              <option value="Account">الحسابات (Accounts)</option>
              <option value="User">المستخدمين (Users)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-bold">
              <tr>
                <th className="py-3.5 px-4 text-start">التاريخ والوقت</th>
                <th className="py-3.5 px-4 text-start">المستخدم المنفذ</th>
                <th className="py-3.5 px-4 text-start">نوع الإجراء</th>
                <th className="py-3.5 px-4 text-start">الكيان / المستند</th>
                <th className="py-3.5 px-4 text-start">السبب / البيان</th>
                <th className="py-3.5 px-4 text-center">التفاصيل والتغييرات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                    <span>لا توجد سجلات تدقيق مطابقة لمعايير البحث الحالية</span>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const dateStr = log.at ? new Date(log.at).toLocaleString('ar-EG') : '—';
                  const hasDetails = log.before || log.after;

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Date & Time */}
                      <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {dateStr}
                      </td>

                      {/* User */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 block">{log.userName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{log.userId}</span>
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>

                      {/* Entity */}
                      <td className="py-3 px-4">
                        <div>
                          <span className="font-bold text-slate-800 block text-[11px]">
                            {getEntityLabel(log.entity)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {log.entityId}
                          </span>
                        </div>
                      </td>

                      {/* Reason */}
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                        {log.reason ? (
                          <span>{log.reason}</span>
                        ) : (
                          <span className="text-slate-400 italic">بدون ملاحظة إضافية</span>
                        )}
                      </td>

                      {/* Inspection Action */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setActiveLog(log)}
                          className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>فحص التفاصيل</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspection Modal */}
      {activeLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900">
                      فحص سجل التغيير: {activeLog.id}
                    </h3>
                    {getActionBadge(activeLog.action)}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    الكيان: <b>{getEntityLabel(activeLog.entity)}</b> | المعرف:{' '}
                    <span className="font-mono">{activeLog.entityId}</span> | المستخدم:{' '}
                    <b>{activeLog.userName}</b>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveLog(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Reason Card */}
              {activeLog.reason && (
                <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl text-xs text-blue-900">
                  <span className="font-bold block mb-1">سبب أو بيان الإجراء:</span>
                  <p>{activeLog.reason}</p>
                </div>
              )}

              {/* Before vs After Visual Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* State Before */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                      <span>الحالة السابقة (Before)</span>
                    </span>
                    {activeLog.before && (
                      <button
                        type="button"
                        onClick={() => handleCopyJson(activeLog.before)}
                        className="text-[10px] text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>نسخ JSON</span>
                      </button>
                    )}
                  </div>
                  <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 font-mono text-[11px] overflow-x-auto max-h-72 border border-slate-800" dir="ltr">
                    {activeLog.before ? (
                      <pre className="whitespace-pre-wrap">{JSON.stringify(activeLog.before, null, 2)}</pre>
                    ) : (
                      <span className="text-slate-500 italic">null (لا توجد حالة سابقة - عملية إنشاء جديدة)</span>
                    )}
                  </div>
                </div>

                {/* State After */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      <span>الحالة اللاحقة (After)</span>
                    </span>
                    {activeLog.after && (
                      <button
                        type="button"
                        onClick={() => handleCopyJson(activeLog.after)}
                        className="text-[10px] text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600">تم النسخ</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>نسخ JSON</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 font-mono text-[11px] overflow-x-auto max-h-72 border border-slate-800" dir="ltr">
                    {activeLog.after ? (
                      <pre className="whitespace-pre-wrap">{JSON.stringify(activeLog.after, null, 2)}</pre>
                    ) : (
                      <span className="text-slate-500 italic">null (تم حذف أو إبطال الكيان)</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50 text-xs">
              <span className="text-slate-400 font-mono">ID: {activeLog.id}</span>
              <button
                type="button"
                onClick={() => setActiveLog(null)}
                className="py-2 px-5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl transition-all cursor-pointer"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
