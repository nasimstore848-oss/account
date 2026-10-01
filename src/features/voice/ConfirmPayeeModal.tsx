'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserPlus, Check, X, Building, AlertCircle } from 'lucide-react';
import { createAccountAction } from '@/server/actions/account.actions';

interface ConfirmPayeeModalProps {
  payeeName: string;
  defaultType: 'ASSET' | 'LIABILITY';
  onAccountCreated: (account: { id: string; nameAr: string; code: string }) => void;
  onSelectExisting: () => void;
  onCancel: () => void;
}

export function ConfirmPayeeModal({
  payeeName,
  defaultType,
  onAccountCreated,
  onSelectExisting,
  onCancel,
}: ConfirmPayeeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<'ASSET' | 'LIABILITY'>(defaultType);
  const [currency, setCurrency] = useState('YER');

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    },
    [onCancel]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await createAccountAction({
        nameAr: payeeName,
        type: accountType,
        currency,
        parentId: accountType === 'LIABILITY' ? 'acc_2101' : 'acc_1103',
        isCashBox: false,
      });

      if (res.ok && res.account) {
        onAccountCreated(res.account);
      } else {
        setError(res.error || 'تعذر إنشاء الحساب');
      }
    } catch (e: any) {
      setError(e?.message || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* طبقة التعتيم الخلفية مع دعم الإغلاق عند النقر */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onCancel}
        title="اضغط للخروج"
      />

      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-[0_20px_50px_rgba(30,58,138,0.25)] border border-slate-200 p-6 animate-in fade-in zoom-in-95 duration-150 z-10" dir="rtl">
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-5 left-5 w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer"
          title="إلغاء وإغلاق (Esc)"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900">إنشاء حساب جديد للمستفيد</h3>
            <p className="text-xs text-slate-500">تم التقاط اسم غير مسجل مسبقاً في الدليل المحاسبي</p>
          </div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-3.5 mb-5 text-sm text-amber-900 leading-relaxed">
          لم يتم العثور على حساب باسم <span className="font-bold underline text-amber-950">«{payeeName}»</span>. هل ترغب بإنشاء هذا الحساب الآن ومتابعة تحضير السند؟
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">تصنيف الحساب</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAccountType('LIABILITY')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  accountType === 'LIABILITY'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                مورد / دائن (خصوم)
              </button>
              <button
                type="button"
                onClick={() => setAccountType('ASSET')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  accountType === 'ASSET'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                عميل / مدين (أصول)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">العملة الافتراضية</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="YER">ريال يمني (YER)</option>
              <option value="SAR">ريال سعودي (SAR)</option>
              <option value="USD">دولار أمريكي (USD)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={handleCreate}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            {loading ? (
              <span>جارٍ إنشاء الحساب...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>نعم، أنشئ الحساب وتابع للسند</span>
              </>
            )}
          </button>

          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              type="button"
              onClick={onSelectExisting}
              className="py-2 px-3 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-medium transition-all"
            >
              اختيار حساب يدوي
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="py-2 px-3 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-medium transition-all"
            >
              إلغاء الأمر
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
