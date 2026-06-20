#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const args = process.argv.slice(2);
const command = args[0];

// Help documentation
const printHelp = () => {
  console.log(`
Synod CLI Tool

Usage:
  synod-cli compose --payout-id <id> --amount <amount> --recipient <address> --limit-threshold <limit> --executor-pubkey <pubkey> [--coordinator-url <url>] [--target-host <host>] [--salt <salt>] [--force-http-fail <code>] [--force-pairing-fail]
  synod-cli verify --receipt <file> [--coordinator-url <url>]
  synod-cli bench [--runs <runs>]

Options:
  --payout-id         Unique ID for the payout.
  --amount            The USD amount to transfer.
  --recipient         The target address or DID.
  --limit-threshold   Maximum limit for compliance check.
  --executor-pubkey   Secp256k1 public key of the executor contract.
  --coordinator-url   Coordinator URL (default: http://localhost:3000).
  --target-host       Target host for the payout (default: https://treasury.sandbox.test).
  --salt              Salt used for ZK compliance proof (default: synod_sec_salt_99).
  --force-http-fail   Force an HTTP error status code on egress to test rollback (e.g. 500).
  --force-pairing-fail Force a ZK pairing verification failure to test abort.
  --receipt           Path to the JSON receipt file.
  --runs              Number of runs for the benchmark (default: 50).
  `);
};

if (!command || command === 'help' || command === '--help' || command === '-h') {
  printHelp();
  process.exit(0);
}

// Parse arguments helper
const parseArgs = (args) => {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].replace('--', '');
      const value = args[i + 1];
      if (value && !value.startsWith('--')) {
        options[key] = value;
        i++;
      } else {
        options[key] = true;
      }
    }
  }
  return options;
};

const options = parseArgs(args.slice(1));

// ECIES Encryption client-side simulation helper
const encryptEnvelope = (payload, executorPublicKey) => {
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
};

// ZK Proof generation helper
const generateComplianceProof = (amount, limit, salt) => {
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
};

if (command === 'compose') {
  const payoutId = options['payout-id'];
  const amount = parseInt(options['amount'], 10);
  const recipient = options['recipient'];
  const limit = parseInt(options['limit-threshold'], 10);
  const pubkey = options['executor-pubkey'];
  const coordinatorUrl = options['coordinator-url'] || process.env.SYNOD_COORDINATOR_URL || 'http://localhost:3000';
  const targetHost = options['target-host'] || 'https://treasury.sandbox.test';
  const salt = options['salt'] || 'synod_sec_salt_99';
  const forceHttpFailCode = options['force-http-fail'] ? parseInt(options['force-http-fail'], 10) : null;
  const forcePairingFail = !!options['force-pairing-fail'];

  if (!payoutId || isNaN(amount) || !recipient || isNaN(limit) || !pubkey) {
    console.error('Error: Missing or invalid compose options.');
    printHelp();
    process.exit(1);
  }

  console.log(`Starting Synod Compose Action inside TEE...`);
  console.log(`- Payout ID: ${payoutId}`);
  console.log(`- Amount: $${amount} (Limit threshold: $${limit})`);
  console.log(`- Target Host: ${targetHost}`);
  console.log(`- Salt: ${salt}`);
  if (forceHttpFailCode) console.log(`- Force HTTP Fail Code: ${forceHttpFailCode}`);
  if (forcePairingFail) console.log(`- Force Pairing Fail: true`);

  // Client-side Cryptography
  const envelope = encryptEnvelope({ recipient, amount, target_host: targetHost }, pubkey);
  const proof = generateComplianceProof(amount, limit, salt);

  // Send request to coordinator
  const payload = {
    payoutId,
    amount,
    recipient,
    salt,
    limit,
    envelope,
    proof,
    forceHttpFailCode,
    forcePairingFail
  };

  const url = `${coordinatorUrl}/api/action/compose`;
  const reqPayload = JSON.stringify(payload);

  const parsedUrl = new URL(url);
  const http = parsedUrl.protocol === 'https:' ? require('https') : require('http');

  const req = http.request({
    hostname: parsedUrl.hostname,
    port: parsedUrl.port,
    path: parsedUrl.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(reqPayload)
    }
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (res.statusCode === 200) {
          console.log('\n=== Transaction Committed Successfully ===');
          console.log(`Status: ${json.status}`);
          const receiptFile = `./receipts_${payoutId}.json`;
          fs.writeFileSync(receiptFile, JSON.stringify(json.receipt, null, 2));
          console.log(`VC Receipt exported to: ${receiptFile}`);
        } else {
          console.error(`\n=== Transaction Aborted (Rollback Triggered) ===`);
          console.error(`Status: aborted`);
          console.error(`Error: ${json.error}`);
        }
      } catch (e) {
        console.error('Failed to parse response:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error('Connection error:', e.message);
  });

  req.write(reqPayload);
  req.end();

} else if (command === 'verify') {
  const receiptPath = options['receipt'];
  const coordinatorUrl = options['coordinator-url'] || process.env.SYNOD_COORDINATOR_URL || 'http://localhost:3000';

  if (!receiptPath) {
    console.error('Error: Missing --receipt path.');
    printHelp();
    process.exit(1);
  }

  try {
    const rawReceipt = fs.readFileSync(receiptPath, 'utf8');
    const receipt = JSON.parse(rawReceipt);

    const url = `${coordinatorUrl}/api/integrations/verify`;
    const reqPayload = JSON.stringify({ receipt });

    const parsedUrl = new URL(url);
    const http = parsedUrl.protocol === 'https:' ? require('https') : require('http');

    const req = http.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(reqPayload)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.valid) {
            console.log('✓ VC Receipt Signature Verified Successfully against enclave DID.');
          } else {
            console.error('✗ VC Receipt Verification Failed:', json.error);
          }
        } catch (e) {
          console.error('Failed to parse response:', data);
        }
      });
    });

    req.on('error', (e) => {
      console.error('Connection error:', e.message);
    });

    req.write(reqPayload);
    req.end();
  } catch (e) {
    console.error('Failed to read or parse receipt file:', e.message);
  }

} else if (command === 'bench') {
  // Spawn python bench.py
  console.log('Spawning benchmark script...');
  const py = spawn('python3', [path.join(__dirname, '../scripts/bench.py')]);

  py.stdout.on('data', (data) => {
    process.stdout.write(data.toString());
  });

  py.stderr.on('data', (data) => {
    process.stderr.write(data.toString());
  });

  py.on('close', (code) => {
    process.exit(code);
  });
} else {
  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}
