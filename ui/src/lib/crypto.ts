export interface EncryptedEnvelope {
  ephemeral_pubkey: string;
  iv: string;
  ciphertext: string;
  mac: string;
}

export interface ZKProof {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
  public_inputs: string[];
}

export class SynodCrypto {
  /**
   * Encrypts raw data payload using ECIES targeting the Executor contract public key.
   * In browser, fetches from /api/integrations/encrypt to avoid Node.js crypto dependencies.
   * In Node.js, uses native crypto.
   */
  static async encryptEnvelope(payload: object, executorPublicKey: string): Promise<EncryptedEnvelope> {
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
      const response = await fetch('/api/integrations/encrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload, executorPublicKey })
      });
      if (!response.ok) {
        throw new Error('Browser ECIES encryption failed');
      }
      return response.json();
    }

    // Node.js implementation
    const crypto = require('crypto');
    
    // 1. Generate ephemeral key pair
    const ecdh = crypto.createECDH('secp256k1');
    ecdh.generateKeys();
    const ephemeral_pubkey = ecdh.getPublicKey('hex');

    // 2. Compute shared secret
    const sharedSecret = ecdh.computeSecret(Buffer.from(executorPublicKey, 'hex'));

    // 3. HKDF key expansion (derive 44 bytes: 32 for key, 12 for IV)
    const hkdf = crypto.hkdfSync('sha256', sharedSecret, Buffer.alloc(0), Buffer.alloc(0), 44);
    const hkdfBuffer = Buffer.from(hkdf);
    const key = hkdfBuffer.subarray(0, 32);
    const iv = hkdfBuffer.subarray(32, 44);

    // 4. Encrypt using AES-256-GCM
    const plaintext = JSON.stringify(payload);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    
    const mac = cipher.getAuthTag().toString('hex');

    return {
      ephemeral_pubkey,
      iv: iv.toString('hex'),
      ciphertext,
      mac
    };
  }
}

export class SynodZK {
  /**
   * Generates a mock Groth16 proof showing that the amount <= limit.
   * In browser, fetches from /api/integrations/zk-proof.
   * In Node.js, uses native crypto.
   */
  static async generateComplianceProof(amount: number, limit: number, salt: string): Promise<ZKProof> {
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
      const response = await fetch('/api/integrations/zk-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, limit, salt })
      });
      if (!response.ok) {
        throw new Error('Browser ZK proof generation failed');
      }
      return response.json();
    }

    // Node.js implementation
    const crypto = require('crypto');
    const rawData = `${amount}${salt}`;
    const hash = crypto.createHash('sha256').update(rawData).digest('hex');

    // Deterministic mock elements representing BN254 G1/G2 pairing parameters
    const pi_a = [
      "0x18be4cdca9a900fa2b585dd299e03d12FA4293BC0219b165b4c1bdc30c8cb080",
      "0x0cf82b9dc3c8c704f05eb11211219b165b4c1bdc30c8cb080b06b3e4dc4ec2bc"
    ];
    const pi_b = [
      [
        "0x2bc8cb080b06b3e4dc4ec2bc2ef82b9dc3c8c704f05eb112efc4ebc01289cf08",
        "0x15b4c1bdc30c8cb080b06b3e4dc4ec2bc2ef82b9dc3c8c704f05eb112efc4ebc"
      ],
      [
        "0x06c28f9d0cba6be4dc4ec2bc2ef82b9dc3c8c704f05eb112efc4ebc01289cf08b",
        "0x11219b165b4c1bdc30c8cb080b06b3e4dc4ec2bc2ef82b9dc3c8c704f05eb112"
      ]
    ];
    const pi_c = [
      "0x15b4c1bdc30c8cb080b06b3e4dc4ec2bc2ef82b9dc3c8c704f05eb112efc4ebc",
      "0x2bc8cb080b06b3e4dc4ec2bc2ef82b9dc3c8c704f05eb11211219b165b4c1bdc"
    ];

    return {
      pi_a,
      pi_b,
      pi_c,
      public_inputs: [
        hash,
        limit.toString()
      ]
    };
  }
}
