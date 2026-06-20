'use client';

import React from 'react';
import { Shield, CheckCircle2, XCircle, AlertTriangle, HelpCircle, Loader2 } from 'lucide-react';

export interface TraceStep {
  agentId: string;
  decision: 'approved' | 'vetoed' | 'failed' | 'pending' | 'processing';
  reason: string;
}

interface WarRoomTimelineProps {
  status: 'draft' | 'submitting' | 'committed' | 'aborted';
  steps: TraceStep[];
  currentStepIndex: number;
}

export default function WarRoomTimeline({ status, steps, currentStepIndex }: WarRoomTimelineProps) {
  const getStepIcon = (stepStatus: TraceStep['decision']) => {
    switch (stepStatus) {
      case 'approved':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case 'vetoed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'failed':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />;
      case 'pending':
      default:
        return <HelpCircle className="w-5 h-5 text-slate-600" />;
    }
  };

  const getStepColorClass = (stepStatus: TraceStep['decision'], isActive: boolean) => {
    if (isActive) return 'border-purple-500 bg-purple-950/10 shadow-[0_0_15px_rgba(168,85,247,0.25)] scale-[1.01] animate-pulse';
    switch (stepStatus) {
      case 'approved':
        return 'border-green-800 bg-green-950/20';
      case 'vetoed':
      case 'failed':
        return 'border-red-900 bg-red-950/20';
      case 'pending':
      default:
        return 'border-slate-800 bg-slate-950/20';
    }
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
      {/* Decorative pulse ring indicating TEE active state */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 blur-[80px] rounded-full pointer-events-none" />
      <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-green-500/5 blur-[80px] rounded-full pointer-events-none" />

      {status === 'submitting' && (
        <div className="absolute inset-0 border-2 border-purple-500/30 rounded-xl pointer-events-none animate-pulse shadow-[0_0_30px_rgba(168,85,247,0.15)]" />
      )}

      <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-3">
        <h2 className="text-xl font-bold font-display tracking-wide text-purple-400 flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-400" />
          TEE WAR-ROOM TIMELINE
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">Status:</span>
          <span className={`text-xs font-mono uppercase px-2 py-0.5 rounded border ${
            status === 'committed' ? 'bg-green-950/60 border-green-800 text-green-400' :
            status === 'aborted' ? 'bg-red-950/60 border-red-800 text-red-400' :
            status === 'submitting' ? 'bg-purple-950/60 border-purple-800 text-purple-400 animate-pulse' :
            'bg-slate-900 border-slate-800 text-slate-400'
          }`}>
            {status}
          </span>
        </div>
      </div>

      <div className="relative border-l border-slate-800 ml-3.5 space-y-6 pb-2">
        {steps.map((step, idx) => {
          const isActive = idx === currentStepIndex && status === 'submitting';
          const isDone = idx < currentStepIndex || status === 'committed' || status === 'aborted';
          const stepClass = getStepColorClass(step.decision, isActive);

          return (
            <div key={step.agentId} className="relative pl-7 transition-all duration-300">
              {/* Dot Icon representing state */}
              <div className="absolute -left-3.5 top-0.5 bg-[#111827] rounded-full p-0.5 border border-slate-800 flex items-center justify-center">
                {getStepIcon(step.decision)}
              </div>

              {/* Box Panel */}
              <div className={`border rounded-lg p-4 ${stepClass} transition-all duration-200`}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className={`font-mono text-sm uppercase ${
                    isActive ? 'text-purple-400 font-bold' : 'text-slate-300'
                  }`}>
                    Step {idx + 1}: {step.agentId.replace('-', ' ')}
                  </span>
                  {step.decision !== 'pending' && (
                    <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                      step.decision === 'approved' ? 'bg-green-950 text-green-400 border border-green-900' :
                      step.decision === 'vetoed' ? 'bg-red-950 text-red-400 border border-red-900' :
                      step.decision === 'failed' ? 'bg-red-950 text-red-400 border border-red-900' :
                      'bg-purple-950 text-purple-400 border border-purple-900 animate-pulse'
                    }`}>
                      {step.decision}
                    </span>
                  )}
                </div>
                <p className={`text-xs ${
                  step.decision === 'pending' ? 'text-slate-500' : 'text-slate-400 font-mono'
                }`}>
                  {step.reason}
                </p>

                {isActive && (
                  <div className="mt-3 flex items-center gap-2 text-xs font-mono text-purple-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Executing enclave computations...
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
