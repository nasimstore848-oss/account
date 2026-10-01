'use client';

import { useEffect, useRef, useCallback } from 'react';
import { parseCommand, VoiceDraft } from '@/adapters/voice/parse-command';
import { useVoiceStore } from './voice.store';

export function useArabicVoiceCommander(
  onReadyForForm?: (draft: VoiceDraft & { payeeId?: string }) => void
) {
  const rec = useRef<any>(null);
  const { status, set } = useVoiceStore();

  const supported =
    typeof window !== 'undefined' &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const resolvePayee = useCallback(async (name: string) => {
    try {
      const r = await fetch(`/api/voice/resolve-payee?q=${encodeURIComponent(name)}`);
      if (!r.ok) return { exact: null, candidates: [] };
      return (await r.json()) as {
        exact?: { id: string; nameAr: string; code: string };
        candidates: { id: string; nameAr: string; code: string }[];
      };
    } catch {
      return { exact: null, candidates: [] };
    }
  }, []);

  const handleFinal = useCallback(
    async (text: string) => {
      set({ status: 'parsing', transcript: text });
      const d = parseCommand(text);

      if (!d.action) {
        set({ status: 'error', error: 'لم أستطع فهم الأمر الصوتي. يرجى البدء بكلمة مثل: اصرف، اقبض، أو فتح حساب.' });
        return;
      }

      if (d.action === 'OPEN_ACCOUNT') {
        set({ status: 'confirmCreate', draft: d });
        return;
      }

      if (!d.payee || !d.amount) {
        // Incomplete command, still allow opening form with whatever we got
        set({ status: 'review', draft: d });
        if (onReadyForForm) onReadyForForm(d);
        return;
      }

      set({ status: 'resolvingPayee' });
      const { exact, candidates } = await resolvePayee(d.payee);

      if (exact) {
        const enrichedDraft = { ...d, payeeId: exact.id };
        set({ status: 'review', draft: enrichedDraft });
        if (onReadyForForm) onReadyForForm(enrichedDraft);
      } else if (candidates && candidates.length > 0) {
        set({ status: 'choosePayee', draft: d, candidates });
      } else {
        set({ status: 'confirmCreate', draft: d });
      }
    },
    [resolvePayee, set, onReadyForForm]
  );

  const processManualText = useCallback(
    (text: string) => {
      handleFinal(text);
    },
    [handleFinal]
  );

  const start = useCallback(
    (lang: 'ar-YE' | 'ar-SA' = 'ar-YE') => {
      if (!supported) {
        set({
          status: 'error',
          error: 'متصفحك لا يدعم Web Speech API المباشر. يمكنك استخدام أزرار التجربة السريعة أو إدخال النص بالأدنى.',
        });
        return;
      }

      try {
        const SpeechRec =
          (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const r = new SpeechRec();
        r.lang = lang;
        r.interimResults = true;
        r.maxAlternatives = 3;
        r.continuous = false;

        r.onstart = () => {
          set({ status: 'listening', transcript: '', error: null });
        };

        r.onresult = (e: any) => {
          const res = e.results[e.results.length - 1];
          const transcript = res[0].transcript;
          set({ transcript });
          if (res.isFinal) {
            handleFinal(transcript);
          }
        };

        r.onerror = (e: any) => {
          console.warn('Speech error:', e.error);
          if (e.error === 'language-not-supported' && lang === 'ar-YE') {
            start('ar-SA'); // Fallback to Saudi dialect
            return;
          }
          if (e.error === 'not-allowed') {
            set({ status: 'error', error: 'يرجى السماح بصلاحية الميكروفون في المتصفح' });
          } else if (e.error === 'no-speech') {
            set({ status: 'error', error: 'لم يتم التقاط أي صوت، يرجى المحاولة مرة أخرى' });
          } else {
            set({ status: 'error', error: `تعذر التعرف على الصوت (${e.error})` });
          }
        };

        r.onend = () => {
          if (useVoiceStore.getState().status === 'listening') {
            set({ status: 'idle' });
          }
        };

        rec.current = r;
        r.start();
      } catch (err: any) {
        set({ status: 'error', error: err.message || 'تعذر تشغيل الميكروفون' });
      }
    },
    [supported, handleFinal, set]
  );

  const stop = useCallback(() => {
    if (rec.current) {
      rec.current.stop();
    }
  }, []);

  useEffect(() => {
    return () => {
      if (rec.current) {
        try {
          rec.current.abort();
        } catch {}
      }
    };
  }, []);

  return { supported, status, start, stop, processManualText };
}
