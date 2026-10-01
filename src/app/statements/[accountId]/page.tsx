import { notFound } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getCurrentUser } from '@/lib/auth';
import { getCashBoxes, getPostableAccounts } from '@/server/repositories/account.repo';
import { getAccountStatement } from '@/server/services/statement.service';
import { StatementClient } from '@/features/statements/StatementClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ accountId: string }>;
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}

export default async function AccountStatementDetailPage({ params, searchParams }: PageProps) {
  const { accountId } = await params;
  const { startDate, endDate } = await searchParams;

  const currentUser = await getCurrentUser();
  const cashBoxes = await getCashBoxes();
  const postableAccounts = await getPostableAccounts();

  let statement;
  try {
    statement = await getAccountStatement(accountId, startDate, endDate);
  } catch {
    notFound();
  }

  return (
    <AppShell
      currentUser={currentUser}
      cashBoxes={cashBoxes}
      postableAccounts={postableAccounts}
    >
      <StatementClient statement={statement} accounts={postableAccounts} />
    </AppShell>
  );
}
