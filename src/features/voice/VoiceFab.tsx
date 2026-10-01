'use client';

import { Mic, Sparkles } from 'lucide-react';
import { useVoiceStore } from './voice.store';

export function VoiceFab() {
  const { openModal, status } = useVoiceStore();
  const isListening = status === 'listening';

  return (
    <button
      type="button"
      onClick={openModal}
      className={`relative group overflow-hidden inline-flex items-center gap-2.5 px-4 sm:px-5 py-2 rounded-2xl font-bold text-xs text-white shadow-lg transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] cursor-pointer ${
        isListening
          ? 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 shadow-rose-500/30 animate-pulse border border-rose-400/50'
          : 'surface-blue-gloss gloss-sheen-overlay shadow-blue-600/25 border border-sky-300/40'
      }`}
      title="الأوامر الصوتية"
    >
      {/* طبقة الانعكاس الزجاجي العلوي */}
      <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none rounded-t-2xl" />

      {/* مؤشر الحالة النابض */}
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        {isListening ? (
          <>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
          </>
        ) : (
          <>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-300 opacity-50" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-300 shadow-sm" />
          </>
        )}
      </span>

      <Mic className={`w-4 h-4 text-white shrink-0 ${isListening ? 'animate-bounce' : 'group-hover:scale-110 transition-transform'}`} />
      
      <span className="tracking-wide text-white drop-shadow-xs">الأوامر الصوتية</span>

      <Sparkles className="w-3 h-3 text-sky-200 opacity-80 group-hover:rotate-12 transition-transform hidden sm:inline" />
    </button>
  );
}

