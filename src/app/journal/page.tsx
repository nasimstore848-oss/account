import { AppShell } from '@/components/layout/AppShell';
import { JournalPageClient } from '@/features/journal/components/JournalPageClient';
import { getCurrentUser } from '@/lib/auth';
import { getCashBoxes, getPostableAccounts } from '@/server/repositories/account.repo';
import { listJournalEntries } from '@/server/services/journal.service';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    search?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function JournalPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const currentUser = await getCurrentUser();
  const cashBoxes = await getCashBoxes();
  const postableAccounts = await getPostableAccounts();

  const entries = await listJournalEntries({
    search: params.search,
    startDate: params.startDate,
    endDate: params.endDate,
  });

  return (
    <AppShell
      currentUser={currentUser}
      cashBoxes={cashBoxes}
      postableAccounts={postableAccounts}
    >
      <JournalPageClient
        entries={entries}
        postableAccounts={postableAccounts}
        initialFilters={params}
      />
    </AppShell>
  );
}
