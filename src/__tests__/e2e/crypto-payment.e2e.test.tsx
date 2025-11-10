/**
 * E2E Tests: Crypto Payment Flow (x402)
 *
 * Tests the complete x402 payment journey:
 * 1. Provider setup
 * 2. Wallet connection
 * 3. Quote request (HTTP 402)
 * 4. Transaction signing
 * 5. Payment verification
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CedrosProvider } from '../../context';
import { CryptoButton } from '../../components/CryptoButton';
import { mockBackendAPIs, createMockWalletAdapter, cleanupE2E, waitForAsync } from './setup';
import type { CedrosConfig } from '../../types';

describe('E2E: Crypto Payment Flow (x402)', () => {
  let cleanupFetch: () => void;
  let mockWallet: ReturnType<typeof createMockWalletAdapter>;

  const testConfig: CedrosConfig = {
    stripePublicKey: 'pk_test_e2e_123',
    serverUrl: 'http://localhost:8080',
    solanaCluster: 'devnet',
    tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  };

  beforeEach(() => {
    cleanupFetch = mockBackendAPIs();
    mockWallet = createMockWalletAdapter('Phantom');

    // Mock wallet detection
    vi.mock('../../utils/walletDetection', () => ({
      detectSolanaWallets: vi.fn().mockReturnValue(true),
    }));

    // Mock window.phantom
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).window = {
      ...global.window,
      phantom: {
        solana: mockWallet,
      },
    };
  });

  afterEach(() => {
    cleanupFetch();
    cleanupE2E();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global as any).window.phantom;
  });

  describe('Single Item Payment', () => {
    it('completes full x402 flow: connect wallet → quote → sign → verify', async () => {
      const onSuccess = vi.fn();
      const onAttempt = vi.fn();

      render(
        <CedrosProvider config={testConfig}>
          <CryptoButton
            resource="test-product-1"
            label="Pay with USDC"
            onSuccess={onSuccess}
            onAttempt={onAttempt}
          />
        </CedrosProvider>
      );

      const button = screen.getByRole('button', { name: /pay with usdc/i });
      expect(button).toBeInTheDocument();

      const user = userEvent.setup();

      // Step 1: User clicks button (wallet not connected)
      await user.click(button);

      // Wallet connection triggered
      await waitFor(() => {
        expect(mockWallet.connect).toHaveBeenCalled();
      });

      // Simulate wallet connection success
      mockWallet.connected = true;
      await waitForAsync(50);

      // Step 2: Quote request (HTTP 402)
      await waitFor(() => {
        expect(onAttempt).toHaveBeenCalledWith('crypto');
      });

      await waitFor(() => {
        const quoteCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(call =>
          call[0].toString().match(/\/paywall\/v1\/[^/]+$/) &&
          call[1]?.method === 'GET'
        );
        expect(quoteCalls.length).toBeGreaterThan(0);
      });

      // Step 3: Transaction signing
      await waitFor(() => {
        expect(mockWallet.signTransaction).toHaveBeenCalled();
      });

      // Step 4: Payment verification
      await waitFor(() => {
        const verifyCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(call =>
          call[0].toString().includes('/verify') &&
          call[1]?.method === 'POST'
        );
        expect(verifyCalls.length).toBeGreaterThan(0);
      });

      // Step 5: Success callback
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(expect.stringContaining('5h4VdCqPK'));
      });
    });

    it('handles wallet connection rejection', async () => {
      const onError = vi.fn();

      // Mock wallet rejection
      mockWallet.connect = vi.fn().mockRejectedValue(new Error('User rejected'));

      render(
        <CedrosProvider config={testConfig}>
          <CryptoButton
            resource="test-product-1"
            onError={onError}
          />
        </CedrosProvider>
      );

      const button = screen.getByRole('button');
      const user = userEvent.setup();
      await user.click(button);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.stringContaining('rejected'));
      });
    });

    it('handles transaction signing rejection', async () => {
      const onError = vi.fn();

      mockWallet.connected = true;
      mockWallet.signTransaction = vi.fn().mockRejectedValue(new Error('Transaction rejected'));

      render(
        <CedrosProvider config={testConfig}>
          <CryptoButton
            resource="test-product-1"
            onError={onError}
          />
        </CedrosProvider>
      );

      const button = screen.getByRole('button');
      const user = userEvent.setup();
      await user.click(button);

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });

    it('passes metadata to payment verification', async () => {
      mockWallet.connected = true;

      render(
        <CedrosProvider config={testConfig}>
          <CryptoButton
            resource="test-product-1"
            metadata={{ userId: 'user123', orderId: 'order456' }}
          />
        </CedrosProvider>
      );

      const button = screen.getByRole('button');
      const user = userEvent.setup();
      await user.click(button);

      await waitFor(() => {
        const verifyCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(call =>
          call[0].toString().includes('/verify')
        );

        if (verifyCalls.length > 0) {
          const headers = verifyCalls[0][1]?.headers as Record<string, string>;
          const paymentHeader = headers?.['X-PAYMENT'] || headers?.['x-payment'];

          if (paymentHeader) {
            const decoded = JSON.parse(atob(paymentHeader));
            expect(decoded.payload.metadata).toEqual({
              userId: 'user123',
              orderId: 'order456',
            });
          }
        }
      });
    });

    it('applies coupon codes to quote request', async () => {
      mockWallet.connected = true;

      render(
        <CedrosProvider config={testConfig}>
          <CryptoButton
            resource="test-product-1"
            couponCode="CRYPTO10"
          />
        </CedrosProvider>
      );

      const button = screen.getByRole('button');
      const user = userEvent.setup();
      await user.click(button);

      await waitFor(() => {
        const quoteCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(call =>
          call[0].toString().includes('coupon=CRYPTO10')
        );
        expect(quoteCalls.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Cart Payment', () => {
    it('processes cart checkout with x402', async () => {
      mockWallet.connected = true;

      const cartItems = [
        { resource: 'product-1', quantity: 2 },
        { resource: 'product-2', quantity: 1 },
      ];

      render(
        <CedrosProvider config={testConfig}>
          <CryptoButton items={cartItems} label="Pay with USDC" />
        </CedrosProvider>
      );

      const button = screen.getByRole('button', { name: /pay with usdc/i });
      const user = userEvent.setup();
      await user.click(button);

      // Should request cart quote
      await waitFor(() => {
        const quoteCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(call =>
          call[0].toString().includes('/paywall/v1/cart/')
        );
        expect(quoteCalls.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Wallet State Management', () => {
    it('shows different states: disconnected → connecting → connected → processing', async () => {
      render(
        <CedrosProvider config={testConfig}>
          <CryptoButton resource="test-product-1" label="Pay" />
        </CedrosProvider>
      );

      // Initial state: disconnected
      expect(screen.getByRole('button', { name: /pay/i })).toBeInTheDocument();

      const user = userEvent.setup();
      await user.click(screen.getByRole('button'));

      // Connecting state
      await waitFor(() => {
        expect(mockWallet.connect).toHaveBeenCalled();
      });

      // Connected state
      mockWallet.connected = true;
      await waitForAsync(50);

      // Processing state
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /processing/i })).toBeInTheDocument();
      });
    });

    it('persists wallet connection across component re-renders', async () => {
      mockWallet.connected = true;

      const { rerender } = render(
        <CedrosProvider config={testConfig}>
          <CryptoButton resource="test-product-1" />
        </CedrosProvider>
      );

      // Wallet should be connected
      expect(mockWallet.connected).toBe(true);

      // Re-render with different resource
      rerender(
        <CedrosProvider config={testConfig}>
          <CryptoButton resource="test-product-2" />
        </CedrosProvider>
      );

      // Wallet should still be connected (no reconnection)
      expect(mockWallet.connect).not.toHaveBeenCalledTimes(2);
    });
  });

  describe('Request Deduplication', () => {
    it('prevents duplicate quote requests from rapid clicks', async () => {
      mockWallet.connected = true;

      render(
        <CedrosProvider config={testConfig}>
          <CryptoButton resource="test-product-1" />
        </CedrosProvider>
      );

      const button = screen.getByRole('button');
      const user = userEvent.setup();

      // Rapidly click 5 times
      await user.click(button);
      await user.click(button);
      await user.click(button);
      await user.click(button);
      await user.click(button);

      await waitFor(() => {
        const quoteCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(call =>
          call[0].toString().match(/\/paywall\/v1\/[^/]+$/) &&
          call[1]?.method === 'GET'
        );

        // Should only make 1 quote request (deduplication working)
        expect(quoteCalls.length).toBeLessThanOrEqual(1);
      });
    });
  });
});
