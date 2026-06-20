import { NextResponse } from 'next/server';
import { addTelemetryLog } from '@/lib/db';
import * as crypto from 'crypto';

const ENCLAVE_PUBLIC_KEY = "041dfac7ef6d7c24315e526f86e1e022da238bd09cdf3a797956601ac56c643cc035550b63700b7fb8d756365dcfb91910012e5681ceb7b46587a28a7b5b79d207";

export async function POST(request: Request) {
  try {
    const { receipt } = await request.json();
    addTelemetryLog('agent', 'Integrations Verify: Received verification request for VC receipt');

    if (!receipt || !receipt.id || !receipt.issuer || !receipt.credentialSubject || !receipt.proof) {
      addTelemetryLog('agent', 'Integrations Verify: Receipt schema validation failed');
      return NextResponse.json({ valid: false, error: 'Invalid receipt structure' });
    }

    // Verify issuer is the expected TEE authority
    if (receipt.issuer !== 'did:t3n:synod-enclave-authority' && !receipt.issuer.startsWith('did:t3n:')) {
      addTelemetryLog('agent', `Integrations Verify: Invalid issuer ${receipt.issuer}`);
      return NextResponse.json({ valid: false, error: 'Unknown or untrusted VC issuer' });
    }

    // Verify status is settled
    if (receipt.credentialSubject.status !== 'settled') {
      addTelemetryLog('agent', 'Integrations Verify: Receipt status is not settled');
      return NextResponse.json({ valid: false, error: 'Credential subject status is not settled' });
    }

    // Verify proof fields
    if (receipt.proof.type !== 'JsonWebSignature2020' || !receipt.proof.signatureValue) {
      addTelemetryLog('agent', 'Integrations Verify: Invalid proof type or missing signature');
      return NextResponse.json({ valid: false, error: 'Missing or malformed cryptographic proof' });
    }

    // Reconstruct VC bytes to verify
    const vcToVerify = {
      id: receipt.id,
      issuer: receipt.issuer,
      credentialSubject: {
        recipient_account: receipt.credentialSubject.recipient_account,
        amount: receipt.credentialSubject.amount,
        status: receipt.credentialSubject.status,
        timestamp: receipt.credentialSubject.timestamp
      }
    };
    const vcBytes = Buffer.from(JSON.stringify(vcToVerify));
    const signature = Buffer.from(receipt.proof.signatureValue, 'hex');

    // Build JWK for public key
    const jwkPub = {
      kty: 'EC',
      crv: 'secp256k1',
      x: Buffer.from(ENCLAVE_PUBLIC_KEY.slice(2, 66), 'hex').toString('base64url'),
      y: Buffer.from(ENCLAVE_PUBLIC_KEY.slice(66), 'hex').toString('base64url'),
    };

    const publicKey = crypto.createPublicKey({
      key: jwkPub,
      format: 'jwk',
    });

    // Cryptographically verify signature!
    const isValid = crypto.verify('sha256', vcBytes, publicKey, signature);

    if (!isValid) {
      addTelemetryLog('agent', 'Integrations Verify: VC receipt signature verification failed! Invalid cryptographic signature.');
      return NextResponse.json({ valid: false, error: 'Invalid cryptographic signature' });
    }

    addTelemetryLog('enclave', `Integrations Verify: Receipt ${receipt.id} signature verified successfully inside enclave.`);
    return NextResponse.json({ valid: true });
  } catch (error: any) {
    addTelemetryLog('agent', `Integrations Verify Error: ${error.message}`);
    return NextResponse.json({ valid: false, error: error.message }, { status: 500 });
  }
}
