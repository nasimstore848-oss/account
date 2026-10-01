import { NextRequest, NextResponse } from 'next/server';
import { listVouchers, createVoucher, VoucherType, DocStatus } from '@/server/services/voucher.service';
import { getCurrentUser } from '@/lib/auth';
import { InsufficientCashError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const type = (searchParams.get('type') as VoucherType) || undefined;
    const status = (searchParams.get('status') as DocStatus | 'ALL') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const search = searchParams.get('search') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const data = await listVouchers({
      type,
      status,
      startDate,
      endDate,
      search,
      limit,
      offset,
    });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (user.role === 'VIEWER') {
      return NextResponse.json({ error: 'صلاحيات مشاهد فقط لا تكفي لإنشاء السندات' }, { status: 403 });
    }

    const body = await req.json();
    const voucher = await createVoucher(body, user.id);
    return NextResponse.json({ ok: true, voucher }, { status: 201 });
  } catch (err: any) {
    if (err instanceof InsufficientCashError) {
      return NextResponse.json({ error: err.message, code: 'NEGATIVE_CASH' }, { status: 400 });
    }
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
