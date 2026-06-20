import { NextResponse } from 'next/server';
import { SynodCrypto } from '@/lib/crypto';

export async function POST(request: Request) {
  try {
    const { payload, executorPublicKey } = await request.json();
    if (!payload || !executorPublicKey) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const envelope = await SynodCrypto.encryptEnvelope(payload, executorPublicKey);
    return NextResponse.json(envelope);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
