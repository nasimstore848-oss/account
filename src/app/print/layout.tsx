import '@/styles/print.css';

export const metadata = {
  title: 'طباعة المستندات المحاسبية',
};

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="print-root">{children}</div>;
}
