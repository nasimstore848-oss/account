import type { Metadata } from 'next';
import { Cairo, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-cairo',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '700', '800'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'نظام السندات والقيود المحاسبية | Accounting System',
  description: 'نظام إدارة السندات والقيود المحاسبية وكشوفات الحسابات',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans bg-slate-100/70 text-slate-900 antialiased min-h-screen selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
