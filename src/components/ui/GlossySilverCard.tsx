import React from 'react';
import Link from 'next/link';

interface MetricCardProps {
  title: string;
  value: string;
  currency: string;
  href?: string;
  statusLabel?: string;
}

export function GlossySilverCard({
  title,
  value,
  currency,
  href,
  statusLabel = 'نشط • مؤمّن',
}: MetricCardProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-slate-50 via-slate-100/80 to-blue-50/40 
                    border border-slate-300/80 shadow-[0_10px_25px_-5px_rgba(148,163,184,0.25)] 
                    hover:border-blue-400 transition-all duration-300">
      {/* خط ضوء علوي فضي أبيض */}
      <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent" />

      {/* هالة زرقاء ناعمة في الخلفية */}
      <div className="absolute -left-10 -bottom-10 w-28 h-28 bg-blue-400/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between text-xs mb-3">
        <span className="font-bold text-slate-600 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-600 shadow-sm shadow-blue-400" />
          {title}
        </span>
        <span className="font-mono text-[10px] bg-gradient-to-r from-slate-200 to-slate-100 text-slate-700 
                         px-2.5 py-0.5 rounded-full font-bold border border-slate-300 shadow-inner">
          {currency}
        </span>
      </div>

      <div className="flex items-baseline justify-between mt-2">
        <div className="text-2xl font-black font-mono tracking-tight text-slate-900 drop-shadow-xs" dir="ltr">
          {value}
        </div>
        <span className="text-xs font-black text-blue-700">{currency}</span>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
        {href ? (
          <Link
            href={href}
            className="text-blue-600 hover:text-blue-800 font-bold hover:underline flex items-center gap-1"
          >
            <span>كشف حساب</span>
            <span aria-hidden="true">←</span>
          </Link>
        ) : (
          <span className="text-slate-500 font-semibold">حالة الحساب</span>
        )}
        <span className="text-blue-800 font-black px-2 py-0.5 rounded-md bg-blue-100/70 border border-blue-200">
          {statusLabel}
        </span>
      </div>
    </div>
  );
}
