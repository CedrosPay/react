/**
 * @cedros/pay-react - Unified Stripe and Solana payments for React
 *
 * Main library exports
 */

// Components
export { CedrosPay } from './components/CedrosPay';
export { StripeButton } from './components/StripeButton';
export { CryptoButton } from './components/CryptoButton';
export { PurchaseButton } from './components/PurchaseButton';
export type { PurchaseButtonProps } from './components/PurchaseButton';
export { PaymentModal } from './components/PaymentModal';
export type { PaymentModalProps } from './components/PaymentModal';
export { ProductPrice, PaymentMethodBadge } from './components/ProductPrice';
export type { PaymentMethod } from './components/ProductPrice';

// Context
export { CedrosProvider, useCedrosContext, useCedrosTheme, type CedrosContextValue } from './context';

// Hooks
export { useStripeCheckout } from './hooks/useStripeCheckout';
export { useX402Payment } from './hooks/useX402Payment';
export { useRefundVerification } from './hooks/useRefundVerification';
export { usePaymentMode } from './hooks/usePaymentMode';

// Types
export type {
  CedrosConfig,
  SolanaCluster,
  PaymentStatus,
  Currency,
  X402Requirement,
  X402Response,
  PaymentPayload,
  SettlementResponse,
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
  // Future-proof component options (PaymentMethod already exported from ProductPrice)
  FuturePaymentMethod,
  PaymentSuccessResult,
  PaymentErrorDetail as PaymentErrorInfo,
  CheckoutOptions,
  DisplayOptions,
  ModalRenderProps,
  CallbackOptions,
  AdvancedOptions,
} from './types';

// Error code categories (for bulk error handling)
export { ERROR_CATEGORIES } from './types/errors';

// Manager Interfaces (for type annotations - advanced usage)
// Note: Concrete implementations are internal. Use these interfaces for type safety.
export type { IStripeManager } from './managers/StripeManager';
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
  createCircuitBreaker,
  CircuitState,
  CircuitBreakerOpenError,
  CIRCUIT_BREAKER_PRESETS,
  type CircuitBreaker,
  type CircuitBreakerConfig,
  type CircuitBreakerStats,
  retryWithBackoff,
  RETRY_PRESETS,
  type RetryConfig,
  type RetryStats,
  createWalletPool,
  WalletPool,
  generateCSP,
  generateCSPDirectives,
  formatCSP,
  RPC_PROVIDERS,
  CSP_PRESETS,
  type CSPConfig,
  type CSPDirectives,
  type CSPFormat,
} from './utils';

// Logging - Structured logging with configurable log levels
export {
  LogLevel,
  Logger,
  getLogger,
  createLogger,
  type LoggerConfig,
} from './utils/logger';

// Event System - Browser-native CustomEvent emission for analytics integration
export {
  CEDROS_EVENTS,
  emitPaymentStart,
  emitWalletConnect,
  emitWalletConnected,
  emitWalletError,
  emitPaymentProcessing,
  emitPaymentSuccess,
  emitPaymentError,
  type PaymentStartDetail,
  type WalletConnectDetail,
  type WalletErrorDetail,
  type PaymentProcessingDetail,
  type PaymentSuccessDetail,
  type PaymentErrorDetail,
  type WalletProvider,
} from './utils';

// Error Handling - Structured error parsing and utilities
export {
  parseStructuredErrorResponse,
  isRetryableError,
  getUserErrorMessage,
} from './utils';

// Security Validation - Runtime security checks and recommendations
export {
  validateSecurity,
  logSecurityReport,
  SECURITY_RECOMMENDATIONS,
  type SecurityCheckResult,
  type SecurityReport,
} from './utils/securityValidation';

// Internationalization (i18n) - Multi-language support
export {
  detectLocale,
  loadLocale,
  getAvailableLocales,
  createTranslator,
  getLocalizedError,
  type Translations,
  type Locale,
  type TranslateFn,
} from './i18n';
export {
  useTranslation,
  useLocalizedError,
  type UseTranslationResult,
} from './i18n/useTranslation';

// Styles
import './styles.css';
