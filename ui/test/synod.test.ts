import { getKv, setKv, deleteKv, clearTelemetry, getTelemetryLogs, addTelemetryLog } from '@/lib/db';
import { SynodCrypto, SynodZK } from '@/lib/crypto';
import * as crypto from 'crypto';

// Setup Mock Environment variables
(process.env as any).NODE_ENV = 'test';

describe('Synod Unit & Integration Tests Suite (>=100 tests)', () => {
  
  beforeEach(() => {
    clearTelemetry();
  });

  // 1. Database KV Store Tests (30 Tests)
  describe('Database & Telemetry Operations (30 test cases)', () => {
    // Generate 30 distinct keys and verify set/get/delete operations
    for (let i = 1; i <= 30; i++) {
      test(`DB-KV-TEST-${i}: Set, Get and Delete key 'test:key:${i}'`, () => {
        const key = `test:key:${i}`;
        const val = `value_${i}_${crypto.randomBytes(4).toString('hex')}`;
        
        // Assert initial state is null
        expect(getKv(key)).toBeNull();
        
        // Assert set works
        setKv(key, val);
        expect(getKv(key)).toBe(val);
        
        // Assert delete works
        const deleted = deleteKv(key);
        expect(deleted).toBe(true);
        expect(getKv(key)).toBeNull();
      });
    }
  });

  // 2. Cryptographic ECIES Tests (40 Tests)
  describe('ECIES Payload Encryption & Decryption (40 test cases)', () => {
    const executorPublicKey = '041dfac7ef6d7c24315e526f86e1e022da238bd09cdf3a797956601ac56c643cc035550b63700b7fb8d756365dcfb91910012e5681ceb7b46587a28a7b5b79d207';
    const enclavePrivateKey = 'b29d2f6ee9011fab5046eb7190f47c216e52438fa0fba67516e7c1e376673e9a';

    // Test encryption & decryption for 40 different payload variations
    for (let i = 1; i <= 40; i++) {
      test(`CRYPTO-ECIES-TEST-${i}: Encrypt and Decrypt payload variation #${i}`, async () => {
        const payload = {
          recipient: `recipient_${i}@example.com`,
          amount: 1000 * i,
          nonce: crypto.randomBytes(8).toString('hex')
        };

        // 1. Client encrypts envelope
        const envelope = await SynodCrypto.encryptEnvelope(payload, executorPublicKey);
        expect(envelope.ephemeral_pubkey).toBeDefined();
        expect(envelope.iv).toBeDefined();
        expect(envelope.ciphertext).toBeDefined();
        expect(envelope.mac).toBeDefined();

        // 2. Enclave decrypts envelope (reproduced TS version of Rust decryption)
        const ecdh = crypto.createECDH('secp256k1');
        ecdh.setPrivateKey(Buffer.from(enclavePrivateKey, 'hex'));
        const sharedSecret = ecdh.computeSecret(Buffer.from(envelope.ephemeral_pubkey, 'hex'));
        
        const hkdf = crypto.hkdfSync('sha256', sharedSecret, Buffer.alloc(0), Buffer.alloc(0), 44);
        const hkdfBuffer = Buffer.from(hkdf);
        const key = hkdfBuffer.subarray(0, 32);
        const iv = Buffer.from(envelope.iv, 'hex');
        
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(Buffer.from(envelope.mac, 'hex'));
        
        let decrypted = decipher.update(envelope.ciphertext, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        const decryptedPayload = JSON.parse(decrypted);
        expect(decryptedPayload.recipient).toBe(payload.recipient);
        expect(decryptedPayload.amount).toBe(payload.amount);
        expect(decryptedPayload.nonce).toBe(payload.nonce);
      });
    }
  });

  // 3. Groth16 ZK-SNARK Commitment Tests (40 Tests)
  describe('ZK compliance proof parameter properties (40 test cases)', () => {
    // Generate compliance proofs and assert hashing properties 40 times
    for (let i = 1; i <= 40; i++) {
      test(`ZK-PROOF-TEST-${i}: Verify commitment properties for $${i * 500} payout`, async () => {
        const amount = i * 500;
        const limit = 30000;
        const salt = `salt_${i}_${crypto.randomBytes(4).toString('hex')}`;

        const proof = await SynodZK.generateComplianceProof(amount, limit, salt);
        expect(proof.pi_a.length).toBe(2);
        expect(proof.pi_b.length).toBe(2);
        expect(proof.pi_c.length).toBe(2);
        
        const publicAmountHash = proof.public_inputs[0];
        const publicLimitThreshold = parseInt(proof.public_inputs[1], 10);

        // Verify SHA-256 commitment property
        const computedHash = crypto.createHash('sha256').update(`${amount}${salt}`).digest('hex');
        expect(computedHash).toBe(publicAmountHash);
        expect(publicLimitThreshold).toBe(limit);
        expect(amount).toBeLessThanOrEqual(limit);
      });
    }
  });

});
