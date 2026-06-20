'use client';

import React, { useState } from 'react';
import { SynodCrypto, SynodZK } from '@/lib/crypto';
import { Play, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';

interface PayoutComposerProps {
  onStartOrchestration: (params: {
    payoutId: string;
    amount: number;
    recipient: string;
    salt: string;
    limit: number;
    forceHttpFailCode: number | null;
    forcePairingFail: boolean;
  }) => Promise<void>;
  isProcessing: boolean;
}

export default function PayoutComposer({ onStartOrchestration, isProcessing }: PayoutComposerProps) {
  const [payoutId, setPayoutId] = useState('payout_2281');
  const [amount, setAmount] = useState(15000);
  const [recipient, setRecipient] = useState('0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC');
  const [limit, setLimit] = useState(10000);
  const [salt, setSalt] = useState('synod_sec_salt_99');
  
  // Scenarios/Toggles
  const [forceHttpFailCode, setForceHttpFailCode] = useState<number | null>(null);
  const [forcePairingFail, setForcePairingFail] = useState(false);

  const executorPublicKey = '041dfac7ef6d7c24315e526f86e1e022da238bd09cdf3a797956601ac56c643cc035550b63700b7fb8d756365dcfb91910012e5681ceb7b46587a28a7b5b79d207'; // Mock Secp256k1 pubkey

  const loadScenario = (type: 'veto' | 'happy' | 'abort' | 'outage') => {
    if (type === 'veto') {
      setPayoutId('payout_2281');
      setAmount(15000);
      setLimit(10000);
      setForceHttpFailCode(null);
      setForcePairingFail(false);
    } else if (type === 'happy') {
      setPayoutId('payout_2282');
      setAmount(5000);
      setLimit(10000);
      setForceHttpFailCode(null);
      setForcePairingFail(false);
    } else if (type === 'abort') {
      setPayoutId('payout_abort_3');
      setAmount(12000);
      setLimit(10000);
      setForceHttpFailCode(null);
      setForcePairingFail(true);
    } else if (type === 'outage') {
      setPayoutId('payout_outage_4');
      setAmount(5000);
      setLimit(10000);
      setForceHttpFailCode(503);
      setForcePairingFail(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartOrchestration({
      payoutId,
      amount,
      recipient,
      salt,
      limit,
      forceHttpFailCode,
      forcePairingFail
    });
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 shadow-xl neon-glow-primary">
      <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-3">
        <h2 className="text-xl font-bold font-display tracking-wide text-purple-400 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
          PAYOUT COMPOSER
        </h2>
        <span className="text-xs bg-purple-950/60 border border-purple-800 text-purple-300 font-mono px-2 py-0.5 rounded">
          TEE Mode Active
        </span>
      </div>

      {/* Preset Scenarios */}
      <div className="mb-6">
        <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
          Select Demo Scenario:
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => loadScenario('veto')}
            className={`text-xs py-2 px-3 font-mono rounded border transition-all text-center ${
              amount === 15000 && !forcePairingFail && !forceHttpFailCode
                ? 'bg-red-950/40 border-red-500 text-red-400 font-bold shadow-md shadow-red-950/50'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            [1] Boundary Veto ($15k)
          </button>
          <button
            type="button"
            onClick={() => loadScenario('happy')}
            className={`text-xs py-2 px-3 font-mono rounded border transition-all text-center ${
              amount === 5000 && !forcePairingFail && !forceHttpFailCode
                ? 'bg-green-950/40 border-green-500 text-green-400 font-bold shadow-md shadow-green-950/50'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            [2] Happy Path ($5k)
          </button>
          <button
            type="button"
            onClick={() => loadScenario('abort')}
            className={`text-xs py-2 px-3 font-mono rounded border transition-all text-center ${
              forcePairingFail
                ? 'bg-yellow-950/40 border-yellow-600 text-yellow-400 font-bold shadow-md shadow-yellow-950/50'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            [3] ZK Abort (Pairing Fail)
          </button>
          <button
            type="button"
            onClick={() => loadScenario('outage')}
            className={`text-xs py-2 px-3 font-mono rounded border transition-all text-center ${
              forceHttpFailCode === 503
                ? 'bg-purple-950/40 border-purple-500 text-purple-400 font-bold shadow-md shadow-purple-950/50'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            [4] Webhook Outage (503)
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">PAYOUT ID</label>
            <input
              type="text"
              value={payoutId}
              onChange={(e) => setPayoutId(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-[#f8fafc] font-mono focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">RECIPIENT ADDRESS / DID</label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-[#f8fafc] font-mono focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">AMOUNT (USD)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value, 10))}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-[#f8fafc] font-mono focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">SPENDING LIMIT THRESHOLD</label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value, 10))}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-[#f8fafc] font-mono focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">CRYPTOGRAPHIC SALT</label>
            <input
              type="text"
              value={salt}
              onChange={(e) => setSalt(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-[#f8fafc] font-mono focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-4 rounded text-xs font-mono text-slate-500 space-y-1.5">
          <div className="text-slate-400 font-bold border-b border-slate-900 pb-1 mb-1.5 flex justify-between">
            <span>CLIENT-SIDE CRYPTO STAGE</span>
            <span className="text-[10px] text-slate-600">PRE-ORCHESTRATION</span>
          </div>
          <div className="flex justify-between">
            <span>1. Ephemeral ECDH Key Pair:</span>
            <span className="text-purple-400">Generated</span>
          </div>
          <div className="flex justify-between">
            <span>2. Shared Secret (HKDF-SHA256):</span>
            <span className="text-purple-400">Derived</span>
          </div>
          <div className="flex justify-between">
            <span>3. ECIES Envelope (AES-256-GCM):</span>
            <span className="text-purple-400">Targeting Executor PubKey</span>
          </div>
          <div className="flex justify-between">
            <span>4. Groth16 Compliance ZK Proof:</span>
            <span className="text-green-500">Amount &lt;= Limit Commitment</span>
          </div>
        </div>

        {/* Debug Override Panel */}
        <div className="border border-slate-800 rounded p-3 bg-slate-900/40">
          <span className="block text-xs font-mono text-slate-400 mb-2 border-b border-slate-800 pb-1">
            ANOMALY SIMULATION INJECTORS
          </span>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-xs font-mono text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={forcePairingFail}
                onChange={(e) => setForcePairingFail(e.target.checked)}
                className="accent-purple-500"
              />
              Force ZK pairing failure
            </label>
            <label className="flex items-center gap-2 text-xs font-mono text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={forceHttpFailCode === 503}
                onChange={(e) => setForceHttpFailCode(e.target.checked ? 503 : null)}
                className="accent-purple-500"
              />
              Force 503 Service Outage
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={isProcessing}
          className="w-full bg-purple-600 hover:bg-purple-500 text-white font-display uppercase tracking-wider py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-bold shadow-lg shadow-purple-950/30 transition-all hover:neon-glow-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              ORCHESTRATING TEE SEQUENCE...
            </>
          ) : (
            <>
              <Play className="w-5 h-5 text-white" />
              DEPLOY MULTI-AGENT TX
            </>
          )}
        </button>
      </form>
    </div>
  );
}
