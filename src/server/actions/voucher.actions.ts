'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { InsufficientCashError } from '@/lib/errors';
import { requireUser } from '@/lib/auth';
import { createVoucher, updateVoucher, voidVoucher } from '../services/voucher.service';

const voucherSchema = z.object({
  type: z.enum(['RECEIPT', 'PAYMENT']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'صيغة التاريخ غير صحيحة (YYYY-MM-DD)'),
  amount: z
    .string()
    .regex(/^\d{1,16}(\.\d{1,2})?$/, 'المبلغ غير صحيح')
    .refine((v) => Number(v) > 0, 'المبلغ يجب أن يكون أكبر من صفر'),
  currency: z.string().length(3, 'رمز العملة يتكون من 3 أحرف'),
  cashAccountId: z.string().min(1, 'يرجى اختيار الصندوق النقدي'),
  counterpartyAccountId: z.string().min(1, 'يرجى اختيار الحساب المقابل'),
  description: z.string().max(500, 'البيان لا يتجاوز 500 حرف').optional(),
});

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Graceful fallback outside Next.js request context (CLI/tests)
  }
}

export async function createVoucherAction(raw: unknown) {
  try {
    const user = await requireUser(['ADMIN', 'ACCOUNTANT']);
    const parsed = voucherSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message || 'بيانات غير صالحة' };
    }

    const v = await createVoucher(parsed.data, user.id);
    safeRevalidate('/vouchers');
    safeRevalidate('/dashboard');
    return { ok: true as const, id: v.id, serial: v.serial };
  } catch (e: any) {
    if (e instanceof InsufficientCashError || e?.code === 'NEGATIVE_CASH') {
      return { ok: false as const, error: e.message, code: 'NEGATIVE_CASH' };
    }
    return { ok: false as const, error: e?.message || 'حدث خطأ أثناء حفظ السند' };
  }
}

export async function updateVoucherAction(id: string, raw: unknown) {
  try {
    const user = await requireUser(['ADMIN', 'ACCOUNTANT']);
    const parsed = voucherSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message || 'بيانات غير صالحة' };
    }

    const v = await updateVoucher(id, parsed.data, user.id);
    safeRevalidate('/vouchers');
    safeRevalidate('/dashboard');
    return { ok: true as const, id: v.id, serial: v.serial };
  } catch (e: any) {
    if (e instanceof InsufficientCashError || e?.code === 'NEGATIVE_CASH') {
      return { ok: false as const, error: e.message, code: 'NEGATIVE_CASH' };
    }
    return { ok: false as const, error: e?.message || 'حدث خطأ أثناء تعديل السند' };
  }
}

const voidSchema = z.object({
  id: z.string().min(1, 'معرف السند مطلوب'),
  reason: z.string().min(3, 'يرجى كتابة سبب الإلغاء بشكل واضح'),
});

export async function voidVoucherAction(raw: unknown) {
  try {
    const user = await requireUser(['ADMIN']); // Voiding restricted to ADMIN
    const parsed = voidSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message || 'بيانات غير صالحة' };
    }

    const v = await voidVoucher(parsed.data.id, parsed.data.reason, user.id);
    safeRevalidate('/vouchers');
    safeRevalidate('/dashboard');
    return { ok: true as const, id: v.id, status: v.status };
  } catch (e: any) {
    if (e instanceof InsufficientCashError || e?.code === 'NEGATIVE_CASH') {
      return { ok: false as const, error: e.message, code: 'NEGATIVE_CASH' };
    }
    return { ok: false as const, error: e?.message || 'حدث خطأ أثناء إلغاء السند' };
  }
}
