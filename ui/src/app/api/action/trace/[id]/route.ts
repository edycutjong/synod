import { NextResponse } from 'next/server';
import { addTelemetryLog } from '@/lib/db';
import * as coordinator from '@/lib/wasm/coordinator/coordinator.js';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const actionId = params.id;
  if (!actionId) {
    return NextResponse.json({ error: 'Missing action ID' }, { status: 400 });
  }

  addTelemetryLog('agent', `Fetch execution trace requested for action ID: ${actionId}`);

  try {
    const inputBytes = Buffer.from(JSON.stringify(actionId));
    
    // Call getTrace export of the coordinator WebAssembly component
    const resultBytes = coordinator.contracts.getTrace({
      input: new Uint8Array(inputBytes)
    });
    
    const trace = JSON.parse(Buffer.from(resultBytes).toString('utf8'));
    return NextResponse.json(trace);
  } catch (error: any) {
    const msg = error.message || String(error);
    addTelemetryLog('agent', `Fetch trace error for ${actionId}: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 404 });
  }
}
