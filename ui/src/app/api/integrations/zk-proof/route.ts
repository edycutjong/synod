import { NextResponse } from 'next/server';
import { SynodZK } from '@/lib/crypto';

export async function POST(request: Request) {
  try {
    const { amount, limit, salt } = await request.json();
    if (amount === undefined || limit === undefined || !salt) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const proof = await SynodZK.generateComplianceProof(amount, limit, salt);
    return NextResponse.json(proof);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
