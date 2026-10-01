'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function switchUserAction(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set('auth_user_id', userId, { path: '/', httpOnly: true });
  revalidatePath('/');
  return { ok: true };
}
