import { NextRequest, NextResponse } from 'next/server';
import { resolvePayee } from '@/server/repositories/account.repo';

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q') || '';
    if (!q.trim()) {
      return NextResponse.json({ exact: null, candidates: [] });
    }

    const result = await resolvePayee(q);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
