'use client';

import React from 'react';

interface GlossyBlueButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function GlossyBlueButton({
  children,
  onClick,
  type = 'button',
  disabled = false,
  className = '',
  ...props
}: GlossyBlueButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`relative group overflow-hidden px-5 py-2.5 rounded-2xl text-xs font-black text-white 
                 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 
                 border border-blue-400/40 shadow-lg shadow-blue-500/25 
                 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] 
                 disabled:opacity-50 disabled:pointer-events-none disabled:hover:scale-100
                 transition-all duration-300 ${className}`}
      {...props}
    >
      {/* طبقة الانعكاس الضوئي الزجاجي العلوي */}
      <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent pointer-events-none" />

      {/* وميض فضي يمر عبر الزر عند التمرير */}
      <span className="absolute -inset-full top-0 bg-gradient-to-r from-transparent via-white/25 to-transparent 
                       group-hover:translate-x-full duration-1000 transition-transform ease-out pointer-events-none" />

      <span className="relative z-10 flex items-center justify-center gap-2 drop-shadow-sm">
        {children}
      </span>
    </button>
  );
}
