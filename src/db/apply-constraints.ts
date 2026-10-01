import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function applyConstraints() {
  const client = await pool.connect();
  try {
    const sqlPath = path.join(__dirname, 'constraints.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('⚡ جاري تطبيق القيود والمشغلات وفهارس البحث الصوتي من constraints.sql...');
    await client.query(sql);
    console.log('✓ تم تطبيق القيود والمشغلات (assert_balanced, account_name_trgm, one_cash_per_ccy) بنجاح!');
  } catch (err) {
    console.error('✗ فشل في تطبيق القيود وقواعد البيانات:', err);
    throw err;
  } finally {
    client.release();
  }
}

// تشغيل مباشر عبر السكربت (CLI)
const isDirectExecution =
  process.argv[1] &&
  (fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) ||
    process.argv[1].replace(/\\/g, '/').endsWith('src/db/apply-constraints.ts'));

if (isDirectExecution) {
  applyConstraints()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error(err);
      await pool.end();
      process.exit(1);
    });
}
