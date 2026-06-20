import { NextResponse } from 'next/server';
import { addTelemetryLog } from '@/lib/db';
import * as coordinator from '@/lib/wasm/coordinator/coordinator.js';

export async function POST(request: Request) {
  addTelemetryLog('agent', 'Received incoming compose-action request from client');

  try {
    const body = await request.json();
    const {
      payoutId,
      amount,
      recipient,
      salt,
      limit,
      envelope,
      proof,
      forceHttpFailCode,
      forcePairingFail
    } = body;

    if (!payoutId || amount === undefined || !recipient || !salt || limit === undefined || !envelope || !proof) {
      addTelemetryLog('agent', 'Validation failed: Missing parameters in compose request');
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    addTelemetryLog('enclave', `Coordinator: Starting composed action flow for payoutId: ${payoutId}`);

    // Build request payload for Rust coordinator ComposeRequest struct
    const composeReqPayload = {
      payoutId,
      amount: Number(amount),
      recipient,
      salt,
      limit: Number(limit),
      envelope,
      proof,
      forceHttpFailCode: forceHttpFailCode ? Number(forceHttpFailCode) : null,
      forcePairingFail: forcePairingFail === true ? true : null
    };

    const inputBytes = Buffer.from(JSON.stringify(composeReqPayload));

    // Call composeAction export of the coordinator WebAssembly component
    let resultBytes;
    try {
      resultBytes = coordinator.contracts.composeAction({
        input: new Uint8Array(inputBytes)
      });
    } catch (contractError: any) {
      const errorMsg = contractError.message || String(contractError);
      addTelemetryLog('enclave', `Coordinator Action Flow Aborted: ${errorMsg}`);
      
      let status = 400;
      if (errorMsg.includes('503') || errorMsg.includes('Unavailable')) {
        status = 503;
      }
      return NextResponse.json({ error: errorMsg }, { status });
    }

    const receipt = JSON.parse(Buffer.from(resultBytes).toString('utf8'));
    addTelemetryLog('agent', `Orchestration complete: Composed action committed successfully!`);

    return NextResponse.json({ status: 'committed', receipt });
  } catch (error: any) {
    addTelemetryLog('agent', `Compose action error: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
