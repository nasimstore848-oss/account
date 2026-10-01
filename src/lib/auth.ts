import { pool } from '@/db';
import { cookies } from 'next/headers';
import { UnauthorizedError } from './errors';

export type UserRole = 'ADMIN' | 'ACCOUNTANT' | 'VIEWER';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export async function getCurrentUser(): Promise<AuthUser> {
  let userId = 'usr_admin_1';
  try {
    const cookieStore = await cookies();
    userId = cookieStore.get('auth_user_id')?.value || 'usr_admin_1';
  } catch {
    // Outside Next.js request context (CLI/Tests)
    userId = process.env.CURRENT_TEST_USER_ID || 'usr_admin_1';
  }

  // Predefined role override for CLI test runner
  if (process.env.CURRENT_TEST_USER_ROLE) {
    const testRole = process.env.CURRENT_TEST_USER_ROLE as UserRole;
    return {
      id: userId,
      email: `${testRole.toLowerCase()}@accounting.local`,
      name: `مستخدم تجريبي (${testRole})`,
      role: testRole,
    };
  }

  try {
    const client = await pool.connect();
    try {
      const res = await client.query<AuthUser>(
        'SELECT id, email, name, role FROM "User" WHERE id = $1 LIMIT 1',
        [userId]
      );
      if (res.rows.length > 0) {
        return res.rows[0];
      }

      // Fallback to first admin
      const fallback = await client.query<AuthUser>(
        'SELECT id, email, name, role FROM "User" ORDER BY id LIMIT 1'
      );
      if (fallback.rows.length > 0) {
        return fallback.rows[0];
      }
    } finally {
      client.release();
    }
  } catch {
    // Fallback if DB is temporarily offline
    if (userId === 'usr_viewer_1') {
      return { id: 'usr_viewer_1', email: 'hisham@company.local', name: 'هشام العراسي (مشاهد)', role: 'VIEWER' };
    }
    if (userId === 'usr_acc_1') {
      return { id: 'usr_acc_1', email: 'sami@company.local', name: 'سامي العراسي (المحاسب)', role: 'ACCOUNTANT' };
    }
  }

  return {
    id: 'usr_admin_1',
    email: 'jamal@company.local',
    name: 'جمال قبيضة (المدير)',
    role: 'ADMIN',
  };
}

export async function requireUser(allowedRoles: UserRole[] = ['ADMIN', 'ACCOUNTANT']): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!allowedRoles.includes(user.role)) {
    throw new UnauthorizedError(`الدور الخاص بك (${user.role}) لا يملك صلاحية تنفيذ هذا الإجراء.`);
  }
  return user;
}
