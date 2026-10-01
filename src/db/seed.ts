import { pool } from './index';
import { applyConstraints } from './apply-constraints';

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clear existing data safely
    await client.query('DELETE FROM "AuditLog"');
    await client.query('DELETE FROM "VoucherLine"');
    await client.query('DELETE FROM "Voucher"');
    await client.query('DELETE FROM "JournalEntryLine"');
    await client.query('DELETE FROM "JournalEntry"');
    await client.query('DELETE FROM "DocumentSequence"');
    await client.query('DELETE FROM "Account"');
    await client.query('DELETE FROM "User"');

    // 1. Users
    const adminUser = await client.query(`
      INSERT INTO "User" (id, email, name, "passwordHash", role)
      VALUES 
        ('usr_admin_1', 'jamal@company.local', 'جمال قبيضة (المدير)', 'admin123', 'ADMIN'),
        ('usr_acc_1', 'sami@company.local', 'سامي العراسي (المحاسب)', 'acc123', 'ACCOUNTANT'),
        ('usr_viewer_1', 'hisham@company.local', 'هشام العراسي (مشاهد)', 'view123', 'VIEWER')
      RETURNING id, email, role
    `);

    const adminId = 'usr_admin_1';
    const accId = 'usr_acc_1';

    // 2. Chart of Accounts
    // Level 1: Main categories (non-postable)
    await client.query(`
      INSERT INTO "Account" (id, code, "nameAr", type, currency, "isCashBox", "isPostable", "isActive", "parentId")
      VALUES
        ('acc_1', '1', 'الأصول', 'ASSET', 'YER', false, false, true, NULL),
        ('acc_2', '2', 'الخصوم والالتزامات', 'LIABILITY', 'YER', false, false, true, NULL),
        ('acc_3', '3', 'حقوق الملكية', 'EQUITY', 'YER', false, false, true, NULL),
        ('acc_4', '4', 'الإيرادات', 'REVENUE', 'YER', false, false, true, NULL),
        ('acc_5', '5', 'المصروفات', 'EXPENSE', 'YER', false, false, true, NULL);
    `);

    // Level 2 & 3: Sub categories
    await client.query(`
      INSERT INTO "Account" (id, code, "nameAr", type, currency, "isCashBox", "isPostable", "isActive", "parentId")
      VALUES
        ('acc_11', '11', 'الأصول المتداولة', 'ASSET', 'YER', false, false, true, 'acc_1'),
        ('acc_1101', '1101', 'النقدية وما في حكمها', 'ASSET', 'YER', false, false, true, 'acc_11'),
        ('acc_1102', '1102', 'البنوك', 'ASSET', 'YER', false, false, true, 'acc_11'),
        ('acc_1103', '1103', 'العملاء والمدينون', 'ASSET', 'YER', false, false, true, 'acc_11'),
        
        ('acc_21', '21', 'الخصوم المتداولة', 'LIABILITY', 'YER', false, false, true, 'acc_2'),
        ('acc_2101', '2101', 'الموردون والدائنون', 'LIABILITY', 'YER', false, false, true, 'acc_21'),
        
        ('acc_31', '31', 'رأس المال والاحتياطيات', 'EQUITY', 'YER', false, false, true, 'acc_3'),
        
        ('acc_41', '41', 'إيرادات النشاط الرئيسي', 'REVENUE', 'YER', false, false, true, 'acc_4'),
        ('acc_42', '42', 'إيرادات أخرى', 'REVENUE', 'YER', false, false, true, 'acc_4'),
        
        ('acc_51', '51', 'المصروفات التشغيلية والإدارية', 'EXPENSE', 'YER', false, false, true, 'acc_5');
    `);

    // Level 4: Postable Accounts (Cash Boxes, Banks, Customers, Suppliers, Expenses)
    // Note: Only one guarded cash box per currency!
    await client.query(`
      INSERT INTO "Account" (id, code, "nameAr", type, currency, "isCashBox", "isPostable", "isActive", "parentId")
      VALUES
        -- Cash Boxes (guarded)
        ('acc_cash_yer', '110101', 'الصندوق الرئيسي (ريال يمني)', 'ASSET', 'YER', true, true, true, 'acc_1101'),
        ('acc_cash_sar', '110102', 'صندوق الريال السعودي', 'ASSET', 'SAR', true, true, true, 'acc_1101'),
        ('acc_cash_usd', '110103', 'صندوق الدولار الأمريكي', 'ASSET', 'USD', true, true, true, 'acc_1101'),
        
        -- Banks
        ('acc_bank_1', '110201', 'بنك التضامن الإسلامي', 'ASSET', 'YER', false, true, true, 'acc_1102'),
        ('acc_bank_2', '110202', 'بنك الكريمي الإسلامي', 'ASSET', 'YER', false, true, true, 'acc_1102'),
        
        -- Customers (Receivables)
        ('acc_cust_1', '110301', 'شركة الأمل للتجارة العامة', 'ASSET', 'YER', false, true, true, 'acc_1103'),
        ('acc_cust_2', '110302', 'مؤسسة البركة للخدمات', 'ASSET', 'YER', false, true, true, 'acc_1103'),
        ('acc_cust_3', '110303', 'علي محمد الوجيه', 'ASSET', 'YER', false, true, true, 'acc_1103'),
        ('acc_cust_4', '110304', 'سامي خالد المشرقي', 'ASSET', 'YER', false, true, true, 'acc_1103'),
        
        -- Suppliers (Payables)
        ('acc_supp_1', '210101', 'شركة النور للتوريدات الإلكترونية', 'LIABILITY', 'YER', false, true, true, 'acc_2101'),
        ('acc_supp_2', '210102', 'مؤسسة الوفاق للخدمات المكتبية', 'LIABILITY', 'YER', false, true, true, 'acc_2101'),
        ('acc_supp_3', '210103', 'علي سالم (مورد مستلزمات)', 'LIABILITY', 'YER', false, true, true, 'acc_2101'),
        ('acc_supp_4', '210104', 'مكتب الصالحي للإيجارات', 'LIABILITY', 'YER', false, true, true, 'acc_2101'),
        
        -- Equity
        ('acc_cap_1', '310101', 'رأس المال المدفوع', 'EQUITY', 'YER', false, true, true, 'acc_31'),
        ('acc_cap_2', '310102', 'الأرباح المبقاة والمدورة', 'EQUITY', 'YER', false, true, true, 'acc_31'),
        
        -- Revenue
        ('acc_rev_1', '410101', 'إيراد مبيعات المنتجات', 'REVENUE', 'YER', false, true, true, 'acc_41'),
        ('acc_rev_2', '410102', 'إيرادات الاستشارات والخدمات الفنية', 'REVENUE', 'YER', false, true, true, 'acc_41'),
        ('acc_rev_3', '420101', 'أرباح فروق عملات متنوعة', 'REVENUE', 'YER', false, true, true, 'acc_42'),
        
        -- Expense
        ('acc_exp_rent', '510101', 'مصروف الإيجار السنوي', 'EXPENSE', 'YER', false, true, true, 'acc_51'),
        ('acc_exp_sal',  '510102', 'مصروف الرواتب والأجور', 'EXPENSE', 'YER', false, true, true, 'acc_51'),
        ('acc_exp_util', '510103', 'مصروفات الكهرباء والماء والهاتف', 'EXPENSE', 'YER', false, true, true, 'acc_51'),
        ('acc_exp_off',  '510104', 'مصروفات القرطاسية والضيافة', 'EXPENSE', 'YER', false, true, true, 'acc_51'),
        ('acc_exp_maint','510105', 'مصروفات الصيانة والنظافة', 'EXPENSE', 'YER', false, true, true, 'acc_51');
    `);

    const currentYear = new Date().getFullYear();

    // 3. Initial Sequences
    await client.query(`
      INSERT INTO "DocumentSequence" (scope, "fiscalYear", "lastValue")
      VALUES
        ('RECEIPT', ${currentYear}, 3),
        ('PAYMENT', ${currentYear}, 2),
        ('JOURNAL', ${currentYear}, 1);
    `);

    // 4. Initial Vouchers
    // Receipt 1: Capital injection 5,000,000 YER into main cash box
    await client.query(`
      INSERT INTO "Voucher" (id, type, "fiscalYear", serial, "voucherDate", status, currency, amount, description, "cashAccountId", "counterpartyAccountId", "createdById")
      VALUES (
        'v_rcpt_1', 'RECEIPT', ${currentYear}, 1, '${currentYear}-01-02', 'POSTED', 'YER', 5000000.00,
        'إيداع حصة رأس المال التأسيسي نقداً في الصندوق الرئيسي',
        'acc_cash_yer', 'acc_cap_1', '${adminId}'
      );
    `);
    await client.query(`
      INSERT INTO "VoucherLine" (id, "voucherId", "lineNo", "accountId", debit, credit, memo)
      VALUES
        ('vl_r1_1', 'v_rcpt_1', 1, 'acc_cash_yer', 5000000.00, 0.00, 'قبض نقدي رأس مال'),
        ('vl_r1_2', 'v_rcpt_1', 2, 'acc_cap_1', 0.00, 5000000.00, 'قيد رأس المال المدفوع');
    `);

    // Receipt 2: Customer payment 850,000 YER from Al-Amal
    await client.query(`
      INSERT INTO "Voucher" (id, type, "fiscalYear", serial, "voucherDate", status, currency, amount, description, "cashAccountId", "counterpartyAccountId", "createdById")
      VALUES (
        'v_rcpt_2', 'RECEIPT', ${currentYear}, 2, '${currentYear}-01-10', 'POSTED', 'YER', 850000.00,
        'دفعة نقدية تحت الحساب عن مبيعات توريدات مكتبية',
        'acc_cash_yer', 'acc_cust_1', '${accId}'
      );
    `);
    await client.query(`
      INSERT INTO "VoucherLine" (id, "voucherId", "lineNo", "accountId", debit, credit, memo)
      VALUES
        ('vl_r2_1', 'v_rcpt_2', 1, 'acc_cash_yer', 850000.00, 0.00, 'قبض دفعة من العميل'),
        ('vl_r2_2', 'v_rcpt_2', 2, 'acc_cust_1', 0.00, 850000.00, 'سداد حساب العميل شركة الأمل');
    `);

    // Receipt 3: Consulting service revenue 300,000 YER from Ali Al-Wajeeh
    await client.query(`
      INSERT INTO "Voucher" (id, type, "fiscalYear", serial, "voucherDate", status, currency, amount, description, "cashAccountId", "counterpartyAccountId", "createdById")
      VALUES (
        'v_rcpt_3', 'RECEIPT', ${currentYear}, 3, '${currentYear}-01-15', 'POSTED', 'YER', 300000.00,
        'استلام قيمة استشارات فنية وحلول تقنية',
        'acc_cash_yer', 'acc_cust_3', '${accId}'
      );
    `);
    await client.query(`
      INSERT INTO "VoucherLine" (id, "voucherId", "lineNo", "accountId", debit, credit, memo)
      VALUES
        ('vl_r3_1', 'v_rcpt_3', 1, 'acc_cash_yer', 300000.00, 0.00, 'قبض نقدي'),
        ('vl_r3_2', 'v_rcpt_3', 2, 'acc_cust_3', 0.00, 300000.00, 'إيراد استشارات');
    `);

    // Payment 1: Rent Payment 350,000 YER to مكتب الصالحي
    await client.query(`
      INSERT INTO "Voucher" (id, type, "fiscalYear", serial, "voucherDate", status, currency, amount, description, "cashAccountId", "counterpartyAccountId", "createdById")
      VALUES (
        'v_pay_1', 'PAYMENT', ${currentYear}, 1, '${currentYear}-01-05', 'POSTED', 'YER', 350000.00,
        'سداد إيجار المقر الرئيسي للربع الأول',
        'acc_cash_yer', 'acc_exp_rent', '${adminId}'
      );
    `);
    await client.query(`
      INSERT INTO "VoucherLine" (id, "voucherId", "lineNo", "accountId", debit, credit, memo)
      VALUES
        ('vl_p1_1', 'v_pay_1', 1, 'acc_cash_yer', 0.00, 350000.00, 'صرف نقدي من الصندوق'),
        ('vl_p1_2', 'v_pay_1', 2, 'acc_exp_rent', 350000.00, 0.00, 'مصروف إيجار المقر');
    `);

    // Payment 2: Office Supplies 85,000 YER to مؤسسة الوفاق
    await client.query(`
      INSERT INTO "Voucher" (id, type, "fiscalYear", serial, "voucherDate", status, currency, amount, description, "cashAccountId", "counterpartyAccountId", "createdById")
      VALUES (
        'v_pay_2', 'PAYMENT', ${currentYear}, 2, '${currentYear}-01-18', 'POSTED', 'YER', 85000.00,
        'شراء قرطاسية ومستلزمات مكتبية وأحبار طابعات',
        'acc_cash_yer', 'acc_supp_2', '${accId}'
      );
    `);
    await client.query(`
      INSERT INTO "VoucherLine" (id, "voucherId", "lineNo", "accountId", debit, credit, memo)
      VALUES
        ('vl_p2_1', 'v_pay_2', 1, 'acc_cash_yer', 0.00, 85000.00, 'صرف نقدي مشتريات'),
        ('vl_p2_2', 'v_pay_2', 2, 'acc_supp_2', 85000.00, 0.00, 'مستحقات مؤسسة الوفاق');
    `);

    // 5. Initial Journal Entry (General Journal)
    await client.query(`
      INSERT INTO "JournalEntry" (id, kind, "fiscalYear", serial, "entryDate", status, description, "createdById")
      VALUES (
        'je_1', 'GENERAL', ${currentYear}, 1, '${currentYear}-01-20', 'POSTED',
        'إثبات استحقاق رواتب الموظفين لشهر يناير وتوزيعها', '${adminId}'
      );
    `);
    await client.query(`
      INSERT INTO "JournalEntryLine" (id, "entryId", "lineNo", "accountId", debit, credit, memo)
      VALUES
        ('jel_1_1', 'je_1', 1, 'acc_exp_sal', 600000.00, 0.00, 'إثبات مصروف الرواتب لشهر يناير'),
        ('jel_1_2', 'je_1', 2, 'acc_bank_1', 0.00, 600000.00, 'صرف الرواتب تحويلاً عبر بنك التضامن');
    `);

    // 6. Audit Logs
    await client.query(`
      INSERT INTO "AuditLog" (id, "userId", action, entity, "entityId", before, after, reason)
      VALUES 
        ('aud_1', '${adminId}', 'CREATE', 'Voucher', 'v_rcpt_1', NULL, '{"serial": 1, "type": "RECEIPT", "amount": 5000000.00}', 'سند تأسيسي'),
        ('aud_2', '${adminId}', 'CREATE', 'Voucher', 'v_pay_1', NULL, '{"serial": 1, "type": "PAYMENT", "amount": 350000.00}', 'إيجار'),
        ('aud_3', '${accId}', 'CREATE', 'Voucher', 'v_rcpt_2', NULL, '{"serial": 2, "type": "RECEIPT", "amount": 850000.00}', 'مقبوضات عميل');
    `);

    await client.query('COMMIT');
    console.log('Seeding completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding error:', err);
    throw err;
  } finally {
    client.release();
  }

  // تطبيق القيود والمشغلات تلقائياً بعد اكتمال البيانات
  await applyConstraints();
}

seed()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(err);
    await pool.end();
    process.exit(1);
  });
