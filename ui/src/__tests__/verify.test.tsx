import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CompositeReceipt from '@/components/CompositeReceipt';

describe('CompositeReceipt component verification', () => {
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

  const mockReceipt = {
    payoutId: 'payout_2282',
    recipientAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    amountUsd: 5000,
    timestamp: Date.now(),
    issuer: 'did:t3n:synod-enclave-authority',
    consensusDigest: 'digest-abc123xyz',
    signatures: {
      coordinator: 'sig-coord',
    },
  };

  it('renders nothing when receipt is null', () => {
    const { container } = render(<CompositeReceipt receipt={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders receipt details and handles verification success', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/api/integrations/verify')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ valid: true }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }) as any;

    render(<CompositeReceipt receipt={mockReceipt} />);

    expect(screen.getByText('COMPOSITE VC RECEIPT')).toBeInTheDocument();
    expect(screen.getByText(/"payoutId": "payout_2282"/i)).toBeInTheDocument();
    expect(screen.getByText(/Issuer:/i)).toBeInTheDocument();

    const verifyBtn = screen.getByRole('button', { name: /Verify Receipt Signature/i });
    fireEvent.click(verifyBtn);

    // Wait for "Signature Verified" alert to be rendered
    await waitFor(() => {
      expect(screen.getByText('Signature Verified')).toBeInTheDocument();
    });
    expect(screen.getByText(/Valid cryptographic proof/i)).toBeInTheDocument();
  });

  it('handles verification failure', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/api/integrations/verify')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ valid: false }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }) as any;

    render(<CompositeReceipt receipt={mockReceipt} />);

    const verifyBtn = screen.getByRole('button', { name: /Verify Receipt Signature/i });
    fireEvent.click(verifyBtn);

    // Wait for "Verification Failed" alert to be rendered
    await waitFor(() => {
      expect(screen.getByText('Verification Failed')).toBeInTheDocument();
    });
    expect(screen.getByText(/receipt format is invalid/i)).toBeInTheDocument();
  });
});
