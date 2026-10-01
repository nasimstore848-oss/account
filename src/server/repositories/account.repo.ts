import { pool } from '@/db';
import { randomUUID } from 'crypto';

export type AccountRecord = {
  id: string;
  code: string;
  nameAr: string;
  type: string;
  currency: string;
  isCashBox: boolean;
  isPostable: boolean;
  isActive: boolean;
  parentId: string | null;
  createdAt: Date;
};

const DEMO_CASH_BOXES: AccountRecord[] = [
  { id: 'acc_cash_yer', code: '110101', nameAr: 'الصندوق الرئيسي (ريال يمني)', type: 'ASSET', currency: 'YER', isCashBox: true, isPostable: true, isActive: true, parentId: 'acc_1101', createdAt: new Date() },
  { id: 'acc_cash_sar', code: '110102', nameAr: 'صندوق الريال السعودي', type: 'ASSET', currency: 'SAR', isCashBox: true, isPostable: true, isActive: true, parentId: 'acc_1101', createdAt: new Date() },
  { id: 'acc_cash_usd', code: '110103', nameAr: 'صندوق الدولار الأمريكي', type: 'ASSET', currency: 'USD', isCashBox: true, isPostable: true, isActive: true, parentId: 'acc_1101', createdAt: new Date() },
];

const DEMO_POSTABLE_ACCOUNTS: AccountRecord[] = [
  ...DEMO_CASH_BOXES,
  { id: 'acc_bank_1', code: '110201', nameAr: 'بنك التضامن الإسلامي', type: 'ASSET', currency: 'YER', isCashBox: false, isPostable: true, isActive: true, parentId: 'acc_1102', createdAt: new Date() },
  { id: 'acc_bank_2', code: '110202', nameAr: 'بنك الكريمي الإسلامي', type: 'ASSET', currency: 'YER', isCashBox: false, isPostable: true, isActive: true, parentId: 'acc_1102', createdAt: new Date() },
  { id: 'acc_cust_1', code: '110301', nameAr: 'شركة الأمل للتجارة العامة', type: 'ASSET', currency: 'YER', isCashBox: false, isPostable: true, isActive: true, parentId: 'acc_1103', createdAt: new Date() },
  { id: 'acc_cust_2', code: '110302', nameAr: 'مؤسسة البركة للخدمات', type: 'ASSET', currency: 'YER', isCashBox: false, isPostable: true, isActive: true, parentId: 'acc_1103', createdAt: new Date() },
  { id: 'acc_supp_1', code: '210101', nameAr: 'شركة النور للتوريدات', type: 'LIABILITY', currency: 'USD', isCashBox: false, isPostable: true, isActive: true, parentId: 'acc_2101', createdAt: new Date() },
  { id: 'acc_exp_off', code: '510101', nameAr: 'مصروفات القرطاسية والمكتب', type: 'EXPENSE', currency: 'YER', isCashBox: false, isPostable: true, isActive: true, parentId: 'acc_51', createdAt: new Date() },
];

export async function getAccounts(): Promise<AccountRecord[]> {
  try {
    const client = await pool.connect();
    try {
      const res = await client.query<AccountRecord>(
        'SELECT * FROM "Account" ORDER BY code ASC'
      );
      return res.rows;
    } finally {
      client.release();
    }
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.message?.includes('connect')) {
      return DEMO_POSTABLE_ACCOUNTS;
    }
    throw err;
  }
}

export async function getAccountById(id: string): Promise<AccountRecord | null> {
  try {
    const client = await pool.connect();
    try {
      const res = await client.query<AccountRecord>(
        'SELECT * FROM "Account" WHERE id = $1',
        [id]
      );
      return res.rows[0] ?? null;
    } finally {
      client.release();
    }
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.message?.includes('connect')) {
      return DEMO_POSTABLE_ACCOUNTS.find((a) => a.id === id) ?? null;
    }
    throw err;
  }
}

export async function getPostableAccounts(): Promise<AccountRecord[]> {
  try {
    const client = await pool.connect();
    try {
      const res = await client.query<AccountRecord>(
        'SELECT * FROM "Account" WHERE "isPostable" = true AND "isActive" = true ORDER BY code ASC'
      );
      return res.rows;
    } finally {
      client.release();
    }
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.message?.includes('connect')) {
      return DEMO_POSTABLE_ACCOUNTS;
    }
    throw err;
  }
}

export async function getCashBoxes(): Promise<AccountRecord[]> {
  try {
    const client = await pool.connect();
    try {
      const res = await client.query<AccountRecord>(
        'SELECT * FROM "Account" WHERE "isCashBox" = true AND "isActive" = true ORDER BY currency ASC'
      );
      return res.rows;
    } finally {
      client.release();
    }
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.message?.includes('connect')) {
      return DEMO_CASH_BOXES;
    }
    throw err;
  }
}

export async function resolvePayee(query: string) {
  const client = await pool.connect();
  try {
    const cleanQ = query.trim();
    if (!cleanQ) {
      return { exact: null, candidates: [] };
    }

    // Exact match first
    const exactRes = await client.query<AccountRecord>(
      'SELECT * FROM "Account" WHERE "isActive" = true AND "isPostable" = true AND "nameAr" = $1 LIMIT 1',
      [cleanQ]
    );
    if (exactRes.rows.length > 0) {
      return { exact: exactRes.rows[0], candidates: [] };
    }

    // Trigram similarity match
    const fuzzyRes = await client.query<AccountRecord & { similarity: number }>(
      `
      SELECT id, code, "nameAr", type, currency, "isCashBox", "isPostable", "isActive", "parentId", "createdAt",
             similarity("nameAr", $1) AS similarity
        FROM "Account"
       WHERE "isActive" = true AND "isPostable" = true
         AND ("nameAr" % $1 OR "nameAr" ILIKE '%' || $1 || '%')
       ORDER BY similarity DESC, "nameAr" ASC
       LIMIT 5
      `,
      [cleanQ]
    );

    if (fuzzyRes.rows.length > 0 && fuzzyRes.rows[0].similarity >= 0.8) {
      return { exact: fuzzyRes.rows[0], candidates: [] };
    }

    return { exact: null, candidates: fuzzyRes.rows };
  } finally {
    client.release();
  }
}

export type CreateAccountInput = {
  nameAr: string;
  type: string;
  currency?: string;
  parentId?: string | null;
  code?: string;
  isCashBox?: boolean;
};

export async function createAccount(input: CreateAccountInput, userId: string): Promise<AccountRecord> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let code = input.code;
    // Auto-generate code if not provided
    if (!code) {
      let baseCode = '1103'; // default to receivables
      if (input.parentId) {
        const parentRes = await client.query<{ code: string }>(
          'SELECT code FROM "Account" WHERE id = $1',
          [input.parentId]
        );
        if (parentRes.rows.length > 0) {
          baseCode = parentRes.rows[0].code;
        }
      } else {
        switch (input.type) {
          case 'ASSET':
            baseCode = '1103';
            break;
          case 'LIABILITY':
            baseCode = '2101';
            break;
          case 'EQUITY':
            baseCode = '3101';
            break;
          case 'REVENUE':
            baseCode = '4101';
            break;
          case 'EXPENSE':
            baseCode = '5101';
            break;
        }
      }

      // Find max code with this prefix
      const maxCodeRes = await client.query<{ max_code: string }>(
        'SELECT MAX(code) as max_code FROM "Account" WHERE code LIKE $1',
        [`${baseCode}%`]
      );
      const maxCode = maxCodeRes.rows[0]?.max_code;
      if (maxCode && maxCode.length >= baseCode.length + 2) {
        const numPart = parseInt(maxCode.slice(baseCode.length), 10) || 0;
        code = `${baseCode}${String(numPart + 1).padStart(2, '0')}`;
      } else {
        code = `${baseCode}01`;
      }
    }

    const id = `acc_${randomUUID().slice(0, 8)}`;
    const currency = input.currency || 'YER';
    const isCashBox = !!input.isCashBox;
    const parentId = input.parentId || null;

    const res = await client.query<AccountRecord>(
      `
      INSERT INTO "Account" (id, code, "nameAr", type, currency, "isCashBox", "isPostable", "isActive", "parentId")
      VALUES ($1, $2, $3, $4, $5, $6, true, true, $7)
      RETURNING *
      `,
      [id, code, input.nameAr, input.type, currency, isCashBox, parentId]
    );

    const created = res.rows[0];

    // Audit log
    await client.query(
      `
      INSERT INTO "AuditLog" (id, "userId", action, entity, "entityId", after, reason)
      VALUES ($1, $2, 'ACCOUNT_CREATE', 'Account', $3, $4, 'إنشاء حساب جديد')
      `,
      [`aud_${randomUUID().slice(0, 8)}`, userId, created.id, JSON.stringify(created)]
    );

    await client.query('COMMIT');
    return created;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
