'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { InsufficientCashError } from '@/lib/errors';
import { requireUser } from '@/lib/auth';
import { createJournalEntry, voidJournalEntry } from '../services/journal.service';

const journalLineSchema = z.object({
  accountId: z.string().min(1, 'الحساب مطلوب'),
  debit: z.string().default('0'),
  credit: z.string().default('0'),
  memo: z.string().optional(),
});

const journalSchema = z.object({
  kind: z.enum(['GENERAL', 'OPENING', 'ADJUSTING']).default('GENERAL'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'صيغة التاريخ غير صحيحة'),
  description: z.string().max(500).optional(),
  lines: z.array(journalLineSchema).min(2, 'يجب إدخال سطرين على الأقل للقيد'),
});

export async function createJournalAction(raw: unknown) {
  try {
    const user = await requireUser(['ADMIN', 'ACCOUNTANT']);
    const parsed = journalSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message || 'بيانات غير صالحة' };
    }

    const entry = await createJournalEntry(parsed.data, user.id);
    revalidatePath('/journal');
    revalidatePath('/dashboard');
    return { ok: true as const, id: entry.id, serial: entry.serial };
  } catch (e: any) {
    if (e instanceof InsufficientCashError || e?.code === 'NEGATIVE_CASH') {
      return { ok: false as const, error: e.message, code: 'NEGATIVE_CASH' };
    }
    return { ok: false as const, error: e?.message || 'حدث خطأ أثناء حفظ القيد' };
  }
}

const voidJournalSchema = z.object({
  id: z.string().min(1, 'معرف القيد مطلوب'),
  reason: z.string().min(3, 'سبب الإلغاء مطلوب'),
});

export async function voidJournalAction(raw: unknown) {
  try {
    const user = await requireUser(['ADMIN']);
    const parsed = voidJournalSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message || 'بيانات غير صالحة' };
    }

    const entry = await voidJournalEntry(parsed.data.id, parsed.data.reason, user.id);
    revalidatePath('/journal');
    return { ok: true as const, id: entry.id };
  } catch (e: any) {
    if (e instanceof InsufficientCashError || e?.code === 'NEGATIVE_CASH') {
      return { ok: false as const, error: e.message, code: 'NEGATIVE_CASH' };
    }
    return { ok: false as const, error: e?.message || 'حدث خطأ أثناء إلغاء القيد' };
  }
}
