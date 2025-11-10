/**
 * E2E Tests: Stripe Payment Flow
 *
 * Tests the complete Stripe payment journey:
 * 1. Provider setup with real config
 * 2. Button click → session creation
 * 3. Manager caching across components
 * 4. Error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CedrosProvider } from '../../context';
import { StripeButton } from '../../components/StripeButton';
import { PurchaseButton } from '../../components/PurchaseButton';
import { mockLoadStripe, mockBackendAPIs, cleanupE2E } from './setup';
import type { CedrosConfig } from '../../types';

describe('E2E: Stripe Payment Flow', () => {
  let cleanupFetch: () => void;
  let mockStripe: ReturnType<typeof mockLoadStripe>;

  const testConfig: CedrosConfig = {
    stripePublicKey: 'pk_test_e2e_123',
    serverUrl: 'http://localhost:8080',
    solanaCluster: 'devnet',
  };

  beforeEach(() => {
    mockStripe = mockLoadStripe();
    cleanupFetch = mockBackendAPIs();
  });

  afterEach(() => {
    cleanupFetch();
    cleanupE2E();
  });

  describe('Single Item Payment', () => {
    it('completes full payment flow: button click → session creation → redirect', async () => {
      const onSuccess = vi.fn();
      const onAttempt = vi.fn();

      render(
        <CedrosProvider config={testConfig}>
          <StripeButton
            resource="test-product-1"
            label="Pay $10"
            onSuccess={onSuccess}
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

      // Button shows loading state
      expect(screen.getByRole('button', { name: /processing/i })).toBeInTheDocument();

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

      // Stripe.js redirect called
      await waitFor(() => {
        expect(mockStripe.redirectToCheckout).toHaveBeenCalledWith({
          sessionId: 'sess_test_123',
        });
      });

      // Success callback fired
      expect(onSuccess).toHaveBeenCalledWith('sess_test_123');
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
      render(
        <CedrosProvider config={testConfig}>
          <StripeButton
            resource="test-product-1"
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
      // Mock no wallet detected
      vi.mock('../../utils/walletDetection', () => ({
        detectSolanaWallets: vi.fn().mockReturnValue(false),
      }));

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
