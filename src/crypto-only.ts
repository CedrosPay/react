/**
 * @cedros/pay-react/crypto-only
 *
 * Crypto-only build (no Stripe dependencies)
 * Bundle size: ~900KB (Solana web3.js + wallet adapters)
 *
 * Use this entry point if you only need Solana crypto payments.
 *
 * @example
 * ```typescript
 * // In your package.json or import statement
 * import { CedrosProvider, CryptoButton } from '@cedros/pay-react/crypto-only';
 * ```
 */

// Context (Crypto-only version without Stripe providers)
export { CedrosProvider, useCedrosContext, useCedrosTheme, type CedrosContextValue } from './context';

// Crypto Components
export { CryptoButton } from './components/CryptoButton';
export { PaymentModal } from './components/PaymentModal';
export type { PaymentModalProps } from './components/PaymentModal';
export { ProductPrice, PaymentMethodBadge } from './components/ProductPrice';
export type { PaymentMethod } from './components/ProductPrice';

// Crypto Hooks
export { useX402Payment } from './hooks/useX402Payment';
export { usePaymentMode } from './hooks/usePaymentMode';

// Core Types (Crypto-relevant only)
export type {
  CedrosConfig,
  PaymentStatus,
  Currency,
  X402Requirement,
  X402Response,
  PaymentPayload,
  SettlementResponse,
  PaymentResult,
  PaymentMetadata,
  PaymentState,
  CedrosThemeMode,
  CedrosThemeTokens,
  Product,
  CartItem,
  PaymentErrorCode,
  PaymentError,
  ErrorResponse,
} from './types';

// Error code categories
export { ERROR_CATEGORIES } from './types/errors';

// Manager Interface (Crypto only)
export type { IX402Manager } from './managers/X402Manager';
export type { IWalletManager } from './managers/WalletManager';
export type { IRouteDiscoveryManager } from './managers/RouteDiscoveryManager';

// Utils
export {
  validateConfig,
  parseCouponCodes,
  formatCouponCodes,
  calculateDiscountPercentage,
  createRateLimiter,
  RATE_LIMITER_PRESETS,
  type RateLimiter,
  type RateLimiterConfig,
} from './utils';

// Logging
export {
  LogLevel,
  Logger,
  getLogger,
  createLogger,
  type LoggerConfig,
} from './utils/logger';

// Event System
export {
  CEDROS_EVENTS,
  emitPaymentStart,
  emitPaymentProcessing,
  emitPaymentSuccess,
  emitPaymentError,
  type PaymentStartDetail,
  type PaymentProcessingDetail,
  type PaymentSuccessDetail,
  type PaymentErrorDetail,
} from './utils';

// Error Handling
export {
  parseStructuredErrorResponse,
  isRetryableError,
  getUserErrorMessage,
} from './utils';

// Solana-specific utilities
export { validateTokenMint, KNOWN_STABLECOINS } from './utils/tokenMintValidator';

// Styles
import './styles.css';
