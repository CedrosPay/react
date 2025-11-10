/**
 * @cedrospay/react/stripe-only
 *
 * Stripe-only build (no Solana dependencies)
 * Bundle size: ~75KB (vs ~950KB for full build)
 *
 * Use this entry point if you only need Stripe payments.
 *
 * @example
 * ```typescript
 * // In your package.json or import statement
 * import { CedrosProvider, StripeButton } from '@cedrospay/react/stripe-only';
 * ```
 */

// Context (Stripe-only version without Solana providers)
export { CedrosProvider, useCedrosContext, useCedrosTheme, type CedrosContextValue } from './context';

// Stripe Components
export { StripeButton } from './components/StripeButton';
export { PaymentModal } from './components/PaymentModal';
export type { PaymentModalProps } from './components/PaymentModal';
export { ProductPrice, PaymentMethodBadge } from './components/ProductPrice';
export type { PaymentMethod } from './components/ProductPrice';

// Stripe Hook
export { useStripeCheckout } from './hooks/useStripeCheckout';
export { usePaymentMode } from './hooks/usePaymentMode';

// Core Types (Stripe-relevant only)
export type {
  CedrosConfig,
  PaymentStatus,
  Currency,
  StripeSessionRequest,
  StripeSessionResponse,
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

// Manager Interface (Stripe only)
export type { IStripeManager } from './managers/StripeManager';
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

// Styles
import './styles.css';
