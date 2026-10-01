import { AppShell } from '@/components/layout/AppShell';
import { getCurrentUser } from '@/lib/auth';
import { getCashBoxes, getPostableAccounts } from '@/server/repositories/account.repo';
import { listAuditLogs } from '@/server/services/audit.service';
import { AuditPageClient } from '@/features/audit/AuditPageClient';

export const dynamic = 'force-dynamic';

export default async function AuditPage() {
  const currentUser = await getCurrentUser();
  const cashBoxes = await getCashBoxes();
  const postableAccounts = await getPostableAccounts();
  const logs = await listAuditLogs(100);

  return (
    <AppShell
      currentUser={currentUser}
      cashBoxes={cashBoxes}
      postableAccounts={postableAccounts}
    >
      <AuditPageClient initialLogs={logs} />
    </AppShell>
  );
}
