'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, CheckCircle2, AlertCircle, X, BookOpen, LogOut } from 'lucide-react';
import Decimal from 'decimal.js';
import { createJournalAction } from '@/server/actions/journal.actions';
import { AccountRecord } from '@/server/repositories/account.repo';

interface JournalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountRecord[];
  onSuccess?: () => void;
}

type LineItem = {
  id: string;
  accountId: string;
  debit: string;
  credit: string;
  memo: string;
};

export function JournalFormModal({ isOpen, onClose, accounts, onSuccess }: JournalFormModalProps) {
  const router = useRouter();
  const [kind, setKind] = useState<'GENERAL' | 'OPENING' | 'ADJUSTING'>('GENERAL');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<LineItem[]>([
    { id: '1', accountId: '', debit: '', credit: '', memo: '' },
    { id: '2', accountId: '', debit: '', credit: '', memo: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // إغلاق النافذة فوراً عند الضغط على مفتاح Esc وقفل التمرير
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  // Calculate live totals
  let totalDebit = new Decimal(0);
  let totalCredit = new Decimal(0);
  lines.forEach((l) => {
    totalDebit = totalDebit.plus(new Decimal(l.debit || 0));
    totalCredit = totalCredit.plus(new Decimal(l.credit || 0));
  });

  const diff = totalDebit.minus(totalCredit).abs();
  const isBalanced = totalDebit.equals(totalCredit) && totalDebit.greaterThan(0);

  const addLine = () => {
    setLines([
      ...lines,
      { id: String(Date.now()), accountId: '', debit: '', credit: '', memo: '' },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof LineItem, val: string) => {
    const updated = [...lines];
    if (field === 'debit' && val) {
      updated[index] = { ...updated[index], debit: val, credit: '' };
    } else if (field === 'credit' && val) {
      updated[index] = { ...updated[index], credit: val, debit: '' };
    } else {
      updated[index] = { ...updated[index], [field]: val };
    }
    setLines(updated);
  };

  const handleSave = async () => {
    setError(null);
    if (!isBalanced) {
      setError('لا يمكن حفظ القيد: القيد غير متزن');
      return;
    }

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.accountId) {
        setError(`يرجى تحديد الحساب للسطر رقم ${i + 1}`);
        return;
      }
      const d = Number(l.debit || 0);
      const c = Number(l.credit || 0);
      if (d === 0 && c === 0) {
        setError(`السطر رقم ${i + 1} لا يحتوي على مبلغ مدين أو دائن`);
        return;
      }
    }

    setLoading(true);
    try {
      const res = await createJournalAction({
        kind,
        date,
        description: description.trim() || undefined,
        lines: lines.map((l) => ({
          accountId: l.accountId,
          debit: l.debit || '0',
          credit: l.credit || '0',
          memo: l.memo.trim() || undefined,
        })),
      });

      if (res.ok) {
        if (onSuccess) onSuccess();
        router.refresh();
        onClose();
      } else {
        setError(res.error || 'فشل حفظ القيد المحاسبي');
      }
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء حفظ القيد');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">قيد يومية جديد (Journal Entry)</h2>
              <p className="text-xs text-slate-300">
                تسجيل قيود محاسبية مركبة متوازنة (مدين = دائن)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-semibold">{error}</div>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع القيد</label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as any)}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white"
              >
                <option value="GENERAL">قيد يومية عام (General)</option>
                <option value="OPENING">قيد افتتاحي (Opening)</option>
                <option value="ADJUSTING">قيد تسوية (Adjusting)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">تاريخ القيد</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">شرح القيد العام</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="مثال: إثبات استحقاق رواتب / تسوية نهاية الفترة..."
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white"
              />
            </div>
          </div>

          {/* Lines Grid */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="bg-slate-100 p-3 text-xs font-bold text-slate-700 grid grid-cols-12 gap-2 text-center">
              <span className="col-span-1">#</span>
              <span className="col-span-4 text-start">الحساب المحاسبي</span>
              <span className="col-span-2">مدين (Debit)</span>
              <span className="col-span-2">دائن (Credit)</span>
              <span className="col-span-2 text-start">ملاحظات السطر</span>
              <span className="col-span-1">إجراء</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {lines.map((l, index) => (
                <div key={l.id} className="p-2.5 grid grid-cols-12 gap-2 items-center text-xs">
                  <span className="col-span-1 font-mono text-center text-slate-500 font-bold">
                    {index + 1}
                  </span>

                  <div className="col-span-4">
                    <select
                      value={l.accountId}
                      onChange={(e) => updateLine(index, 'accountId', e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">-- اختر الحساب --</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.code} - {acc.nameAr}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      dir="ltr"
                      placeholder="0.00"
                      value={l.debit}
                      onChange={(e) => updateLine(index, 'debit', e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-2 text-xs text-end font-mono font-bold bg-white text-emerald-700"
                    />
                  </div>

                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      dir="ltr"
                      placeholder="0.00"
                      value={l.credit}
                      onChange={(e) => updateLine(index, 'credit', e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-2 text-xs text-end font-mono font-bold bg-white text-blue-700"
                    />
                  </div>

                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="بيان خاص بالسطر"
                      value={l.memo}
                      onChange={(e) => updateLine(index, 'memo', e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white"
                    />
                  </div>

                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      disabled={lines.length <= 2}
                      onClick={() => removeLine(index)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded-lg transition-colors"
                      title="حذف السطر"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={addLine}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 shadow-2xs transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة سطر جديد</span>
              </button>

              {/* Balance Badge */}
              <div className="flex items-center gap-3">
                <div className="text-xs text-slate-500 font-mono">
                  مدين: <span className="font-bold text-emerald-700">{totalDebit.toFixed(2)}</span> | دائن: <span className="font-bold text-blue-700">{totalCredit.toFixed(2)}</span>
                </div>

                <div
                  className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                    isBalanced
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {isBalanced ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>القيد متزن</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      <span>غير متزن (الفرق: {diff.toFixed(2)})</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              إلغاء
            </button>

            <button
              type="button"
              disabled={!isBalanced || loading}
              onClick={handleSave}
              className="px-7 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm shadow-sm transition-all"
            >
              {loading ? 'جارٍ ترحيل القيد...' : 'حفظ وترحيل القيد'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
