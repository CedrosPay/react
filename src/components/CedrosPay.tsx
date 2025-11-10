import React from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { StripeButton } from './StripeButton';
import { CryptoButton } from './CryptoButton';
import { PurchaseButton } from './PurchaseButton';
import { useCedrosContext } from '../context';
import { useCedrosTheme } from '../context';
import { usePaymentMode } from '../hooks/usePaymentMode';
import { clusterApiUrl } from '@solana/web3.js';
import { getLogger } from '../utils/logger';
import { getCartItemCount } from '../utils/cartHelpers';
import type {
  CheckoutOptions,
  DisplayOptions,
  CallbackOptions,
  AdvancedOptions,
  CartItem,
} from '../types';

/**
 * Props for CedrosPay component
 *
 * Uses extensible options pattern for future-proof API:
 * - `checkout`: Customer info, coupons, redirects, metadata
 * - `display`: Labels, visibility, layout, className
 * - `callbacks`: Payment lifecycle event handlers
 * - `advanced`: Wallet config, testing options
 *
 * @example
 * // Single item purchase
 * <CedrosPay
 *   resource="item-1"
 *   checkout={{ customerEmail: "user@example.com", couponCode: "SAVE20" }}
 *   display={{ cardLabel: "Pay with Card", layout: "horizontal" }}
 *   callbacks={{ onPaymentSuccess: (result) => console.log(result) }}
 * />
 *
 * @example
 * // Cart checkout with multiple items
 * <CedrosPay
 *   items={[
 *     { resource: "item-1", quantity: 2 },
 *     { resource: "item-2", quantity: 1 }
 *   ]}
 *   checkout={{ customerEmail: "user@example.com" }}
 *   display={{ layout: "horizontal" }}
 * />
 *
 * @example
 * // Unified purchase button with modal
 * <CedrosPay
 *   resource="item-1"
 *   display={{ showPurchaseButton: true, purchaseLabel: "Buy Now" }}
 *   advanced={{ autoDetectWallets: true }}
 * />
 */
export interface CedrosPayProps {
  /** Single item resource ID (mutually exclusive with items) */
  resource?: string;

  /** Multiple items for cart checkout (mutually exclusive with resource) */
  items?: CartItem[];

  /** Checkout options: customer info, coupons, redirects, metadata */
  checkout?: CheckoutOptions;

  /** Display options: labels, visibility, layout, className */
  display?: DisplayOptions;

  /** Callback options: payment lifecycle event handlers */
  callbacks?: CallbackOptions;

  /** Advanced options: wallet config, testing */
  advanced?: AdvancedOptions;
}

export function CedrosPay(props: CedrosPayProps) {
  const { resource, items, checkout = {}, display = {}, callbacks = {}, advanced = {} } = props;
  const { config, walletPool } = useCedrosContext();
  const theme = useCedrosTheme();
  const { isCartMode } = usePaymentMode(resource, items);

  // Memoize cart notification style to prevent unnecessary re-renders
  const cartNotificationStyle = React.useMemo(() => ({
    marginTop: '0.5rem',
    fontSize: '0.875rem',
    color: theme.tokens.surfaceText,
    opacity: 0.7,
    textAlign: 'center' as const,
  }), [theme.tokens.surfaceText]);

  // Memoize wallets array to prevent WalletProvider re-initialization on every render
  // Use context-scoped wallet pool to prevent multi-tenant leakage and ensure proper cleanup
  const wallets = React.useMemo(
    () => advanced.wallets && advanced.wallets.length > 0 ? advanced.wallets : walletPool.getAdapters(),
    [advanced.wallets, walletPool]
  );

  // Memoize cart item count to avoid recalculating on every render
  const cartItemCount = React.useMemo(
    () => items ? getCartItemCount(items) : 0,
    [items]
  );

  // CRITICAL FIX: Memoize callback wrappers to prevent infinite loops
  // Without memoization, these arrow functions create new references on every render,
  // causing child components' useEffect hooks to re-run infinitely
  const handleStripeSuccess = React.useMemo(
    () => callbacks.onPaymentSuccess ? (txId: string) => callbacks.onPaymentSuccess!({ transactionId: txId, method: 'stripe' }) : undefined,
    [callbacks.onPaymentSuccess]
  );

  const handleCryptoSuccess = React.useMemo(
    () => callbacks.onPaymentSuccess ? (txId: string) => callbacks.onPaymentSuccess!({ transactionId: txId, method: 'crypto' }) : undefined,
    [callbacks.onPaymentSuccess]
  );

  const handleStripeError = React.useMemo(
    () => callbacks.onPaymentError ? (error: string) => callbacks.onPaymentError!({ message: error, method: 'stripe' }) : undefined,
    [callbacks.onPaymentError]
  );

  const handleCryptoError = React.useMemo(
    () => callbacks.onPaymentError ? (error: string) => callbacks.onPaymentError!({ message: error, method: 'crypto' }) : undefined,
    [callbacks.onPaymentError]
  );

  const endpoint = config.solanaEndpoint ?? clusterApiUrl(config.solanaCluster);

  // Validate input (after all hooks)
  if (!resource && (!items || items.length === 0)) {
    getLogger().error('CedrosPay: Must provide either "resource" or "items" prop');
    return (
      <div className={display.className} style={{ color: theme.tokens.errorText }}>
        Configuration error: No resource or items provided
      </div>
    );
  }

  // Extract final values with defaults
  const showCard = display.showCard ?? true;
  const showCrypto = display.showCrypto ?? true;
  const showPurchaseButton = display.showPurchaseButton ?? false;
  const layout = display.layout ?? 'vertical';
  const hideMessages = display.hideMessages ?? false;
  const autoDetectWallets = advanced.autoDetectWallets ?? true;

  return (
    <div className={theme.unstyled ? display.className : theme.className} style={theme.unstyled ? {} : theme.style}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect={false}>
          <div className={theme.unstyled ? display.className : `cedros-theme__pay ${display.className || ''}`}>
            <div className={theme.unstyled ? '' : `cedros-theme__pay-content cedros-theme__pay-content--${layout}`}>
              {showPurchaseButton ? (
                <PurchaseButton
                  resource={isCartMode ? undefined : (resource || items?.[0]?.resource)}
                  items={isCartMode ? items : undefined}
                  label={display.purchaseLabel}
                  cardLabel={display.cardLabel}
                  cryptoLabel={display.cryptoLabel}
                  showCard={showCard}
                  showCrypto={showCrypto}
                  onPaymentAttempt={callbacks.onPaymentAttempt}
                  onPaymentSuccess={handleStripeSuccess}
                  onPaymentError={handleStripeError}
                  onStripeSuccess={handleStripeSuccess}
                  onCryptoSuccess={handleCryptoSuccess}
                  onStripeError={handleStripeError}
                  onCryptoError={handleCryptoError}
                  customerEmail={checkout.customerEmail}
                  successUrl={checkout.successUrl}
                  cancelUrl={checkout.cancelUrl}
                  metadata={checkout.metadata}
                  couponCode={checkout.couponCode}
                  autoDetectWallets={autoDetectWallets}
                  testPageUrl={advanced.testPageUrl}
                  hideMessages={hideMessages}
                  renderModal={display.renderModal}
                />
              ) : (
                <>
                  {showCard && (
                    <StripeButton
                      resource={isCartMode ? undefined : (resource || items?.[0]?.resource)}
                      items={isCartMode ? items : undefined}
                      customerEmail={checkout.customerEmail}
                      successUrl={checkout.successUrl}
                      cancelUrl={checkout.cancelUrl}
                      metadata={checkout.metadata}
                      couponCode={checkout.couponCode}
                      label={display.cardLabel}
                      onAttempt={callbacks.onPaymentAttempt}
                      onSuccess={handleStripeSuccess}
                      onError={handleStripeError}
                    />
                  )}
                  {showCrypto && (
                    <CryptoButton
                      resource={isCartMode ? undefined : (resource || items?.[0]?.resource)}
                      items={isCartMode ? items : undefined}
                      metadata={checkout.metadata}
                      couponCode={checkout.couponCode}
                      label={display.cryptoLabel}
                      onAttempt={callbacks.onPaymentAttempt}
                      onSuccess={handleCryptoSuccess}
                      onError={handleCryptoError}
                      testPageUrl={advanced.testPageUrl}
                      hideMessages={hideMessages}
                    />
                  )}
                </>
              )}
              {isCartMode && items && items.length > 1 && !hideMessages && (
                <div style={cartNotificationStyle}>
                  Checking out {cartItemCount} items
                </div>
              )}
            </div>
          </div>
        </WalletProvider>
      </ConnectionProvider>
    </div>
  );
}
