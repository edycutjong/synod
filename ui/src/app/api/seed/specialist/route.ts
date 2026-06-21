import { NextResponse } from 'next/server';
import { readDb, writeDb, addTelemetryLog } from '@/lib/db';
import * as crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const spec = await request.json();
    if (!spec.id) {
      return NextResponse.json({ error: 'Missing specialist ID' }, { status: 400 });
    }

    const db = readDb();
    // Check if it already exists, if so update it, else push
    const idx = db.specialists.findIndex(s => s.id === spec.id);
    if (idx >= 0) {
      db.specialists[idx] = { ...db.specialists[idx], ...spec };
    } else {
      db.specialists.push({
        stakedBalance: 1000 * 10**6, // Default 1000 USDC
        isActive: true,
        totalEvaluations: 0,
        totalSlashes: 0,
        address: `0x${crypto.randomBytes(20).toString('hex')}`,
        ...spec
      });
    }

    writeDb(db);
    addTelemetryLog('agent', `Seeded specialist ${spec.id} successfully`);
    return NextResponse.json({ status: 'seeded', id: spec.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
