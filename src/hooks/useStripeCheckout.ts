import { useState, useCallback } from 'react';
import { useCedrosContext } from '../context';
import type { PaymentState, StripeSessionRequest } from '../types';
import { normalizeCartItems } from '../utils/cartHelpers';

/**
 * Hook for Stripe checkout flow
 *
 * Handles:
 * - Creating Stripe session
 * - Redirecting to checkout
 * - Managing payment state
 */
export function useStripeCheckout() {
  const { stripeManager } = useCedrosContext();
  const [state, setState] = useState<PaymentState>({
    status: 'idle',
    error: null,
    transactionId: null,
  });

  const processPayment = useCallback(
    async (
      resource: string,
      successUrl?: string,
      cancelUrl?: string,
      metadata?: Record<string, string>,
      customerEmail?: string,
      couponCode?: string
    ) => {
      setState({
        status: 'loading',
        error: null,
        transactionId: null,
      });

      const request: StripeSessionRequest = {
        resource,
        successUrl,
        cancelUrl,
        metadata,
        customerEmail,
        couponCode,
      };

      const result = await stripeManager.processPayment(request);
      setState({
        status: result.success ? 'success' : 'error',
        error: result.success ? null : (result.error || 'Payment failed'),
        transactionId: result.success ? (result.transactionId || null) : null,
      });
      return result;
    },
    [stripeManager]
  );

  const processCartCheckout = useCallback(
    async (
      items: Array<{ resource: string; quantity?: number }>,
      successUrl?: string,
      cancelUrl?: string,
      metadata?: Record<string, string>,
      customerEmail?: string,
      couponCode?: string
    ) => {
      setState({
        status: 'loading',
        error: null,
        transactionId: null,
      });

      // Normalize items before passing to manager
      const normalizedItems = normalizeCartItems(items);

      const result = await stripeManager.processCartCheckout({
        items: normalizedItems,
        successUrl,
        cancelUrl,
        metadata,
        customerEmail,
        couponCode,
      });

      setState({
        status: result.success ? 'success' : 'error',
        error: result.success ? null : (result.error || 'Cart checkout failed'),
        transactionId: result.success ? (result.transactionId || null) : null,
      });
      return result;
    },
    [stripeManager]
  );

  const reset = useCallback(() => {
    setState({
      status: 'idle',
      error: null,
      transactionId: null,
    });
  }, []);

  return {
    ...state,
    processPayment,
    processCartCheckout,
    reset,
  };
}
