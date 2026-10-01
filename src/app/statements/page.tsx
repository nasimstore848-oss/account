import { redirect } from 'next/navigation';
import { getPostableAccounts } from '@/server/repositories/account.repo';

export const dynamic = 'force-dynamic';

export default async function StatementsPage() {
  const postableAccounts = await getPostableAccounts();

  if (!postableAccounts || postableAccounts.length === 0) {
    redirect('/');
  }

  const firstAccount = postableAccounts[0];
  redirect(`/statements/${firstAccount.id}`);
}
