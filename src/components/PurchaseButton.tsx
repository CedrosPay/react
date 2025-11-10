import React, { useState, useMemo, useCallback } from "react";
import { useCedrosTheme } from "../context";
import { usePaymentMode } from "../hooks/usePaymentMode";
import { useStripeCheckout } from "../hooks/useStripeCheckout";
import { PaymentModal } from "./PaymentModal";
import { createDedupedClickHandler } from "../utils/requestDeduplication";
import {
  emitPaymentStart,
  emitPaymentProcessing,
  emitPaymentSuccess,
  emitPaymentError,
} from "../utils/eventEmitter";
import { getCartItemCount } from "../utils/cartHelpers";
import { useTranslation } from "../i18n/useTranslation";
import type { CartItem } from "../types";

export interface PurchaseButtonProps {
  resource?: string;         // Single resource ID (for single-item payments)
  items?: CartItem[];        // Multiple items (for cart purchases) - mutually exclusive with resource
  label?: string;
  cardLabel?: string;
  cryptoLabel?: string;
  showCard?: boolean;
  showCrypto?: boolean;
  onPaymentAttempt?: (method: 'stripe' | 'crypto') => void; // Track payment attempt for analytics
  onPaymentSuccess?: (txId: string) => void;  // Legacy: used for auto-Stripe fallback only
  onPaymentError?: (error: string) => void;   // Legacy: used for auto-Stripe fallback only
  // Method-specific callbacks (new, preferred)
  onStripeSuccess?: (txId: string) => void;
  onCryptoSuccess?: (txId: string) => void;
  onStripeError?: (error: string) => void;
  onCryptoError?: (error: string) => void;
  customerEmail?: string;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
  couponCode?: string;
  autoDetectWallets?: boolean;
  testPageUrl?: string;
  hideMessages?: boolean;
  renderModal?: (props: {
    isOpen: boolean;
    onClose: () => void;
    resource?: string;
    items?: CartItem[];
    cardLabel?: string;
    cryptoLabel?: string;
    showCard?: boolean;
    showCrypto?: boolean;
    onPaymentAttempt?: (method: 'stripe' | 'crypto') => void;
    onPaymentSuccess?: (txId: string) => void;  // Legacy
    onPaymentError?: (error: string) => void;   // Legacy
    onStripeSuccess?: (txId: string) => void;
    onCryptoSuccess?: (txId: string) => void;
    onStripeError?: (error: string) => void;
    onCryptoError?: (error: string) => void;
    customerEmail?: string;
    successUrl?: string;
    cancelUrl?: string;
    metadata?: Record<string, string>;
    couponCode?: string;
    testPageUrl?: string;
    hideMessages?: boolean;
  }) => React.ReactNode;
}

export const PurchaseButton: React.FC<PurchaseButtonProps> = ({
  resource,
  items,
  label,
  cardLabel,
  cryptoLabel,
  showCard = true,
  showCrypto = true,
  onPaymentAttempt,
  onPaymentSuccess,
  onPaymentError,
  onStripeSuccess,
  onCryptoSuccess,
  onStripeError,
  onCryptoError,
  customerEmail,
  successUrl,
  cancelUrl,
  metadata,
  couponCode,
  autoDetectWallets = true,
  testPageUrl,
  hideMessages = false,
  renderModal,
}) => {
  const theme = useCedrosTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { status, processPayment, processCartCheckout } = useStripeCheckout();
  const { isCartMode, effectiveResource } = usePaymentMode(resource, items);
  const { t } = useTranslation();

  // Use translated default labels if not provided
  const buttonLabel = label || t('ui.purchase');
  const buttonCardLabel = cardLabel || t('ui.card');
  const buttonCryptoLabel = cryptoLabel || t('ui.usdc_solana');

  // Core click logic (without deduplication)
  const executeClick = useCallback(async () => {
    // SECURITY FIX: Only auto-fallback to Stripe if BOTH conditions are met:
    // 1. No wallet detected AND
    // 2. Card payments are actually enabled (showCard={true})
    // This prevents charging customers on the wrong payment rail
    if (autoDetectWallets && showCard) {
      // Lazy-load wallet detection to improve tree-shaking for users who don't need it
      const { detectSolanaWallets } = await import("../utils/walletDetection");

      if (!detectSolanaWallets()) {
        // AUTO-STRIPE FALLBACK PATH - Add full telemetry (OBS-001 fix)
        const resourceId = isCartMode ? undefined : effectiveResource;
        const itemCount = isCartMode && items ? getCartItemCount(items) : undefined;

        // Emit payment start event
        emitPaymentStart('stripe', resourceId, itemCount);
        if (onPaymentAttempt) {
          onPaymentAttempt('stripe');
        }

        // Emit processing event
        emitPaymentProcessing('stripe', resourceId, itemCount);

        let result;

        if (isCartMode && items) {
          result = await processCartCheckout(
            items,
            successUrl,
            cancelUrl,
            metadata,
            customerEmail,
            couponCode
          );
        } else if (effectiveResource) {
          result = await processPayment(
            effectiveResource,
            successUrl,
            cancelUrl,
            metadata,
            customerEmail,
            couponCode
          );
        }

        if (result && result.success && result.transactionId) {
          // Emit success event
          emitPaymentSuccess('stripe', result.transactionId, resourceId, itemCount);

          // Call method-specific callback (LOGIC-001 fix)
          if (onStripeSuccess) {
            onStripeSuccess(result.transactionId);
          } else if (onPaymentSuccess) {
            onPaymentSuccess(result.transactionId);
          }
        } else if (result && !result.success && result.error) {
          // Emit error event
          emitPaymentError('stripe', result.error, resourceId, itemCount);

          // Call method-specific callback (LOGIC-001 fix)
          if (onStripeError) {
            onStripeError(result.error);
          } else if (onPaymentError) {
            onPaymentError(result.error);
          }
        }
        return;
      }
    }

    // Otherwise, show the modal
    setIsModalOpen(true);
  }, [autoDetectWallets, showCard, isCartMode, items, effectiveResource, processCartCheckout, processPayment, successUrl, cancelUrl, metadata, customerEmail, couponCode, onPaymentSuccess, onPaymentError, onStripeSuccess, onStripeError, onPaymentAttempt]);

  // Create unique button ID for deduplication
  const buttonId = useMemo(() => {
    if (isCartMode && items) {
      return `purchase-cart-${items.map(i => i.resource).join('-')}`;
    }
    return `purchase-${effectiveResource || 'unknown'}`;
  }, [isCartMode, items, effectiveResource]);

  // Wrap with deduplication + cooldown (0.2s)
  const handleClick = useMemo(
    () => createDedupedClickHandler(buttonId, executeClick),
    [buttonId, executeClick]
  );

  const isLoading = status === "loading";

  const modalProps = {
    isOpen: isModalOpen,
    onClose: () => setIsModalOpen(false),
    resource: isCartMode ? undefined : effectiveResource,
    items: isCartMode ? items : undefined,
    cardLabel: buttonCardLabel,
    cryptoLabel: buttonCryptoLabel,
    showCard,
    showCrypto,
    onPaymentAttempt,
    onPaymentSuccess: (txId: string) => {
      setIsModalOpen(false);
      onPaymentSuccess?.(txId);
    },
    onPaymentError: (error: string) => {
      setIsModalOpen(false);
      onPaymentError?.(error);
    },
    onStripeSuccess: (txId: string) => {
      setIsModalOpen(false);
      onStripeSuccess?.(txId);
    },
    onCryptoSuccess: (txId: string) => {
      setIsModalOpen(false);
      onCryptoSuccess?.(txId);
    },
    onStripeError: (error: string) => {
      setIsModalOpen(false);
      onStripeError?.(error);
    },
    onCryptoError: (error: string) => {
      setIsModalOpen(false);
      onCryptoError?.(error);
    },
    customerEmail,
    successUrl,
    cancelUrl,
    metadata,
    couponCode,
    testPageUrl,
    hideMessages,
  };

  return (
    <div className={theme.unstyled ? '' : theme.className} style={theme.unstyled ? {} : theme.style}>
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={theme.unstyled ? '' : 'cedros-theme__button cedros-theme__stripe'}
        style={{
          width: "100%",
          cursor: isLoading ? "not-allowed" : "pointer",
          opacity: isLoading ? 0.6 : 1,
        }}
        type="button"
      >
        {isLoading ? t('ui.processing') : buttonLabel}
      </button>

      {renderModal ? renderModal(modalProps) : <PaymentModal {...modalProps} />}
    </div>
  );
};
