'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  FolderTree,
  Folder,
  FolderOpen,
  FileSpreadsheet,
  Plus,
  Wallet,
  ChevronRight,
  ChevronDown,
  Building,
  CheckCircle2,
  X,
  AlertCircle,
} from 'lucide-react';
import { AccountRecord } from '@/server/repositories/account.repo';
import { createAccountAction } from '@/server/actions/account.actions';

interface AccountsTreeClientProps {
  accounts: AccountRecord[];
}

export function AccountsTreeClient({ accounts }: AccountsTreeClientProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<string | null>(null);

  // Modal form states
  const [nameAr, setNameAr] = useState('');
  const [type, setType] = useState<any>('EXPENSE');
  const [currency, setCurrency] = useState('YER');
  const [parentId, setParentId] = useState<string | null>(null);
  const [isCashBox, setIsCashBox] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Expand/collapse state for categories
  const [expandedCodes, setExpandedCodes] = useState<Record<string, boolean>>({
    '1': true,
    '11': true,
    '1101': true,
    '1102': true,
    '1103': true,
    '2': true,
    '21': true,
    '2101': true,
    '3': true,
    '4': true,
    '5': true,
  });

  const toggleExpand = (code: string) => {
    setExpandedCodes((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const handleOpenCreateModal = (parent?: AccountRecord) => {
    if (parent) {
      setParentId(parent.id);
      setType(parent.type);
      setCurrency(parent.currency);
    } else {
      setParentId(null);
    }
    setNameAr('');
    setIsCashBox(false);
    setError(null);
    setModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim()) {
      setError('يرجى كتابة اسم الحساب');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await createAccountAction({
        nameAr: nameAr.trim(),
        type,
        currency,
        parentId,
        isCashBox,
      });

      if (res.ok) {
        setModalOpen(false);
        window.location.reload();
      } else {
        setError(res.error || 'تعذر إنشاء الحساب');
      }
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء الإنشاء');
    } finally {
      setLoading(false);
    }
  };

  // Build tree from flat accounts
  const accountMap = new Map<string, AccountRecord>();
  const childrenMap = new Map<string, AccountRecord[]>();

  accounts.forEach((acc) => {
    accountMap.set(acc.id, acc);
    const pId = acc.parentId || 'ROOT';
    if (!childrenMap.has(pId)) childrenMap.set(pId, []);
    childrenMap.get(pId)!.push(acc);
  });

  const renderNode = (acc: AccountRecord, depth = 0) => {
    const children = childrenMap.get(acc.id) || [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedCodes[acc.code] ?? false;

    return (
      <div key={acc.id} className="select-none">
        <div
          className={`flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-xs border border-transparent hover:border-slate-200/60 ${
            acc.isCashBox ? 'bg-amber-50/50' : ''
          }`}
          style={{ marginRight: `${depth * 20}px` }}
        >
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpand(acc.code)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <div className="w-6" />
            )}

            <span className="font-mono font-bold text-slate-400 text-[11px] w-14 shrink-0">
              {acc.code}
            </span>

            <span className={`font-semibold ${acc.isPostable ? 'text-slate-800' : 'text-blue-900 font-bold'}`}>
              {acc.nameAr}
            </span>

            {/* Badges */}
            {acc.isCashBox && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">
                <Wallet className="w-3 h-3 text-amber-600" />
                صندوق نقدي ({acc.currency})
              </span>
            )}

            {!acc.isPostable && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500 font-medium">
                رئيسي
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-400 font-bold">{acc.currency}</span>

            {acc.isPostable && (
              <Link
                href={`/statements/${acc.id}`}
                className="px-2 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-1 transition-colors"
                title="عرض كشف الحساب"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>كشف حساب</span>
              </Link>
            )}

            {!acc.isPostable && (
              <button
                type="button"
                onClick={() => handleOpenCreateModal(acc)}
                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="إضافة حساب فرعي تحته"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="border-r-2 border-slate-100 mr-3 my-0.5 space-y-0.5">
            {children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const rootAccounts = childrenMap.get('ROOT') || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-800 text-white flex items-center justify-center shadow-md">
            <FolderTree className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">دليل الحسابات الشجري (Chart of Accounts)</h1>
            <p className="text-xs text-slate-500">
              الهيكل المالي المتدرج للأصول والخصوم وحقوق الملكية والإيرادات والمصروفات
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleOpenCreateModal()}
          className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة حساب جديد</span>
        </button>
      </div>

      {/* Tree Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 text-xs text-slate-500 font-semibold">
          <span>شجرة الحسابات المحاسبية</span>
          <span>إجمالي الحسابات: {accounts.length} حساب</span>
        </div>

        <div className="space-y-1">
          {rootAccounts.map((rootAcc) => renderNode(rootAcc, 0))}
        </div>
      </div>

      {/* Create Account Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">إضافة حساب جديد في الدليل</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الحساب باللغة العربية</label>
                <input
                  type="text"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder="مثال: شركة الجزيرة للتوريدات / مصروف صيانة المركبات..."
                  className="w-full text-xs border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تصنيف الحساب</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-slate-50"
                  >
                    <option value="ASSET">الأصول (Asset)</option>
                    <option value="LIABILITY">الخصوم (Liability)</option>
                    <option value="EQUITY">حقوق الملكية (Equity)</option>
                    <option value="REVENUE">الإيرادات (Revenue)</option>
                    <option value="EXPENSE">المصروفات (Expense)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">العملة</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-slate-50"
                  >
                    <option value="YER">ريال يمني (YER)</option>
                    <option value="SAR">ريال سعودي (SAR)</option>
                    <option value="USD">دولار أمريكي (USD)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الحساب الأب (المجموعة الرئيسية)</label>
                <select
                  value={parentId || ''}
                  onChange={(e) => setParentId(e.target.value || null)}
                  className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-slate-50"
                >
                  <option value="">-- بدون أب (حساب رئيسي أول) --</option>
                  {accounts
                    .filter((a) => !a.isPostable)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.nameAr}
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  {loading ? 'جارٍ الحفظ...' : 'حفظ الحساب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
