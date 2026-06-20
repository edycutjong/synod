import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardPage from '@/app/page';

// Mock canvas-confetti
jest.mock('canvas-confetti', () => () => null);

// Mock Synod crypto and ZK libraries to decouple UI from crypto environment dependencies
jest.mock('@/lib/crypto', () => ({
  SynodCrypto: {
    encryptEnvelope: jest.fn().mockResolvedValue({
      ephemeral_pubkey: '0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20',
      iv: '0102030405060708090a0b0c',
      ciphertext: 'abcdef0102030405',
      mac: 'abcdef0102030405060708090a0b0c0d',
    }),
  },
  SynodZK: {
    generateComplianceProof: jest.fn().mockResolvedValue({
      pi_a: ['0x1', '0x2'],
      pi_b: [['0x3', '0x4'], ['0x5', '0x6']],
      pi_c: ['0x7', '0x8'],
      public_inputs: ['hash123', '10000'],
    }),
  },
}));

describe('DashboardPage', () => {
  let originalFetch: typeof global.fetch;

  beforeAll(() => {
    // Silence console
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
    (console.log as jest.Mock).mockRestore();
    (console.error as jest.Mock).mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dashboard with main title and CTAs', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/api/telemetry')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    }) as any;

    render(<DashboardPage />);

    expect(screen.getByText('ATOMIC MULTI-AGENT')).toBeInTheDocument();
    expect(screen.getByText('ORCHESTRATION TEE')).toBeInTheDocument();
    expect(screen.getByText('OPEN CONSOLE')).toBeInTheDocument();
    expect(screen.getByText('AUDIT SPECIALISTS')).toBeInTheDocument();
  });

  it('handles orchestration lifecycle: success flow', async () => {
    const mockReceipt = {
      payoutId: 'payout_2282', // happy path scenario uses 2282
      recipientAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      amountUsd: 5000,
      timestamp: Date.now(),
      consensusDigest: 'digest-abc123xyz',
      signatures: {
        coordinator: 'sig-coord',
        specialistA: 'sig-spec-a',
        specialistB: 'sig-spec-b',
        executor: 'sig-exec',
      },
    };

    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/api/telemetry')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ timestamp: Date.now(), type: 'enclave', message: 'Consensus achieved' }]),
        });
      }
      if (url.includes('/api/action/compose')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'committed', receipt: mockReceipt }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    }) as any;

    render(<DashboardPage />);

    // Click Happy Path scenario preset button to set amount=5000 and limit=10000 (amount <= limit)
    const happyScenarioBtn = screen.getByRole('button', { name: /Happy Path/i });
    fireEvent.click(happyScenarioBtn);

    // Click "DEPLOY MULTI-AGENT TX" to start orchestration
    const runBtn = screen.getByRole('button', { name: /DEPLOY MULTI-AGENT TX/i });
    fireEvent.click(runBtn);

    // Wait for the composite receipt to be rendered
    await waitFor(() => {
      expect(screen.getByText('COMPOSITE VC RECEIPT')).toBeInTheDocument();
    }, { timeout: 4000 });

    // Verify receipt elements inside the JSON block
    expect(screen.getByText(/"consensusDigest"/i)).toBeInTheDocument();
    expect(screen.getByText(/"digest-abc123xyz"/i)).toBeInTheDocument();
  });

  it('handles orchestration lifecycle: veto / rollback flow', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/api/telemetry')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    }) as any;

    render(<DashboardPage />);

    // Click Boundary Veto scenario preset button (sets amount=15000, limit=10000, which triggers veto since amount > limit)
    const vetoScenarioBtn = screen.getByRole('button', { name: /Boundary Veto/i });
    fireEvent.click(vetoScenarioBtn);

    const runBtn = screen.getByRole('button', { name: /DEPLOY MULTI-AGENT TX/i });
    fireEvent.click(runBtn);

    // Wait for transaction status to update to aborted/vetoed (needs high timeout because of simulated delays)
    await waitFor(() => {
      expect(screen.getByText(/Compliance Veto/i) || screen.getByText(/exceeds limit threshold/i)).toBeInTheDocument();
    }, { timeout: 4000 });
  });
});
