import { NextResponse } from 'next/server';
import { readDb, writeDb, addTelemetryLog } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const payout = await request.json();
    if (!payout.id) {
      return NextResponse.json({ error: 'Missing payout ID' }, { status: 400 });
    }

    const db = readDb();
    db.payouts[payout.id] = payout;
    writeDb(db);
    
    addTelemetryLog('agent', `Seeded payout ${payout.id} successfully`);
    return NextResponse.json({ status: 'seeded', id: payout.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
