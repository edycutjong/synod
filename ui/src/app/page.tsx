'use client';

import React, { useState, useEffect } from 'react';
import PayoutComposer from '@/components/PayoutComposer';
import WarRoomTimeline, { TraceStep } from '@/components/WarRoomTimeline';
import RollbackVisualizer from '@/components/RollbackVisualizer';
import CompositeReceipt from '@/components/CompositeReceipt';
import { SynodCrypto, SynodZK } from '@/lib/crypto';
import { 
  Shield, Zap, Award, BookOpen, Terminal, 
  Github, ChevronDown, RefreshCw, Cpu, CheckCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function DashboardPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [txStatus, setTxStatus] = useState<'draft' | 'submitting' | 'committed' | 'aborted'>('draft');
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [receipt, setReceipt] = useState<any>(null);
  
  // Track parameters for the rollback visualizer
  const [payoutParams, setPayoutParams] = useState({
    payoutId: 'payout_2281',
    amount: 15000,
    recipient: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
  });

  // Telemetry logs
  const [telemetry, setTelemetry] = useState<any[]>([]);

  // Specialists state
  const [specialists, setSpecialists] = useState<any[]>([
    { id: 'approver-a', role: 'Treasury Checker', staked: '1,500 USDC', status: 'Active', evaluations: 42, slashes: 0, address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' },
    { id: 'approver-b', role: 'Compliance Auditor', staked: '2,000 USDC', status: 'Active', evaluations: 42, slashes: 0, address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906' },
    { id: 'executor', role: 'Blind Paymaster', staked: '5,000 USDC', status: 'Active', evaluations: 42, slashes: 0, address: '0x15d34AAf54a67C643048209944f6f010C1a4a400' }
  ]);

  // Timeline steps
  const [steps, setSteps] = useState<TraceStep[]>([
    { agentId: 'approver-a', decision: 'pending', reason: 'Awaiting coordinator trigger' },
    { agentId: 'approver-b', decision: 'pending', reason: 'Awaiting coordinator trigger' },
    { agentId: 'executor', decision: 'pending', reason: 'Awaiting coordinator trigger' }
  ]);

  // Fetch telemetry logs
  const fetchTelemetry = async () => {
    try {
      const response = await fetch('/api/telemetry');
      if (response.ok) {
        const logs = await response.json();
        setTelemetry(logs.reverse()); // Newest first for telemetry panel
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleStartOrchestration = async (params: {
    payoutId: string;
    amount: number;
    recipient: string;
    salt: string;
    limit: number;
    forceHttpFailCode: number | null;
    forcePairingFail: boolean;
  }) => {
    setIsProcessing(true);
    setTxStatus('submitting');
    setReceipt(null);
    setCurrentStepIndex(0);
    setPayoutParams({
      payoutId: params.payoutId,
      amount: params.amount,
      recipient: params.recipient
    });

    // Reset steps to pending/processing
    setSteps([
      { agentId: 'approver-a', decision: 'processing', reason: 'Evaluating payout rules...' },
      { agentId: 'approver-b', decision: 'pending', reason: 'Awaiting compliance evaluation' },
      { agentId: 'executor', decision: 'pending', reason: 'Awaiting execution stage' }
    ]);

    try {
      // 1. Generate client-side cryptography
      const executorPublicKey = '041dfac7ef6d7c24315e526f86e1e022da238bd09cdf3a797956601ac56c643cc035550b63700b7fb8d756365dcfb91910012e5681ceb7b46587a28a7b5b79d207';
      const envelope = await SynodCrypto.encryptEnvelope(
        { recipient: params.recipient, amount: params.amount, target_host: 'https://treasury.sandbox.test' },
        executorPublicKey
      );
      const proof = await SynodZK.generateComplianceProof(params.amount, params.limit, params.salt);

      // Run simulated delay to let user see step-by-step consensus transition
      await new Promise((r) => setTimeout(r, 600));

      // Update Step 1 to Approved
      setSteps(prev => [
        { agentId: 'approver-a', decision: 'approved', reason: 'Always approve (Treasury policy matches)' },
        { agentId: 'approver-b', decision: 'processing', reason: 'Verifying Groth16 compliance proof...' },
        prev[2]
      ]);
      setCurrentStepIndex(1);
      await new Promise((r) => setTimeout(r, 600));

      // Check Approver B (Compliance ZK check) failure condition
      if (params.forcePairingFail) {
        setSteps(prev => [
          prev[0],
          { agentId: 'approver-b', decision: 'failed', reason: 'Compliance Abort: Groth16 Pairing check fails - Invalid Proof' },
          prev[2]
        ]);
        setTxStatus('aborted');
        return;
      }

      if (params.amount > params.limit) {
        setSteps(prev => [
          prev[0],
          { agentId: 'approver-b', decision: 'vetoed', reason: `Compliance Veto: Amount $${params.amount} exceeds limit threshold $${params.limit}` },
          prev[2]
        ]);
        setTxStatus('aborted');
        return;
      }

      // Step 2 approved, move to Step 3 (Executor)
      setSteps(prev => [
        prev[0],
        { agentId: 'approver-b', decision: 'approved', reason: 'Groth16 ZK-SNARK verification successful' },
        { agentId: 'executor', decision: 'processing', reason: 'Decrypting ECIES envelope & executing webhook...' }
      ]);
      setCurrentStepIndex(2);
      await new Promise((r) => setTimeout(r, 600));

      // Check Executor failure condition
      if (params.forceHttpFailCode === 503) {
        setSteps(prev => [
          prev[0],
          prev[1],
          { agentId: 'executor', decision: 'failed', reason: 'HTTP 503 Service Unavailable' }
        ]);
        setTxStatus('aborted');
        return;
      }

      // Call actual compose action backend to record the transaction
      const response = await fetch('/api/action/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payoutId: params.payoutId,
          amount: params.amount,
          recipient: params.recipient,
          salt: params.salt,
          limit: params.limit,
          envelope,
          proof,
          forceHttpFailCode: params.forceHttpFailCode,
          forcePairingFail: params.forcePairingFail
        })
      });

      const data = await response.json();
      if (response.ok && data.status === 'committed') {
        setSteps(prev => [
          prev[0],
          prev[1],
          { agentId: 'executor', decision: 'approved', reason: 'Blind payout webhook settled, VC issued' }
        ]);
        setTxStatus('committed');
        setReceipt(data.receipt);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } else {
        setSteps(prev => [
          prev[0],
          prev[1],
          { agentId: 'executor', decision: 'failed', reason: data.error || 'Execution aborted' }
        ]);
        setTxStatus('aborted');
      }
    } catch (e: any) {
      setSteps(prev => [
        prev[0] || { agentId: 'approver-a', decision: 'failed', reason: 'Execution error' },
        prev[1] || { agentId: 'approver-b', decision: 'failed', reason: 'Execution error' },
        { agentId: 'executor', decision: 'failed', reason: e.message || 'Execution error' }
      ]);
      setTxStatus('aborted');
    } finally {
      setIsProcessing(false);
      fetchTelemetry();
    }
  };

  // FAQ states
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const toggleFaq = (idx: number) => {
    setFaqOpen(faqOpen === idx ? null : idx);
  };

  return (
    <div className={`min-h-screen flex flex-col font-ui relative bg-grid-line overflow-x-hidden ${txStatus === 'aborted' ? 'animate-shake' : ''}`}>
      {/* Decorative top ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[300px] bg-purple-950/20 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#090d16]/80 backdrop-blur-md border-b border-slate-800/80 transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-950/50 border border-purple-800 rounded-lg">
              <Cpu className="w-5 h-5 text-purple-400 animate-pulse" />
            </div>
            <span className="font-display font-black tracking-widest text-lg bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-green-400">
              SYNOD
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-mono text-slate-400">
            <a href="#console" className="hover:text-white transition-colors">CONSOLE</a>
            <a href="#specialists" className="hover:text-white transition-colors">SPECIALISTS</a>
            <a href="#telemetry" className="hover:text-white transition-colors">TELEMETRY</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noreferrer"
              className="p-2 border border-slate-800 rounded-lg hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <Github className="w-4 h-4" />
            </a>
            <span className="text-[10px] font-mono border border-green-800 bg-green-950/20 text-green-400 py-1 px-2.5 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
              SANDBOX V1.0
            </span>
          </div>
        </div>
      </header>

      {/* Hero / Dashboard Frame */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12 relative z-10">
        
        {/* Element 3: Hero Section */}
        <section className="text-center md:text-left md:flex md:items-center justify-between gap-8 py-6">
          <div className="space-y-4 max-w-2xl">
            <h1 className="text-5xl md:text-6xl font-black font-display tracking-tight text-white leading-tight uppercase">
              ATOMIC MULTI-AGENT <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-green-400">
                ORCHESTRATION TEE
              </span>
            </h1>
            <p className="text-sm md:text-base text-slate-400 font-mono max-w-xl">
              Secure multi-agent dual-signing & zero-leak enclaves. Execute payouts with zero side-effects on transaction rollback.
            </p>
            {/* Element 4: Primary CTA */}
            <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-2">
              <a 
                href="#console" 
                className="bg-purple-600 hover:bg-purple-500 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] text-white font-mono text-xs px-6 py-3 rounded-xl font-bold transition-all active:scale-[0.97]"
              >
                OPEN CONSOLE
              </a>
              <a 
                href="#specialists" 
                className="border border-slate-800 hover:bg-slate-900 text-slate-300 font-mono text-xs px-6 py-3 rounded-xl font-bold transition-all"
              >
                AUDIT SPECIALISTS
              </a>
            </div>
          </div>

          {/* Social proof / Stats (Element 5) */}
          <div className="grid grid-cols-3 gap-4 bg-slate-900/40 border border-slate-800/80 hover:border-purple-800/30 transition-all rounded-xl p-4 md:p-6 shrink-0 mt-6 md:mt-0 shadow-lg">
            <div className="text-center px-2">
              <span className="block text-3xl font-bold font-display text-purple-400">8,500</span>
              <span className="text-[10px] text-slate-500 font-mono">USDC STAKED</span>
            </div>
            <div className="text-center px-2 border-x border-slate-800">
              <span className="block text-3xl font-bold font-display text-green-400">100%</span>
              <span className="text-[10px] text-slate-500 font-mono">OCC INTEGRITY</span>
            </div>
            <div className="text-center px-2">
              <span className="block text-3xl font-bold font-display text-red-500">0</span>
              <span className="text-[10px] text-slate-500 font-mono">SLASH EVENTS</span>
            </div>
          </div>
        </section>

        {/* Primary Interactive Console (Element 4 & 6) */}
        <section id="console" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <PayoutComposer onStartOrchestration={handleStartOrchestration} isProcessing={isProcessing} />
          <WarRoomTimeline status={txStatus} steps={steps} currentStepIndex={currentStepIndex} />
        </section>

        {/* Rollback Visualizer & Receipt Display */}
        <section className="grid grid-cols-1 gap-8">
          <RollbackVisualizer 
            status={txStatus} 
            payoutId={payoutParams.payoutId}
            amount={payoutParams.amount}
            recipient={payoutParams.recipient}
          />
          {receipt && <CompositeReceipt receipt={receipt} />}
        </section>

        {/* Element 7: Core Specialists List */}
        <section id="specialists" className="space-y-4">
          <h3 className="text-lg font-bold font-display tracking-wider text-purple-400 uppercase">
            ACTIVE TEE SPECIALIST ENCLAVES
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {specialists.map(spec => (
              <div 
                key={spec.id} 
                className="relative bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl p-5 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.1)] transition-all duration-300 group hover:-translate-y-0.5"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 blur-[30px] rounded-full pointer-events-none group-hover:bg-purple-500/10 transition-all"></div>
                <div className="flex justify-between items-start mb-3 relative z-10">
                  <div>
                    <h4 className="font-bold text-white uppercase tracking-wide text-sm">{spec.id.replace('-', ' ')}</h4>
                    <span className="text-[10px] text-slate-500 font-mono">{spec.role}</span>
                  </div>
                  <span className={`text-[10px] border px-2 py-0.5 rounded-full font-mono uppercase tracking-wider ${
                    spec.id === 'approver-a' ? 'bg-amber-950/40 border-amber-500/30 text-amber-400 animate-pulse' :
                    spec.id === 'approver-b' ? 'bg-teal-950/40 border-teal-500/30 text-teal-400' :
                    'bg-violet-950/40 border-violet-500/30 text-violet-400'
                  }`}>
                    {spec.status}
                  </span>
                </div>
                <div className="space-y-1 text-xs font-mono border-t border-slate-850 pt-3 mt-3 text-slate-400">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Enclave Stake:</span>
                    <span>{spec.staked}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Evaluations:</span>
                    <span>{spec.evaluations}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Address:</span>
                    <span className="text-[10px] text-purple-400">{spec.address.substring(0, 6)}...{spec.address.substring(38)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Element 8: Telemetry Panel */}
        <section id="telemetry" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold font-display tracking-wider text-purple-400 uppercase flex items-center gap-2">
              <Terminal className="w-5 h-5" />
              TEE LOG TELEMETRY STREAM
            </h3>
            <button
              onClick={async () => {
                await fetch('/api/telemetry', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'clear' })
                });
                setTelemetry([]);
              }}
              className="text-xs font-mono text-slate-500 hover:text-slate-300 flex items-center gap-1.5"
            >
              Clear Console
            </button>
          </div>

          <div className="bg-black/90 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-400 h-64 overflow-y-auto space-y-2">
            {telemetry.length === 0 ? (
              <span className="text-slate-600 block text-center py-12">Awaiting telemetry logs... Deploy a transaction above.</span>
            ) : (
              telemetry.map((log, idx) => (
                <div key={idx} className="flex items-start gap-3 border-b border-slate-900/50 pb-1.5">
                  <span className="text-slate-600 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  <span className={`font-bold shrink-0 uppercase tracking-wide text-[10px] px-1.5 py-0.5 rounded ${
                    log.type === 'enclave' ? 'bg-purple-950/40 text-purple-400' : 'bg-slate-900 text-slate-400'
                  }`}>
                    {log.type}
                  </span>
                  <div className="flex-grow">
                    <span className="text-slate-300">{log.message}</span>
                    {log.data && (
                      <pre className="text-[10px] text-slate-500 mt-1 max-w-full overflow-x-auto">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Element 9: FAQ Accordion */}
        <section id="faq" className="space-y-4 max-w-3xl mx-auto">
          <h3 className="text-lg font-bold font-display tracking-wider text-purple-400 text-center uppercase">
            FREQUENTLY ASKED QUESTIONS
          </h3>
          <div className="space-y-3">
            {[
              {
                q: "How does Intel TDX protect the multi-agent execution?",
                a: "Intel TDX (Trust Domain Extensions) provides hardware-level memory encryption and isolation, ensuring that even if the host machine's root OS is compromised, the enclave's memory and keys (like our ECIES private key) remain completely unreadable and tamper-proof."
              },
              {
                q: "How is atomic rollback enforced in WASM?",
                a: "The Coordinator contract orchestrates the workflow. It first stages state writes in the KV store. If any subsequent specialist call fails or throws a veto, the coordinator catches the error, reverts the staged KV state writes back to 'aborted', and returns an error. The host discard-write policy ensures zero side effects occur."
              },
              {
                q: "What is the purpose of ECIES payload encryption?",
                a: "ECIES (Elliptic Curve Integrated Encryption Scheme) ensures that sensitive parameters (such as the vendor payout account and exact amount) are encrypted by the client and remain confidential. They are only decrypted inside the final Executor enclave's secure memory boundary, preventing exposure to intermediate nodes or host logs."
              }
            ].map((item, idx) => (
              <div key={idx} className="border border-slate-800 bg-slate-900/30 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full text-left p-4 font-mono font-bold text-slate-300 hover:text-white flex justify-between items-center transition-colors"
                >
                  <span>{item.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${faqOpen === idx ? 'rotate-180' : ''}`} />
                </button>
                {faqOpen === idx && (
                  <div className="p-4 border-t border-slate-850 bg-slate-950/20 text-xs text-slate-400 leading-relaxed">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials (Element 8) */}
        <section className="max-w-7xl mx-auto py-4 relative z-10 w-full space-y-4">
          <h3 className="text-lg font-bold font-display tracking-wider text-purple-400 text-center md:text-left uppercase">
            WHO IT&apos;S FOR
          </h3>
          <p className="font-mono text-[10px] text-slate-500 text-center md:text-left">
            Illustrative usage scenarios — not real testimonials. See the Hackathon Simulation Context below.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: "A treasury payout should only execute if compliance approves in the same breath — Synod runs both agents in one TEE transaction, so there are never partial commits.",
                persona: "DAO treasury manager",
                context: "Atomic multi-sig payouts",
                badge: "TM"
              },
              {
                quote: "I need to enforce spend thresholds without seeing the raw amounts — the compliance agent vetoes blindly inside the enclave and the whole transaction reverts on a no.",
                persona: "Compliance reviewer",
                context: "Blind policy checks",
                badge: "CR"
              },
              {
                quote: "Chaining agents that can hire and co-approve each other only works if a single veto rolls everything back. contracts-call gives us that all-or-nothing guarantee.",
                persona: "Multi-agent ops engineer",
                context: "Cross-contract orchestration",
                badge: "OE"
              }
            ].map((item, idx) => (
              <div key={idx} className="bg-[#111827]/40 border border-slate-800/80 rounded-xl p-5 hover:border-purple-800/40 transition-colors flex flex-col justify-between">
                <p className="text-xs text-slate-350 italic mb-5 leading-relaxed">
                  &ldquo;{item.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full border border-purple-500/30 bg-purple-500/5 text-purple-400 flex items-center justify-center font-mono text-[10px] font-bold">
                    {item.badge}
                  </span>
                  <div className="flex flex-col font-mono">
                    <span className="text-[11px] font-bold text-white">{item.persona}</span>
                    <span className="text-[9px] text-slate-500">{item.context}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Element 10: Final CTA */}
        <section className="bg-gradient-to-r from-purple-900/20 via-[#090d16] to-green-950/20 border border-purple-900/40 rounded-2xl p-8 md:p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-purple-600/10 blur-3xl rounded-full" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-green-600/10 blur-3xl rounded-full" />
          
          <div className="max-w-2xl mx-auto space-y-5 relative z-10">
            <Shield className="w-10 h-10 text-purple-400 mx-auto animate-pulse" />
            <h3 className="text-xl md:text-3xl font-bold font-display tracking-wide text-white uppercase">
              DEPLOY MULTI-AGENT ORCHESTRATION
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 font-mono max-w-xl mx-auto leading-relaxed">
              Get notified about upcoming mainnet enclave instances and developer SDK pre-releases. Enter your email to join the waitlist.
            </p>
            
            <form onSubmit={(e) => e.preventDefault()} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto pt-2">
              <input 
                type="email" 
                placeholder="Enter developer DID or email..." 
                className="flex-grow px-4 py-3 rounded-lg border border-slate-800 bg-[#090d16] font-mono text-xs text-white focus:outline-none focus:border-purple-500 placeholder:text-slate-600"
                required
              />
              <button 
                type="submit"
                onClick={() => {
                  confetti({
                    particleCount: 50,
                    spread: 40,
                    colors: ['#a855f7', '#ffffff']
                  });
                }}
                className="bg-purple-600 hover:bg-purple-500 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] text-white font-mono text-xs px-6 py-3 rounded-lg font-bold transition-all active:scale-[0.98]"
              >
                JOIN WAITLIST
              </button>
            </form>
          </div>
        </section>
      </main>

      {/* Hackathon Simulation Context (honesty disclaimer) */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 mt-12 w-full relative z-10">
        <div className="p-6 rounded-2xl border border-purple-500/20 bg-purple-500/2 flex flex-col gap-3">
          <h3 className="font-mono text-xs font-bold text-purple-400 uppercase">Hackathon Simulation Context</h3>
          <p className="font-mono text-[11px] text-slate-400 leading-relaxed">
            Synod is a demo built for the DoraHacks T3 ADK Launch Edition. The enclave, Treasury/Compliance/Executor
            agents, and ZK compliance checks run in a <span className="text-slate-200">local sandbox</span> against
            simulated Terminal 3 host APIs — no funds move and approver state is seeded test data. The personas
            above are <span className="text-slate-200">illustrative use cases, not real testimonials</span>. What is real:
            Rust&rarr;WASM enclave contracts coordinated by a synchronous <span className="text-slate-200">contracts-call</span>
            transaction with atomic single-veto rollback, and <span className="text-slate-200">kv-store</span> staging state
            (<code>submitting</code>/<code>committed</code>/<code>aborted</code>).
          </p>
        </div>
      </section>

      {/* Element 11: Footer */}
      <footer className="bg-slate-950 border-t border-slate-800/80 py-12 mt-12 relative z-10 text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <span className="font-display font-black tracking-widest text-sm text-purple-400">
              SYNOD
            </span>
            <p className="text-[10px] text-slate-600 leading-relaxed">
              Atomic multi-agent TEE orchestration engine utilizing Terminal 3 ADK. 100% cryptographic rollback guarantees.
            </p>
          </div>
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">RESOURCES</span>
            <a href="#console" className="block hover:text-slate-300">Console Panel</a>
            <a href="#specialists" className="block hover:text-slate-300">Active Specialists</a>
            <a href="#telemetry" className="block hover:text-slate-300">Live Telemetry</a>
          </div>
          <div className="space-y-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">SPONSOR MATCH</span>
            <div className="bg-[#090d16] border border-slate-800 p-3 rounded">
              <span className="text-purple-400 block font-bold text-[10px]">TERMINAL 3 ADK</span>
              <p className="text-[9px] text-slate-600 mt-1 leading-normal">
                Leverages contracts-call, http-with-placeholders, and signing host APIs inside secure TDX enclaves.
              </p>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 mt-8 border-t border-slate-900 flex justify-between text-[10px]">
          <span>© 2026 Synod. All rights reserved.</span>
          <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-slate-300 flex items-center gap-1.5">
            <Github className="w-3.5 h-3.5" />
            GitHub Repository
          </a>
        </div>
      </footer>
    </div>
  );
}
