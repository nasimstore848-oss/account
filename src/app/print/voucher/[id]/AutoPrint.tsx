'use client';

import { useEffect } from 'react';

export function AutoPrint() {
  useEffect(() => {
    // Slight timeout allows Arabic fonts to render before browser opens print dialog
    const t = setTimeout(() => {
      try {
        window.print();
      } catch {}
    }, 400);

    return () => clearTimeout(t);
  }, []);

  return (
    <div className="action-bar no-print">
      <button
        type="button"
        onClick={() => window.print()}
        className="btn-print"
      >
        طباعة المستند الآن (Ctrl + P)
      </button>
      <button
        type="button"
        onClick={() => window.close()}
        style={{
          background: '#64748b',
          color: 'white',
          border: 'none',
          padding: '6px 14px',
          borderRadius: '6px',
          cursor: 'pointer',
        }}
      >
        إغلاق النافذة
      </button>
    </div>
  );
}
