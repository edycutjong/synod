import { NextResponse } from 'next/server';
import { readDb, writeDb, addTelemetryLog } from '@/lib/db';
import * as crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recipient_account, amount } = body;

    addTelemetryLog('agent', `Integrations Payout: Webhook triggered. Processing payout of $${amount} to ${recipient_account}`);

    if (!recipient_account || amount === undefined) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const db = readDb();
    
    // Find matching payout in db to retrieve payoutId
    let payoutId = `payout_gen_${Date.now()}`;
    if (db.payouts) {
      for (const [id, details] of Object.entries(db.payouts)) {
        if (details.amount === amount && details.recipient === recipient_account) {
          payoutId = id;
          break;
        }
      }
    }

    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    
    db.dispatchedPayouts.push({
      payoutId,
      recipient: recipient_account,
      amount,
      txHash,
      timestamp: Date.now()
    });
    
    writeDb(db);

    addTelemetryLog('agent', `Integrations Payout: Webhook execution successful. TxHash: ${txHash}`);
    return NextResponse.json({ status: 'success', txHash }, { status: 201 });
  } catch (error: any) {
    addTelemetryLog('agent', `Integrations Payout Error: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
