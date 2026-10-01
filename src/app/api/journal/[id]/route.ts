import { NextRequest, NextResponse } from 'next/server';
import { getJournalEntryWithLines } from '@/server/services/journal.service';

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const data = await getJournalEntryWithLines(id);
    if (!data) {
      return NextResponse.json({ error: 'القيد غير موجود' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
