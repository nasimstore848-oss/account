import { notFound } from 'next/navigation';
import { getAccountStatement } from '@/server/services/statement.service';
import { AutoPrint } from '@/app/print/AutoPrint';

interface PageProps {
  params: Promise<{ accountId: string }>;
  searchParams: Promise<{ startDate?: string; endDate?: string; size?: string; noprint?: string }>;
}

export default async function PrintStatementPage({ params, searchParams }: PageProps) {
  const { accountId } = await params;
  const { startDate, endDate, size, noprint } = await searchParams;

  let statement;
  try {
    statement = await getAccountStatement(accountId, startDate, endDate);
  } catch {
    notFound();
  }

  const {
    account,
    openingBalance,
    openingBalanceType,
    totalDebit,
    totalCredit,
    closingBalance,
    closingBalanceType,
    movements,
  } = statement;

  const sheetClass = size === 'a5' ? 'sheet' : 'sheet sheet-a4';

  const formatBalType = (t: string) => {
    if (t === 'DEBIT') return '(رصيد مدين)';
    if (t === 'CREDIT') return '(رصيد دائن)';
    return '(متزن 0.00)';
  };

  return (
    <main className={sheetClass}>
      {!noprint && <AutoPrint />}

      {/* Header */}
      <div className="company-header">
        <div>
          <div className="company-title">مؤسسة النظم المحاسبية الحديثة</div>
          <div style={{ fontSize: '9pt', color: '#555' }}>إدارة الحسابات العامة والرقابة المالية</div>
        </div>
        <div>
          <div className="doc-title">كشف حساب تفصيلي</div>
          <div style={{ fontSize: '9pt', textAlign: 'center', color: '#666' }}>
            STATEMENT OF ACCOUNT
          </div>
        </div>
        <div className="doc-serial-box">
          <div>الفترة المحاسبية</div>
          <div style={{ fontSize: '8.5pt', marginTop: '2px' }}>
            {statement.startDate} إلى {statement.endDate}
          </div>
        </div>
      </div>

      {/* Account Info Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '4mm',
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          padding: '3mm 4mm',
          marginBottom: '4mm',
          fontSize: '10pt',
        }}
      >
        <div>
          <b>اسم الحساب: </b>
          <span style={{ fontSize: '11pt', fontWeight: 800 }}>{account.nameAr}</span>
          <div style={{ fontSize: '9pt', color: '#666', marginTop: '2px' }}>
            رقم الحساب: <b>{account.code}</b> | النوع: {account.type}
          </div>
        </div>
        <div style={{ textAlign: 'start' }}>
          <div>
            <b>عملة الحساب: </b>
            <span>{account.currency}</span>
          </div>
          <div style={{ marginTop: '2px' }}>
            <b>رصيد أول المدة: </b>
            <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
              {Number(openingBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })} {account.currency}
            </span>{' '}
            <span style={{ fontSize: '8.5pt', color: '#555' }}>{formatBalType(openingBalanceType)}</span>
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <table>
        <thead>
          <tr>
            <th style={{ width: '22mm' }}>التاريخ</th>
            <th style={{ width: '14mm' }}>الرقم</th>
            <th style={{ width: '24mm' }}>نوع الحركة</th>
            <th>البيان والتفاصيل</th>
            <th style={{ width: '24mm' }}>مدين (+)</th>
            <th style={{ width: '24mm' }}>دائن (-)</th>
            <th style={{ width: '26mm' }}>الرصيد التراكمي</th>
          </tr>
        </thead>
        <tbody>
          {/* Opening balance row */}
          <tr style={{ background: '#f4f4f5', fontWeight: 700 }}>
            <td style={{ textAlign: 'center' }}>{statement.startDate}</td>
            <td style={{ textAlign: 'center' }}>—</td>
            <td style={{ textAlign: 'center' }}>رصيد افتتاحي</td>
            <td>رصيد ما قبل الفترة المحددة</td>
            <td className="num">—</td>
            <td className="num">—</td>
            <td className="num">
              {Number(openingBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </td>
          </tr>

          {movements.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: '6mm', color: '#666' }}>
                لا توجد حركات مسجلة خلال هذه الفترة
              </td>
            </tr>
          ) : (
            movements.map((m, idx) => (
              <tr key={idx}>
                <td style={{ textAlign: 'center' }}>{m.date}</td>
                <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>{m.serial}</td>
                <td style={{ textAlign: 'center' }}>{m.doc}</td>
                <td>{m.memo || '—'}</td>
                <td className="num">
                  {Number(m.debit) > 0
                    ? Number(m.debit).toLocaleString('en-US', { minimumFractionDigits: 2 })
                    : '—'}
                </td>
                <td className="num">
                  {Number(m.credit) > 0
                    ? Number(m.credit).toLocaleString('en-US', { minimumFractionDigits: 2 })
                    : '—'}
                </td>
                <td className="num" style={{ fontWeight: 700 }}>
                  {Number(m.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr style={{ background: '#eee', fontWeight: 800 }}>
            <td colSpan={4} style={{ textAlign: 'center' }}>
              الإجماليات ورصيد نهاية المدة:
            </td>
            <td className="num">
              {Number(totalDebit).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </td>
            <td className="num">
              {Number(totalCredit).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </td>
            <td className="num" style={{ background: '#e2e8f0', fontSize: '10.5pt' }}>
              {Number(closingBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Summary Footer */}
      <div
        style={{
          marginTop: '4mm',
          padding: '3mm 4mm',
          border: '1px dashed #000',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '10pt',
          background: '#fafafa',
        }}
      >
        <div>
          <b>صافي الرصيد الختامي: </b>
          <span style={{ fontSize: '11.5pt', fontWeight: 800 }}>
            {Number(closingBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })} {account.currency}
          </span>{' '}
          <b>{formatBalType(closingBalanceType)}</b>
        </div>
        <div style={{ fontSize: '9pt', color: '#555' }}>
          عدد الحركات: {movements.length} حركة مسجلة
        </div>
      </div>

      {/* Signatures */}
      <div className="signatures">
        <div>
          المحاسب المختص
          <br />
          <span style={{ fontSize: '9pt', color: '#999' }}>...........................</span>
        </div>
        <div>
          المدقق المالي
          <br />
          <span style={{ fontSize: '9pt', color: '#999' }}>...........................</span>
        </div>
        <div>
          اعتماد الإدارة المالية
          <br />
          <span style={{ fontSize: '9pt', color: '#999' }}>...........................</span>
        </div>
      </div>
    </main>
  );
}
