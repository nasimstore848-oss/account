import { AppShell } from '@/components/layout/AppShell';
import { VoucherListPageClient } from '@/features/vouchers/components/VoucherListPageClient';
import { getCurrentUser } from '@/lib/auth';
import { getCashBoxes, getPostableAccounts } from '@/server/repositories/account.repo';
import { listVouchers, DocStatus } from '@/server/services/voucher.service';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    status?: DocStatus | 'ALL';
    search?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function PaymentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const currentUser = await getCurrentUser();
  const cashBoxes = await getCashBoxes();
  const postableAccounts = await getPostableAccounts();

  const { rows, total } = await listVouchers({
    type: 'PAYMENT',
    status: params.status,
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
      <VoucherListPageClient
        type="PAYMENT"
        vouchers={rows}
        total={total}
        cashBoxes={cashBoxes}
        postableAccounts={postableAccounts}
        initialFilters={params}
      />
    </AppShell>
  );
}
