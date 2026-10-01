'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { createAccount, CreateAccountInput } from '../repositories/account.repo';

const accountSchema = z.object({
  nameAr: z.string().min(2, 'اسم الحساب يجب ألا يقل عن حرفين'),
  type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']),
  currency: z.string().default('YER'),
  parentId: z.string().nullable().optional(),
  code: z.string().optional(),
  isCashBox: z.boolean().default(false),
});

export async function createAccountAction(raw: unknown) {
  try {
    const user = await requireUser(['ADMIN', 'ACCOUNTANT']);
    const parsed = accountSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message || 'بيانات غير صالحة' };
    }

    const acc = await createAccount(parsed.data as CreateAccountInput, user.id);
    revalidatePath('/accounts');
    revalidatePath('/vouchers');
    return { ok: true as const, account: acc };
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'تعذر إنشاء الحساب' };
  }
}
