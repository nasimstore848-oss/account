'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Mic, 
  Volume2, 
  Sparkles, 
  Check, 
  AlertCircle, 
  ArrowLeft, 
  X, 
  CornerDownLeft,
  HelpCircle,
  LogOut
} from 'lucide-react';
import { useVoiceStore } from './voice.store';
import { useArabicVoiceCommander } from './useArabicVoiceCommander';
import { ConfirmPayeeModal } from './ConfirmPayeeModal';
import { VoiceDraft } from '@/adapters/voice/parse-command';
import { GlossyBlueButton } from '@/components/ui/GlossyBlueButton';

interface VoiceCommanderModalProps {
  onOpenVoucherFormWithDraft: (draft: VoiceDraft & { payeeId?: string }) => void;
}

const SAMPLE_COMMANDS = [
  'اصرف لـ سامي العراسي مبلغ 50 الف مقابل صيانة',
  'اقبض من جمال قبيضة بمبلغ 250000 ريال دفعة مبيعات',
  'اصرف لـ هشام العراسي 50الف حق ماء',
  'سدد لـ شركة النور مبلغ 120 الف دولار بخصوص توريدات',
  'اصرف لـ علي مبلغ 500 الف مقابل ايجار',
];

export function VoiceCommanderModal({ onOpenVoucherFormWithDraft }: VoiceCommanderModalProps) {
  const { isOpen, closeModal, status, transcript, error, draft, candidates, set } = useVoiceStore();
  const [manualText, setManualText] = useState('');

  const { start, stop, processManualText } = useArabicVoiceCommander(() => {});

  // 1. إغلاق النافذة فوراً عند الضغط على زر Esc من لوحة المفاتيح
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stop();
        closeModal();
      }
    },
    [closeModal, stop]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // منع تمرير الصفحة الخلفية
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const isListening = status === 'listening';

  const handleApplyDraftToForm = () => {
    if (draft) {
      onOpenVoucherFormWithDraft(draft);
      closeModal();
    }
  };

  const handleCandidatePick = (cand: { id: string; nameAr: string; code: string }) => {
    if (draft) {
      const enriched = { ...draft, payeeId: cand.id, payee: cand.nameAr };
      set({ status: 'review', draft: enriched, candidates: [] });
    }
  };

  const handleAccountCreated = (account: { id: string; nameAr: string; code: string }) => {
    if (draft) {
      const enriched = { ...draft, payeeId: account.id, payee: account.nameAr };
      set({ status: 'review', draft: enriched });
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* طبقة التعتيم الخلفية مع تأثير بلوري وإغلاق عند النقر */}
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => {
            stop();
            closeModal();
          }}
          title="اضغط للخروج"
        />

        {/* جسم النافذة الرئيسي - ثيم أزرق وفضي لامع */}
        <div 
          className="relative w-full max-w-xl bg-white rounded-3xl shadow-[0_20px_50px_rgba(30,58,138,0.25)] border border-slate-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200"
          dir="rtl"
        >
          {/* شريط الإضاءة العلوي المعدني */}
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-700 via-sky-400 to-indigo-600" />

          {/* الترويسة الرئيسية */}
          <div className="p-6 pb-5 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white relative">
            {/* زر إغلاق دائري بارز مع مفتاح اختصار ESC */}
            <button
              type="button"
              onClick={() => {
                stop();
                closeModal();
              }}
              className="absolute top-5 left-5 w-9 h-9 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white/90 hover:text-white transition-all shadow-sm hover:scale-105 active:scale-95 group"
              title="إغلاق النافذة (Esc)"
            >
              <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 bg-gradient-to-tr from-blue-500 to-sky-400 rounded-xl text-white shadow-md shadow-blue-500/30">
                <Sparkles className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold text-sky-200 tracking-wide uppercase">
                الأوامر الصوتية
              </span>
            </div>
            
            <h2 className="text-xl font-black tracking-tight text-white">إدخال السندات بالصوت</h2>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              تحدث لتجهيز سندات الصرف والقبض مباشرة.
            </p>
          </div>

          {/* محتوى النافذة التفاعلي */}
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* دائرة الميكروفون مع تأثير النبضات الفضية اللامعة */}
            <div className="flex flex-col items-center justify-center py-2 text-center">
              <div className="relative flex items-center justify-center">
                {isListening && (
                  <>
                    <div className="absolute w-32 h-32 rounded-full bg-rose-500/20 animate-ping" />
                    <div className="absolute w-28 h-28 rounded-full bg-sky-500/30 animate-pulse" />
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (isListening) stop();
                    else start('ar-YE');
                  }}
                  className={`relative z-10 w-24 h-24 rounded-3xl flex items-center justify-center shadow-xl transition-all duration-300 ${
                    isListening
                      ? 'bg-gradient-to-tr from-rose-600 to-red-500 text-white shadow-rose-500/30 scale-105'
                      : 'bg-gradient-to-tr from-blue-600 via-blue-500 to-sky-400 hover:from-blue-700 hover:to-sky-500 text-white shadow-blue-500/25 hover:scale-105 active:scale-95'
                  }`}
                >
                  <Mic className={`w-10 h-10 ${isListening ? 'animate-bounce' : ''}`} />
                </button>
              </div>

              <div className="mt-4">
                <span className="text-sm font-extrabold text-slate-900 block">
                  {isListening ? 'جارٍ الاستماع...' : 'اضغط على الميكروفون وتحدث'}
                </span>
                <span className="text-[11px] font-medium text-slate-500 mt-0.5 inline-block">
                  باللغة العربية
                </span>
              </div>
            </div>

            {/* صندوق عرض النص الملتقط */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 shadow-inner">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-bold flex items-center gap-1.5 text-slate-700">
                  <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                  الكلام الملتقط:
                </span>
                {status !== 'idle' && (
                  <span className="bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full text-[10px]">
                    الحالة: {status}
                  </span>
                )}
              </div>
              <div className="min-h-11 text-xs sm:text-sm text-slate-800 font-semibold leading-relaxed">
                {transcript ? (
                  <span className="text-blue-950 font-bold">«{transcript}»</span>
                ) : (
                  <span className="text-slate-400 font-normal">
                    لم يتم نطق أي أمر بعد... انقر على الميكروفون بالأعلى أو اختر عبارة جاهزة من الأسفل.
                  </span>
                )}
              </div>
            </div>

            {/* تنبيه الأخطاء إن وجد */}
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{error}</div>
              </div>
            )}

            {/* عند العثور على أكثر من حساب مطابق */}
            {status === 'choosePayee' && candidates.length > 0 && (
              <div className="border border-blue-200 bg-blue-50/60 rounded-2xl p-4">
                <h4 className="text-xs font-bold text-blue-950 mb-2.5">
                  توجد عدة حسابات مشابهة لاسم «{draft?.payee}»، حدد الحساب المعني:
                </h4>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {candidates.map((cand) => (
                    <button
                      key={cand.id}
                      type="button"
                      onClick={() => handleCandidatePick(cand)}
                      className="w-full text-start p-2.5 rounded-xl bg-white hover:bg-blue-100 border border-slate-200 hover:border-blue-300 text-xs flex items-center justify-between transition-all"
                    >
                      <span className="font-bold text-slate-800">{cand.nameAr}</span>
                      <span className="text-[11px] text-slate-500 font-mono font-semibold">{cand.code}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* بطاقة السند المستخرج تلقائياً */}
            {draft && (draft.amount || draft.payee || draft.action) && (
              <div className="border border-emerald-200 bg-emerald-50/50 rounded-2xl p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" />
                    المعاملة المستخرجة:
                  </span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      draft.action === 'PAYMENT'
                        ? 'bg-rose-100 text-rose-800'
                        : draft.action === 'RECEIPT'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    {draft.action === 'PAYMENT' ? 'سند صرف' : draft.action === 'RECEIPT' ? 'سند قبض' : 'فتح حساب'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-200/90">
                    <span className="text-slate-400 block text-[10px] font-bold">الحساب / الطرف المقابل</span>
                    <span className="font-bold text-slate-900 truncate block mt-0.5">
                      {draft.payee || 'لم يُحدد'}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/90">
                    <span className="text-slate-400 block text-[10px] font-bold">المبلغ والعملة</span>
                    <span className="font-black text-slate-900 font-mono block mt-0.5">
                      {draft.amount ? draft.amount.toLocaleString('en-US') : '—'} {draft.currency}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/90">
                    <span className="text-slate-400 block text-[10px] font-bold">التاريخ المحاسبي</span>
                    <span className="font-black text-slate-900 font-mono block mt-0.5">
                      {draft.date || 'اليوم'}
                    </span>
                  </div>
                </div>

                {draft.description && (
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 text-xs">
                    <span className="text-slate-400 block text-[10px] font-bold">البيان:</span>
                    <span className="font-medium text-slate-800">{draft.description}</span>
                  </div>
                )}

                <GlossyBlueButton
                  onClick={handleApplyDraftToForm}
                  className="w-full py-3"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>تأكيد ونقل البيانات إلى نموذج السند</span>
                </GlossyBlueButton>
              </div>
            )}

            {/* عبارات تجربة سريعة بنقرة واحدة */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 mb-2">
                <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                <span>أمثلة للأوامر الصوتية:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_COMMANDS.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      set({ transcript: sample });
                      processManualText(sample);
                    }}
                    className="text-xs bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-slate-200/80 text-slate-700 px-3 py-1.5 rounded-xl transition-all font-medium"
                  >
                    «{sample}»
                  </button>
                ))}
              </div>
            </div>

            {/* مربع الإدخال اليدوي التجريبي */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && manualText.trim()) {
                      processManualText(manualText.trim());
                      setManualText('');
                    }
                  }}
                  placeholder="اكتب الأمر هنا واضغط Enter..."
                  className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (manualText.trim()) {
                      processManualText(manualText.trim());
                      setManualText('');
                    }
                  }}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
                >
                  <CornerDownLeft className="w-3.5 h-3.5" />
                  <span>معالجة</span>
                </button>
              </div>
            </div>
          </div>

          {/* شريط الأزرار السفلي (Footer) المخصص للخروج والإلغاء */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              يمكنك الإغلاق بالضغط على مفتاح <kbd className="font-mono bg-white px-1.5 py-0.5 border border-slate-200 rounded text-slate-600">Esc</kbd>
            </span>

            <button
              type="button"
              onClick={() => {
                stop();
                closeModal();
              }}
              className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              <span>إغلاق موجه الأوامر (رجوع)</span>
            </button>
          </div>
        </div>
      </div>

      {/* نافذة تأكيد إنشاء الحساب غير المسجل مسبقاً */}
      {status === 'confirmCreate' && draft?.payee && (
        <ConfirmPayeeModal
          payeeName={draft.payee}
          defaultType={draft.action === 'RECEIPT' ? 'ASSET' : 'LIABILITY'}
          onAccountCreated={handleAccountCreated}
          onSelectExisting={() => {
            set({ status: 'review' });
            handleApplyDraftToForm();
          }}
          onCancel={() => set({ status: 'idle' })}
        />
      )}
    </>
  );
}
