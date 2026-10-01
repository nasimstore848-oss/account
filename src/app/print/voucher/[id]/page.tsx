import { pool } from '@/db';
import { notFound } from 'next/navigation';
import { tafqeet } from '@/adapters/print/tafqeet';
import { AutoPrint } from '@/app/print/AutoPrint';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ size?: string; noprint?: string; copy?: string }>;
}

export default async function PrintVoucherPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { size, noprint, copy } = await searchParams;

  const client = await pool.connect();
  let v: any;
  try {
    const res = await client.query(
      `
      SELECT v.id, v.type, v."fiscalYear", v.serial, v."voucherDate"::text as "voucherDate",
             v.status, v.currency, v.amount::text, v.description,
             v."voidReason", v."voidedAt"::text,
             c."nameAr" as "cashAccountName",
             p."nameAr" as "counterpartyAccountName",
             u.name as "createdByName"
        FROM "Voucher" v
        JOIN "Account" c ON c.id = v."cashAccountId"
        JOIN "Account" p ON p.id = v."counterpartyAccountId"
        JOIN "User" u ON u.id = v."createdById"
       WHERE v.id = $1
      `,
      [id]
    );

    if (res.rows.length === 0) {
      notFound();
    }
    v = res.rows[0];
  } finally {
    client.release();
  }

  const isReceipt = v.type === 'RECEIPT';
  const sheetClass = size === 'a4' ? 'sheet sheet-a4' : 'sheet';

  return (
    <main className={sheetClass}>
      {!noprint && <AutoPrint />}

      {v.status === 'VOID' && (
        <div className="void-watermark">
          ملغي
          {v.voidReason && (
            <div style={{ fontSize: '10pt', marginTop: '4px', fontWeight: 700 }}>
              السبب: {v.voidReason}
            </div>
          )}
        </div>
      )}

      {/* الترويسة الرسمية */}
      <div className="company-header">
        <div>
          <div className="company-title">مؤسسة النظم الحديثة</div>
          <div className="company-sub">الجمهورية اليمنية - صنعاء | إدارة الشؤون المالية والمحاسبية</div>
        </div>
        <div>
          <div className="doc-title">{isReceipt ? 'سند قبض نقدي' : 'سند صرف نقدي'}</div>
          <div className="doc-title-en">
            {isReceipt ? 'OFFICIAL RECEIPT VOUCHER' : 'OFFICIAL PAYMENT VOUCHER'}
          </div>
          {copy && (
            <div style={{ fontSize: '8pt', textAlign: 'center', fontWeight: 'bold', color: '#475569', marginTop: '2px' }}>
              ({copy})
            </div>
          )}
        </div>
        <div className="doc-serial-box">
          <div>رقم السند: <b>{v.serial}</b></div>
          <div style={{ fontSize: '8.5pt', color: '#64748b' }}>السنة المالية: {v.fiscalYear}</div>
          <div style={{ fontSize: '9pt', marginTop: '2px', fontFamily: 'monospace' }}>{v.voucherDate} م</div>
        </div>
      </div>

      {/* تفاصيل السند الأساسية */}
      <div className="kv">
        <b>تاريخ التحرير:</b>
        <span style={{ fontFamily: 'monospace' }}>{v.voucherDate} م</span>

        <b>{isReceipt ? 'استلمنا من السيد/السادة:' : 'اصرفوا إلى السيد/السادة:'}</b>
        <span style={{ fontSize: '12pt', fontWeight: 800 }}>{v.counterpartyAccountName}</span>

        <b>الصندوق / الخزينة:</b>
        <span>{v.cashAccountName}</span>

        <b>المبلغ بالأرقام:</b>
        <div>
          <span className="amount-box">
            {Number(v.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {v.currency}
          </span>
        </div>

        <b>وذلك عن / البيان:</b>
        <span style={{ fontSize: '11pt', fontWeight: 600 }}>{v.description || '—'}</span>
      </div>

      {/* صندوق التفقيط اللغوي */}
      <div className="tafqeet">
        المبلغ كتابةً: <b>{tafqeet(v.amount, v.currency)}</b>
      </div>

      {/* التواقيع والاعتمادات الرسمية */}
      <div className="signatures">
        <div>
          المحاسب المنشئ
          <br />
          <span style={{ fontSize: '9pt', color: '#475569' }}>{v.createdByName}</span>
        </div>
        <div>
          {isReceipt ? 'أمين الصندوق (المستلم)' : 'المستلم / المفوض بالصرف'}
          <br />
          <span style={{ fontSize: '9pt', color: '#94a3b8' }}>...........................</span>
        </div>
        <div>
          اعتماد الإدارة المالية
          <br />
          <span style={{ fontSize: '9pt', color: '#94a3b8' }}>...........................</span>
        </div>
      </div>
    </main>
  );
}
