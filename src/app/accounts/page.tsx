import { AppShell } from '@/components/layout/AppShell';
import { AccountsTreeClient } from '@/features/accounts/components/AccountsTreeClient';
import { getCurrentUser } from '@/lib/auth';
import { getAccounts, getCashBoxes, getPostableAccounts } from '@/server/repositories/account.repo';

export const dynamic = 'force-dynamic';

export default async function AccountsPage() {
  const currentUser = await getCurrentUser();
  const allAccounts = await getAccounts();
  const cashBoxes = await getCashBoxes();
  const postableAccounts = await getPostableAccounts();

  return (
    <AppShell
      currentUser={currentUser}
      cashBoxes={cashBoxes}
      postableAccounts={postableAccounts}
    >
      <AccountsTreeClient accounts={allAccounts} />
    </AppShell>
  );
}
