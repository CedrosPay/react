/**
 * E2E Tests: Stripe Payment Flow
 *
 * Tests the complete Stripe payment journey:
 * 1. Provider setup with real config
 * 2. Button click → session creation
 * 3. Manager caching across components
 * 4. Error handling
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CedrosProvider } from '../../context';
import { StripeButton } from '../../components/StripeButton';
import { PurchaseButton } from '../../components/PurchaseButton';
import { mockBackendAPIs, cleanupE2E } from './setup';
import type { CedrosConfig } from '../../types';

// Create mock Stripe instance that can be accessed in tests
const mockRedirectToCheckout = vi.fn().mockResolvedValue({ error: null });
const mockStripeInstance = {
  redirectToCheckout: mockRedirectToCheckout,
};

// Hoisted mocks - these run before any imports
vi.mock('@solana/web3.js', () => ({
  clusterApiUrl: vi.fn(() => 'https://api.devnet.solana.com'),
  Connection: class {
    async getLatestBlockhash() {
      return { blockhash: 'mock-blockhash', lastValidBlockHeight: 1000000 };
    }
    async getBalance() {
      return 1000000000;
    }
    async getSignatureStatus() {
      return { value: { confirmationStatus: 'confirmed' } };
    }
    async getAccountInfo() {
      return null;
    }
  },
  SystemProgram: {
    transfer: vi.fn(() => ({})),
  },
  Transaction: class {
    recentBlockhash?: string;
    feePayer?: unknown;
    instructions: unknown[] = [];
    add(instruction: unknown) {
      this.instructions.push(instruction);
      return this;
    }
    serialize() {
      return new Uint8Array([1, 2, 3]);
    }
  },
  LAMPORTS_PER_SOL: 1_000_000_000,
  PublicKey: class {
    constructor(public value: string | Uint8Array) {}
    toString() {
      return typeof this.value === 'string' ? this.value : 'mockPublicKey';
    }
    toBase58() {
      return this.toString();
    }
  },
}));

vi.mock('@solana/spl-token', () => ({
  getAssociatedTokenAddress: vi.fn(async () => ({
    toBase58: () => 'mockTokenAddress',
  })),
  createTransferInstruction: vi.fn(() => ({})),
}));

vi.mock('@solana/wallet-adapter-react', () => ({
  ConnectionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  WalletProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useWallet: () => ({
    connected: false,
    connecting: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    publicKey: null,
    signTransaction: vi.fn(),
    signAllTransactions: vi.fn(),
    select: vi.fn(),
    wallets: [],
    wallet: null,
  }),
  useConnection: () => ({
    connection: {
      getLatestBlockhash: vi.fn().mockResolvedValue({
        blockhash: 'mock-blockhash',
        lastValidBlockHeight: 1000000,
      }),
    },
  }),
}));

vi.mock('@solana/wallet-adapter-wallets', () => ({
  PhantomWalletAdapter: class {
    name = 'Phantom';
  },
  SolflareWalletAdapter: class {
    name = 'Solflare';
  },
  BackpackWalletAdapter: class {
    name = 'Backpack';
  },
}));

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(async () => mockStripeInstance),
}));

vi.mock('../../utils/walletDetection', () => ({
  detectSolanaWallets: vi.fn().mockReturnValue(false),
}));

describe('E2E: Stripe Payment Flow', () => {
  let cleanupFetch: () => void;

  const testConfig: CedrosConfig = {
    stripePublicKey: 'pk_test_e2e_123',
    serverUrl: 'http://localhost:8080',
    solanaCluster: 'devnet',
  };

  beforeEach(() => {
    cleanupFetch = mockBackendAPIs();
    // Reset mock calls
    mockRedirectToCheckout.mockClear();
  });

  afterEach(() => {
    cleanupFetch();
    cleanupE2E();
  });

  describe('Single Item Payment', () => {
    it('completes full payment flow: button click → session creation → redirect', async () => {
      const onAttempt = vi.fn();

      render(
        <CedrosProvider config={testConfig}>
          <StripeButton
            resource="test-product-1"
            label="Pay $10"
            onAttempt={onAttempt}
          />
        </CedrosProvider>
      );

      // User sees the button
      const button = screen.getByRole('button', { name: /pay \$10/i });
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();

      // User clicks the button
      const user = userEvent.setup();
      await user.click(button);

      // onAttempt callback fired
      await waitFor(() => {
        expect(onAttempt).toHaveBeenCalledWith('stripe');
      });

      // Backend API called to create session
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/stripe-session'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('test-product-1'),
          })
        );
      });

      // Stripe.js redirect called - this is the end of the flow in a browser
      // as the page redirects to Stripe checkout
      await waitFor(() => {
        expect(mockRedirectToCheckout).toHaveBeenCalledWith({
          sessionId: 'sess_test_123',
        });
      });

      // Note: onSuccess doesn't fire for redirect-based checkout because
      // the browser navigates to Stripe. Success is handled via webhooks.
    });

    it('handles session creation errors gracefully', async () => {
      const onError = vi.fn();

      // Mock failed API response
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(() =>
        Promise.resolve(new Response(JSON.stringify({ error: 'Invalid product' }), {
          status: 400,
        }))
      );

      render(
        <CedrosProvider config={testConfig}>
          <StripeButton
            resource="invalid-product"
            onError={onError}
          />
        </CedrosProvider>
      );

      const button = screen.getByRole('button', { name: /pay with card/i });
      const user = userEvent.setup();
      await user.click(button);

      // Error callback fired
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.stringContaining('Invalid product'));
      });

      // Button returns to ready state
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /pay with card/i })).not.toBeDisabled();
      });
    });

    it('passes metadata and customer email to session creation', async () => {
      // Use unique resource to avoid deduplication
      render(
        <CedrosProvider config={testConfig}>
          <StripeButton
            resource="test-product-metadata"
            customerEmail="user@example.com"
            metadata={{ userId: 'user123', plan: 'premium' }}
            successUrl="https://example.com/success"
            cancelUrl="https://example.com/cancel"
          />
        </CedrosProvider>
      );

      const button = screen.getByRole('button');
      const user = userEvent.setup();
      await user.click(button);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            body: expect.stringContaining('user@example.com'),
          })
        );

        const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
        const sessionCall = fetchCalls.find(call =>
          call[0].toString().includes('/stripe-session')
        );

        if (sessionCall) {
          const body = JSON.parse(sessionCall[1].body as string);
          expect(body.customerEmail).toBe('user@example.com');
          expect(body.metadata).toEqual({ userId: 'user123', plan: 'premium' });
          expect(body.successUrl).toBe('https://example.com/success');
          expect(body.cancelUrl).toBe('https://example.com/cancel');
        }
      });
    });

    it('applies coupon codes to session creation', async () => {
      render(
        <CedrosProvider config={testConfig}>
          <StripeButton
            resource="test-product-1"
            couponCode="SAVE20"
          />
        </CedrosProvider>
      );

      const button = screen.getByRole('button');
      const user = userEvent.setup();
      await user.click(button);

      await waitFor(() => {
        const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
        const sessionCall = fetchCalls.find(call =>
          call[0].toString().includes('/stripe-session')
        );

        if (sessionCall) {
          const body = JSON.parse(sessionCall[1].body as string);
          expect(body.couponCode).toBe('SAVE20');
        }
      });
    });
  });

  describe('Cart Payment', () => {
    it('processes cart checkout with multiple items', async () => {
      const cartItems = [
        { resource: 'product-1', quantity: 2 },
        { resource: 'product-2', quantity: 1 },
      ];

      render(
        <CedrosProvider config={testConfig}>
          <StripeButton items={cartItems} label="Checkout" />
        </CedrosProvider>
      );

      const button = screen.getByRole('button', { name: /checkout/i });
      const user = userEvent.setup();
      await user.click(button);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/cart/checkout'),
          expect.objectContaining({
            method: 'POST',
          })
        );

        const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
        const cartCall = fetchCalls.find(call =>
          call[0].toString().includes('/cart/checkout')
        );

        if (cartCall) {
          const body = JSON.parse(cartCall[1].body as string);
          expect(body.items).toHaveLength(2);
          expect(body.items[0].resource).toBe('product-1');
          expect(body.items[0].quantity).toBe(2);
        }
      });
    });
  });

  describe('PurchaseButton Fallback', () => {
    it('auto-fallbacks to Stripe when no wallet detected', async () => {
      render(
        <CedrosProvider config={testConfig}>
          <PurchaseButton
            resource="test-product-1"
            label="Purchase"
            showCard={true}
            showCrypto={true}
            autoDetectWallets={true}
          />
        </CedrosProvider>
      );

      const button = screen.getByRole('button', { name: /purchase/i });
      const user = userEvent.setup();
      await user.click(button);

      // Should auto-fallback to Stripe (no modal shown)
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/stripe-session'),
          expect.anything()
        );
      });

      // Modal should not appear
      expect(screen.queryByText(/choose payment method/i)).not.toBeInTheDocument();
    });
  });

  describe('Request Deduplication', () => {
    it('prevents duplicate session creation from rapid clicks', async () => {
      render(
        <CedrosProvider config={testConfig}>
          <StripeButton resource="test-product-1" />
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

      // Wait for any pending requests
      await waitFor(() => {
        const sessionCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(call =>
          call[0].toString().includes('/stripe-session')
        );

        // Should only make 1 API call (deduplication working)
        expect(sessionCalls.length).toBeLessThanOrEqual(1);
      });
    });
  });
});
