'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AlertOctagon, X, AlertTriangle, LogOut } from 'lucide-react';
import { voidVoucherAction } from '@/server/actions/voucher.actions';
import { VoucherDetails } from '@/server/services/voucher.service';

interface VoidVoucherModalProps {
  voucher: VoucherDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function VoidVoucherModal({ voucher, isOpen, onClose, onSuccess }: VoidVoucherModalProps) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // إغلاق النافذة عند الضغط على Escape وقفل التمرير
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

  if (!isOpen || !voucher) return null;

  const handleVoid = async () => {
    if (!reason.trim() || reason.trim().length < 3) {
      setError('يرجى كتابة سبب الإلغاء بشكل واضح (3 أحرف على الأقل)');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await voidVoucherAction({ id: voucher.id, reason: reason.trim() });
      if (res.ok) {
        if (onSuccess) onSuccess();
        router.refresh();
        onClose();
      } else {
        setError(res.error || 'تعذر إلغاء السند');
      }
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء الإلغاء');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* طبقة التعتيم مع إغلاق بالنقر */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        title="اضغط للخروج"
      />

      <div 
        className="relative w-full max-w-md bg-white rounded-3xl shadow-[0_25px_60px_rgba(15,23,42,0.3)] border border-slate-200 p-6 animate-in fade-in zoom-in-95 duration-150 z-10"
        dir="rtl"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">
                إلغاء سند {voucher.type === 'RECEIPT' ? 'قبض' : 'صرف'} رقم {voucher.serial}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                السنة: {voucher.fiscalYear} | المبلغ: {Number(voucher.amount).toLocaleString()} {voucher.currency}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer"
            title="إغلاق النافذة (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 mb-4 text-xs text-amber-900 leading-relaxed">
          <p className="font-bold mb-1 flex items-center gap-1.5 text-amber-950">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            تنبيه:
          </p>
          سيتم وسم السند كـ <b>«ملغي»</b> وإلغاء أثره المالي في الحسابات، مع الاحتفاظ ببيانات السند في الأرشيف.
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 mb-4 leading-relaxed font-semibold">
            <span>تنبيه: </span>
            {error}
          </div>
        )}

        <div className="space-y-2 mb-6">
          <label className="block text-xs font-bold text-slate-700">سبب إلغاء السند:</label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="اكتب سبب الإلغاء للتدقيق المالي (مثال: خطأ في المبلغ / تكرار السند / إلغاء المعاملة)..."
            className="w-full text-xs border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-500" />
            <span>تراجع (رجوع)</span>
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleVoid}
            className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer"
          >
            {loading ? 'جارٍ الإلغاء...' : 'تأكيد إلغاء السند'}
          </button>
        </div>
      </div>
    </div>
  );
}

