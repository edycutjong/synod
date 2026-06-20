'use client';

import React, { useState } from 'react';
import { FileCheck2, ShieldCheck, AlertCircle, Copy, Check } from 'lucide-react';

interface CompositeReceiptProps {
  receipt: any;
}

export default function CompositeReceipt({ receipt }: CompositeReceiptProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<'verified' | 'failed' | null>(null);
  const [copied, setCopied] = useState(false);

  if (!receipt) return null;

  const handleVerify = async () => {
    setIsVerifying(true);
    setVerificationResult(null);
    try {
      const response = await fetch('/api/integrations/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receipt })
      });
      const data = await response.json();
      if (data.valid) {
        setVerificationResult('verified');
      } else {
        setVerificationResult('failed');
      }
    } catch (e) {
      setVerificationResult('failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(receipt, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 shadow-xl relative animate-fadeIn">
      <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
        <h2 className="text-xl font-bold font-display tracking-wide text-purple-400 flex items-center gap-2">
          <FileCheck2 className="w-5 h-5 text-purple-400" />
          COMPOSITE VC RECEIPT
        </h2>
        <button
          onClick={handleCopy}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
          title="Copy JSON to clipboard"
        >
          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      <div className="bg-slate-950 border border-slate-900 rounded p-4 mb-4 overflow-x-auto max-h-64 font-mono text-xs text-green-400">
        <pre>{JSON.stringify(receipt, null, 2)}</pre>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-xs text-slate-500 font-mono">
          Issuer: <span className="text-purple-400">{receipt.issuer}</span>
        </div>
        <button
          onClick={handleVerify}
          disabled={isVerifying}
          className="bg-green-600 hover:bg-green-500 text-white font-display uppercase tracking-wider py-2 px-4 rounded text-xs font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {isVerifying ? 'Verifying Signature...' : 'Verify Receipt Signature'}
        </button>
      </div>

      {verificationResult && (
        <div className={`mt-4 p-3 rounded-lg border text-xs font-mono flex items-start gap-2 ${
          verificationResult === 'verified'
            ? 'bg-green-950/40 border-green-800 text-green-400'
            : 'bg-red-950/40 border-red-900 text-red-400'
        }`}>
          {verificationResult === 'verified' ? (
            <>
              <ShieldCheck className="w-5 h-5 text-green-400 shrink-0" />
              <div>
                <span className="font-bold block">Signature Verified</span>
                Valid cryptographic proof issued by Intel TDX enclave authority. Proof matches public keys.
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <div>
                <span className="font-bold block">Verification Failed</span>
                The signature or receipt format is invalid or has been tampered with.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
