'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  FileCheck,
  Printer,
  AlertTriangle,
  Sparkles,
  DollarSign,
  Calendar,
  Building,
  User,
  Info,
  LogOut,
} from 'lucide-react';
import { tafqeet } from '@/adapters/print/tafqeet';
import { createVoucherAction, updateVoucherAction } from '@/server/actions/voucher.actions';
import { AccountRecord } from '@/server/repositories/account.repo';
import { VoucherDetails } from '@/server/services/voucher.service';
import { VoiceDraft } from '@/adapters/voice/parse-command';
import { GlossyBlueButton } from '@/components/ui/GlossyBlueButton';

interface VoucherFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  cashBoxes: AccountRecord[];
  postableAccounts: AccountRecord[];
  initialType?: 'RECEIPT' | 'PAYMENT';
  editingVoucher?: VoucherDetails | null;
  voiceDraft?: (VoiceDraft & { payeeId?: string }) | null;
  onSuccess?: (voucherId: string, shouldPrint: boolean) => void;
}

export function VoucherFormModal({
  isOpen,
  onClose,
  cashBoxes,
  postableAccounts,
  initialType = 'PAYMENT',
  editingVoucher,
  voiceDraft,
  onSuccess,
}: VoucherFormModalProps) {
  const router = useRouter();
  const [type, setType] = useState<'RECEIPT' | 'PAYMENT'>(initialType);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('YER');
  const [cashAccountId, setCashAccountId] = useState('');
  const [counterpartyAccountId, setCounterpartyAccountId] = useState('');
  const [description, setDescription] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCashShortfall, setIsCashShortfall] = useState(false);

  // إغلاق النافذة فوراً عند الضغط على مفتاح Esc وقفل تمرير الخلفية
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

  // Set default cash box matching currency
  useEffect(() => {
    if (cashBoxes.length > 0 && !cashAccountId) {
      const match = cashBoxes.find((b) => b.currency === currency) || cashBoxes[0];
      setCashAccountId(match.id);
    }
  }, [cashBoxes, currency, cashAccountId]);

  // Handle Editing voucher or Voice draft pre-fill
  useEffect(() => {
    if (editingVoucher) {
      setType(editingVoucher.type);
      setDate(editingVoucher.voucherDate);
      setAmount(editingVoucher.amount);
      setCurrency(editingVoucher.currency);
      setCashAccountId(editingVoucher.cashAccountId);
      setCounterpartyAccountId(editingVoucher.counterpartyAccountId);
      setDescription(editingVoucher.description || '');
      setError(null);
      setIsCashShortfall(false);
    } else if (voiceDraft) {
      if (voiceDraft.action === 'RECEIPT' || voiceDraft.action === 'PAYMENT') {
        setType(voiceDraft.action);
      }
      if (voiceDraft.date) {
        setDate(voiceDraft.date);
      }
      if (voiceDraft.amount) {
        setAmount(String(voiceDraft.amount));
      }
      if (voiceDraft.currency) {
        setCurrency(voiceDraft.currency);
      }
      if (voiceDraft.description) {
        setDescription(voiceDraft.description);
      }
      if (voiceDraft.payeeId) {
        setCounterpartyAccountId(voiceDraft.payeeId);
      }
      setError(null);
      setIsCashShortfall(false);
    } else {
      setType(initialType);
      setDate(new Date().toISOString().slice(0, 10));
      setAmount('');
      setDescription('');
      setError(null);
      setIsCashShortfall(false);
    }
  }, [editingVoucher, voiceDraft, initialType]);

  if (!isOpen) return null;

  const isReceipt = type === 'RECEIPT';
  const liveTafqeet = amount && Number(amount) > 0 ? tafqeet(amount, currency) : '—';

  const handleSubmit = async (andPrint = false) => {
    setError(null);
    setIsCashShortfall(false);

    if (!amount || Number(amount) <= 0) {
      setError('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }
    if (!cashAccountId) {
      setError('يرجى تحديد الصندوق النقدي للعملية');
      return;
    }
    if (!counterpartyAccountId) {
      setError('يرجى تحديد الحساب المقابل');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        type,
        date,
        amount: Number(amount).toFixed(2),
        currency,
        cashAccountId,
        counterpartyAccountId,
        description: description.trim() || undefined,
      };

      let res: { ok: boolean; id?: string; serial?: number; error?: string; code?: string };

      if (editingVoucher) {
        res = await updateVoucherAction(editingVoucher.id, payload);
      } else {
        res = await createVoucherAction(payload);
      }

      if (res.ok && res.id) {
        if (andPrint) {
          window.open(`/print/voucher/${res.id}`, '_blank');
        }
        if (onSuccess) {
          onSuccess(res.id, andPrint);
        }
        router.refresh();
        onClose();
      } else {
        setError(res.error || 'فشلت العملية');
        if (res.code === 'NEGATIVE_CASH') {
          setIsCashShortfall(true);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ غير متوقع');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* طبقة التعتيم مع إغلاق بالنقر */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        title="اضغط للخروج"
      />

      <div 
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-[0_25px_60px_rgba(15,23,42,0.3)] border border-slate-200 overflow-hidden my-6 z-10 animate-in fade-in zoom-in-95 duration-150"
        dir="rtl"
      >
        {/* Header */}
        <div
          className={`p-6 text-white flex items-center justify-between ${
            isReceipt
              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700'
              : 'surface-blue-gloss'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md shadow-inner border border-white/25">
              <FileCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black">
                {editingVoucher
                  ? `تعديل سند ${isReceipt ? 'قبض' : 'صرف'} رقم ${editingVoucher.serial}`
                  : isReceipt
                  ? 'سند قبض نقدي جديد'
                  : 'سند صرف نقدي جديد'}
              </h2>
              <p className="text-xs text-white/85">
                {isReceipt ? 'إثبات تحصيل وقبض أموال في الصندوق' : 'إثبات صرف ودفع أموال من الصندوق'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 group cursor-pointer"
            title="إغلاق النافذة (Esc)"
          >
            <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Type Switcher (only for new vouchers) */}
          {!editingVoucher && (
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setType('PAYMENT')}
                className={`py-2 px-4 rounded-xl text-sm font-bold transition-all ${
                  type === 'PAYMENT'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                سند صرف (خروج نقدية)
              </button>
              <button
                type="button"
                onClick={() => setType('RECEIPT')}
                className={`py-2 px-4 rounded-xl text-sm font-bold transition-all ${
                  type === 'RECEIPT'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                سند قبض (دخول نقدية)
              </button>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div
              className={`p-4 rounded-2xl text-xs flex items-start gap-3 border ${
                isCashShortfall
                  ? 'bg-rose-50 border-rose-300 text-rose-800'
                  : 'bg-amber-50 border-amber-300 text-amber-800'
              }`}
            >
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1 space-y-1">
                <span className="font-bold block text-sm">
                  {isCashShortfall ? 'تنبيه رصيد الصندوق' : 'تنبيه'}
                </span>
                <p className="leading-relaxed">{error}</p>
                {isCashShortfall && (
                  <p className="text-[11px] text-rose-600 font-medium">
                    * الرصيد المتوفر في الصندوق غير كافٍ لإتمام عملية الصرف.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                تاريخ السند
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            {/* Currency */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                العملة
              </label>
              <select
                value={currency}
                onChange={(e) => {
                  const newCcy = e.target.value;
                  setCurrency(newCcy);
                  const matchingBox = cashBoxes.find((b) => b.currency === newCcy);
                  if (matchingBox) setCashAccountId(matchingBox.id);
                }}
                className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="YER">ريال يمني (YER)</option>
                <option value="SAR">ريال سعودي (SAR)</option>
                <option value="USD">دولار أمريكي (USD)</option>
              </select>
            </div>

            {/* Cash Box */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                الصندوق النقدي
              </label>
              <select
                value={cashAccountId}
                onChange={(e) => setCashAccountId(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {cashBoxes.map((box) => (
                  <option key={box.id} value={box.id}>
                    {box.nameAr} ({box.currency})
                  </option>
                ))}
              </select>
            </div>

            {/* Counterparty Account */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                {isReceipt ? 'استلمنا من (الحساب المقابل):' : 'اصرفوا إلى (الحساب المقابل):'}
              </label>
              <select
                value={counterpartyAccountId}
                onChange={(e) => setCounterpartyAccountId(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- اختر الحساب المقابل --</option>
                {postableAccounts
                  .filter((a) => !a.isCashBox)
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} - {acc.nameAr} ({acc.type})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Amount Box with LTR Digits & live Tafqeet */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">المبلغ بالأرقام</label>
              <span className="text-xs font-bold text-blue-600">{currency}</span>
            </div>

            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                dir="ltr"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full text-2xl font-bold font-mono text-end tracking-wider border border-slate-300 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Live Tafqeet Box */}
            <div className="pt-2 border-t border-slate-200/60 flex items-start gap-2 text-xs">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-slate-400 block text-[10px]">المبلغ كتابةً:</span>
                <span className="font-bold text-slate-800 leading-relaxed text-sm">
                  {liveTafqeet}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              البيان / مقابل
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثال: دفعة من قيمة مبيعات بضاعة / إيجار المقر لشهر يناير"
              className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-500" />
                <span>إلغاء الأمر (رجوع)</span>
              </button>
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                أو اضغط <kbd className="font-mono bg-white px-1.5 py-0.5 border border-slate-200 rounded text-slate-600">Esc</kbd>
              </span>
            </div>

            <div className="w-full sm:w-auto flex items-center gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSubmit(false)}
                className="flex-1 sm:flex-initial px-6 py-2.5 bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer"
              >
                {saving ? 'جارٍ الحفظ...' : 'حفظ السند'}
              </button>

              <GlossyBlueButton
                type="button"
                disabled={saving}
                onClick={() => handleSubmit(true)}
              >
                <Printer className="w-4 h-4" />
                <span>حفظ وطباعة</span>
              </GlossyBlueButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
