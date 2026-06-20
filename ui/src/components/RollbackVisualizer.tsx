'use client';

import React, { useEffect, useState } from 'react';
import { Database, ArrowRight, ShieldAlert, CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react';

interface RollbackVisualizerProps {
  status: 'draft' | 'submitting' | 'committed' | 'aborted';
  payoutId: string;
  amount: number;
  recipient: string;
}

export default function RollbackVisualizer({ status, payoutId, amount, recipient }: RollbackVisualizerProps) {
  const [showFlash, setShowFlash] = useState(false);

  useEffect(() => {
    if (status === 'aborted' || status === 'committed') {
      setShowFlash(true);
      const timer = setTimeout(() => setShowFlash(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  return (
    <div className={`bg-[#111827] border rounded-xl p-6 shadow-xl transition-all duration-300 ${
      status === 'aborted' ? 'border-red-900 neon-glow-veto' :
      status === 'committed' ? 'border-green-900 neon-glow-accent' :
      'border-slate-800'
    } relative overflow-hidden`}>
      {/* Flash Alert Overlay */}
      {showFlash && (
        <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-20 ${
          status === 'aborted' ? 'bg-red-500' : 'bg-green-500'
        }`} />
      )}

      <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-3">
        <h2 className="text-xl font-bold font-display tracking-wide text-purple-400 flex items-center gap-2">
          <Database className="w-5 h-5 text-purple-400" />
          ATOMIC STATE JOURNAL
        </h2>
        {status === 'aborted' && (
          <span className="text-xs text-red-400 font-mono flex items-center gap-1 bg-red-950/40 border border-red-800 px-2 py-0.5 rounded animate-pulse">
            <RotateCcw className="w-3 h-3 animate-spin" />
            State Reverted
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
        {/* Core KV Stores */}
        <div className="space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded p-4">
            <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2 border-b border-slate-900 pb-1.5 flex justify-between">
              <span>TEE KV Store (CCF Replicated)</span>
              <span className="text-[10px] text-slate-600 font-mono">Namespace: synod:coord</span>
            </div>
            
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between border-b border-slate-900/60 py-1">
                <span className="text-slate-500">Key:</span>
                <span className="text-purple-400">synod:coord:{payoutId || 'null'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900/60 py-1">
                <span className="text-slate-500">Staged Value:</span>
                <span className={`font-bold ${
                  status === 'committed' ? 'text-green-400' :
                  status === 'aborted' ? 'text-red-400line-through decoration-red-500' :
                  status === 'submitting' ? 'text-purple-400 animate-pulse' :
                  'text-slate-600'
                }`}>
                  {status === 'draft' ? 'empty' : `{"status": "${status}"}`}
                </span>
              </div>
              {status === 'aborted' && (
                <div className="text-[10px] text-red-500 bg-red-950/20 border border-red-900/40 p-2 rounded mt-1.5 flex items-start gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                  <span>
                    Rollback triggered! Staged writes discarded. Plaintext transaction variables zeroed in enclave RAM.
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded p-4">
            <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2 border-b border-slate-900 pb-1.5 flex justify-between">
              <span>Step Consensus Ledger</span>
              <span className="text-[10px] text-slate-600 font-mono">Namespace: synod:step</span>
            </div>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">synod:step:{payoutId}:0 (Treasury)</span>
                <span className={status !== 'draft' ? 'text-green-400' : 'text-slate-600'}>
                  {status !== 'draft' ? 'COMMIT_OK' : 'EMPTY'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">synod:step:{payoutId}:1 (Compliance)</span>
                <span className={
                  status === 'committed' ? 'text-green-400' :
                  status === 'aborted' && amount > 10000 ? 'text-red-500' :
                  status === 'submitting' ? 'text-purple-400 animate-pulse' :
                  'text-slate-600'
                }>
                  {status === 'committed' ? 'COMMIT_OK' :
                   status === 'aborted' && amount > 10000 ? 'REVERT_VETO' :
                   status === 'submitting' ? 'WAITING' : 'EMPTY'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">synod:step:{payoutId}:2 (Executor)</span>
                <span className={
                  status === 'committed' ? 'text-green-400' :
                  status === 'aborted' ? 'text-red-500' :
                  status === 'submitting' ? 'text-purple-400 animate-pulse' :
                  'text-slate-600'
                }>
                  {status === 'committed' ? 'COMMIT_OK' :
                   status === 'aborted' ? 'REVERT_ABORT' :
                   status === 'submitting' ? 'WAITING' : 'EMPTY'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Webhook/Side-effect Simulator Diagram */}
        <div className="border border-slate-800 bg-slate-950/40 rounded p-6 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-950/40 border border-purple-800 rounded-lg">
              <Database className="w-6 h-6 text-purple-400" />
            </div>
            <ArrowRight className={`w-6 h-6 ${
              status === 'committed' ? 'text-green-500 animate-pulse' :
              status === 'aborted' ? 'text-red-500' :
              'text-slate-700'
            }`} />
            <div className={`p-3 rounded-lg border transition-all duration-300 ${
              status === 'committed' ? 'bg-green-950/20 border-green-700' :
              status === 'aborted' ? 'bg-red-950/20 border-red-900/60' :
              'bg-slate-900 border-slate-800'
            }`}>
              <Database className={`w-6 h-6 ${
                status === 'committed' ? 'text-green-400' :
                status === 'aborted' ? 'text-red-500' :
                'text-slate-500'
              }`} />
            </div>
          </div>

          <span className="block text-xs font-mono text-slate-400 mb-1">
            TARGET HOST: <span className="text-purple-400">https://treasury.sandbox.test/payout</span>
          </span>

          <div className="mt-3">
            {status === 'committed' ? (
              <div className="bg-green-950/40 border border-green-800 text-green-400 text-xs px-4 py-2 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                <span>Side-effect committed! Vendor payout webhook executed.</span>
              </div>
            ) : status === 'aborted' ? (
              <div className="bg-red-950/40 border border-red-900 text-red-400 text-xs px-4 py-2 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 animate-bounce" />
                <span>ZERO side-effects: Webhook never reached, database untouched.</span>
              </div>
            ) : (
              <span className="text-slate-500 text-xs font-mono">
                {status === 'submitting' ? 'Awaiting evaluation result...' : 'Inactive. Awaiting trigger.'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
