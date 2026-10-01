import { db, pool } from "@/db";
import { auditLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export type AuditAction = 'CREATE' | 'UPDATE' | 'VOID' | 'LOGIN' | 'ACCOUNT_CREATE';
export type AuditEntity = 'Voucher' | 'JournalEntry' | 'Account' | 'User';

export async function logAuditEvent(params: {
  userId: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  reason?: string;
}) {
  try {
    await db.insert(auditLogs).values({
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      at: new Date(),
      userId: params.userId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      before: params.before || null,
      after: params.after || null,
      reason: params.reason || null,
    });
  } catch (error) {
    console.error("فشل في تسجيل حدث التدقيق:", error);
  }
}

export async function getAuditLogs(limit = 100) {
  return await db.query.auditLogs.findMany({
    orderBy: [desc(auditLogs.at)],
    limit,
    with: {
      user: {
        columns: {
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
}

export type AuditLogRow = {
  id: string;
  at: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  before: any;
  after: any;
  reason: string | null;
};

export async function listAuditLogs(limit = 100): Promise<AuditLogRow[]> {
  try {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `
        SELECT a.id, a.at::text, a."userId", u.name as "userName",
               a.action, a.entity, a."entityId", a.before, a.after, a.reason
          FROM "AuditLog" a
          JOIN "User" u ON u.id = a."userId"
         ORDER BY a.at DESC
         LIMIT $1
        `,
        [limit]
      );
      return res.rows;
    } finally {
      client.release();
    }
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.message?.includes('connect')) {
      return [];
    }
    throw err;
  }
}
