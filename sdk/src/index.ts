import * as crypto from 'crypto';

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
   * Encrypts the raw payout payload targeting the Executor's public key.
   */
  static async encryptEnvelope(payload: object, executorPublicKey: string): Promise<EncryptedEnvelope> {
    const ecdh = crypto.createECDH('secp256k1');
    ecdh.generateKeys();
    const ephemeral_pubkey = ecdh.getPublicKey('hex');

    const sharedSecret = ecdh.computeSecret(Buffer.from(executorPublicKey, 'hex'));

    const hkdf = crypto.hkdfSync('sha256', sharedSecret, Buffer.alloc(0), Buffer.alloc(0), 44);
    const hkdfBuffer = Buffer.from(hkdf);
    const key = hkdfBuffer.subarray(0, 32);
    const iv = hkdfBuffer.subarray(32, 44);

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
   */
  static async generateComplianceProof(amount: number, limit: number, salt: string): Promise<ZKProof> {
    const rawData = `${amount}${salt}`;
    const hash = crypto.createHash('sha256').update(rawData).digest('hex');

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

export class SynodClient {
  private coordinatorUrl: string;
  private sessionKey: string;

  constructor(config: { coordinatorUrl: string; sessionKey: string }) {
    this.coordinatorUrl = config.coordinatorUrl;
    this.sessionKey = config.sessionKey;
  }

  /**
   * Initiates the multi-agent atomic transaction sequence inside the TEE.
   */
  async composeAction(
    payoutId: string,
    amount: number,
    recipient: string,
    salt: string,
    limit: number,
    envelope: EncryptedEnvelope,
    proof: ZKProof,
    forceHttpFailCode?: number,
    forcePairingFail?: boolean
  ): Promise<{ status: 'committed' | 'aborted'; receipt: string }> {
    try {
      const response = await fetch(`${this.coordinatorUrl}/api/action/compose`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.sessionKey}`
        },
        body: JSON.stringify({
          payoutId,
          amount,
          recipient,
          salt,
          limit,
          envelope,
          proof,
          forceHttpFailCode,
          forcePairingFail
        })
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          status: 'aborted',
          receipt: data.error || 'Transaction rolled back'
        };
      }

      return {
        status: data.status,
        receipt: JSON.stringify(data.receipt)
      };
    } catch (error: any) {
      return {
        status: 'aborted',
        receipt: error.message || 'Network error'
      };
    }
  }

  /**
   * Retrieves the execution trace log of a past action.
   */
  async getTrace(actionId: string): Promise<any> {
    try {
      const response = await fetch(`${this.coordinatorUrl}/api/action/trace/${actionId}`, {
        headers: {
          'Authorization': `Bearer ${this.sessionKey}`
        }
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to fetch trace');
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(`Failed to get trace: ${error.message}`);
    }
  }
}
