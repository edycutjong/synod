import fs from 'fs';
import path from 'path';
import os from 'os';

const IS_VERCEL = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;
const DB_PATH = IS_VERCEL
  ? path.join(os.tmpdir(), 'db.json')
  : path.resolve(process.cwd(), 'data/db.json');

export interface TelemetryLog {
  timestamp: number;
  type: 'agent' | 'enclave';
  message: string;
  data?: any;
}

export interface DbSchema {
  kv: Record<string, string>;
  specialists: any[];
  payouts: Record<string, any>;
  telemetryLogs: TelemetryLog[];
  dispatchedPayouts: any[];
}

export function initDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    // If we're on Vercel, copy the pre-seeded db.json template
    const templatePath = path.resolve(process.cwd(), 'data/db.json');
    if (IS_VERCEL && fs.existsSync(templatePath)) {
      try {
        fs.copyFileSync(templatePath, DB_PATH);
        return;
      } catch (err) {
        console.error('Failed to copy db template, fallback to default initialization', err);
      }
    }

    const initialDb: DbSchema = {
      kv: {},
      specialists: [
        {
          id: 'approver-a',
          role: 'treasury-checker',
          always_approve: true,
          stakedBalance: 1500000000, // 1,500 USDC
          isActive: true,
          totalEvaluations: 42,
          totalSlashes: 0,
          address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
        },
        {
          id: 'approver-b',
          role: 'compliance-auditor',
          limit_threshold: 10000,
          stakedBalance: 2000000000, // 2,000 USDC
          isActive: true,
          totalEvaluations: 42,
          totalSlashes: 0,
          address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906'
        },
        {
          id: 'executor',
          role: 'blind-paymaster',
          stakedBalance: 5000000000, // 5,000 USDC
          isActive: true,
          totalEvaluations: 42,
          totalSlashes: 0,
          address: '0x15d34AAf54a67C643048209944f6f010C1a4a400'
        }
      ],
      payouts: {
        "payout_2281": {
          "id": "payout_2281",
          "amount": 15000,
          "recipient": "recipient_a@treasury-sandbox.test",
          "target_host": "https://treasury.sandbox.test"
        },
        "payout_2282": {
          "id": "payout_2282",
          "amount": 5000,
          "recipient": "recipient_b@treasury-sandbox.test",
          "target_host": "https://treasury.sandbox.test"
        }
      },
      telemetryLogs: [],
      dispatchedPayouts: []
    };

    fs.writeFileSync(DB_PATH, JSON.stringify(initialDb, null, 2));
  }
}

export function readDb(): DbSchema {
  initDb();
  const content = fs.readFileSync(DB_PATH, 'utf-8');
  try {
    return JSON.parse(content);
  } catch (e) {
    return { kv: {}, specialists: [], payouts: {}, telemetryLogs: [], dispatchedPayouts: [] };
  }
}

export function writeDb(data: DbSchema) {
  initDb();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export function getKv(key: string): string | null {
  const db = readDb();
  return db.kv[key] || null;
}

export function setKv(key: string, value: string): void {
  const db = readDb();
  db.kv[key] = value;
  writeDb(db);
}

export function deleteKv(key: string): boolean {
  const db = readDb();
  if (db.kv[key] !== undefined) {
    delete db.kv[key];
    writeDb(db);
    return true;
  }
  return false;
}

export function addTelemetryLog(type: 'agent' | 'enclave', message: string, data?: any) {
  const db = readDb();
  const log: TelemetryLog = {
    timestamp: Date.now(),
    type,
    message,
    data
  };
  db.telemetryLogs.push(log);
  if (db.telemetryLogs.length > 200) {
    db.telemetryLogs.shift();
  }
  writeDb(db);
  console.log(`[${type.toUpperCase()}] ${message}`, data ? JSON.stringify(data) : '');
}

export function getTelemetryLogs(): TelemetryLog[] {
  const db = readDb();
  return db.telemetryLogs;
}

export function clearTelemetry() {
  const db = readDb();
  db.telemetryLogs = [];
  writeDb(db);
}

export function resetDb() {
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }
  initDb();
}
