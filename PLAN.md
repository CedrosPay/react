# Subscription Support Implementation Plan

## Overview

Add subscription support to Cedros Pay UI with:
- **Stripe subscriptions**: Checkout redirect flow for signup (same UX as one-time payments)
- **x402 crypto subscriptions**: Backend-verified subscription status
- **Flexible intervals**: Monthly, yearly, weekly, and custom intervals
- **Simple UI**: Subscribe buttons only (no management UI - handled via Stripe Portal externally)

---

## Architecture

### New Files to Create

```
src/
├── types/
│   └── subscription.ts              # Subscription-specific types
├── managers/
│   └── SubscriptionManager.ts       # Subscription business logic
├── hooks/
│   └── useSubscription.ts           # Subscription state management
└── components/
    ├── SubscribeButton.tsx          # Stripe subscription button
    └── CryptoSubscribeButton.tsx    # x402 subscription button
```

### Files to Modify

```
src/
├── types/index.ts                   # Export new subscription types
├── context/CedrosContext.tsx        # Add subscriptionManager to context
├── managers/ManagerCache.ts         # Cache subscription manager
├── index.ts                         # Export new components/hooks
└── components/CedrosPay.tsx         # Add subscription mode (optional)
```

---

## Phase 1: Types & Interfaces

### File: `src/types/subscription.ts`

```typescript
/**
 * Subscription billing interval
 */
export type BillingInterval = 'weekly' | 'monthly' | 'yearly' | 'custom';

/**
 * Subscription status
 */
export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'expired';

/**
 * Request to create a Stripe subscription session
 */
export interface SubscriptionSessionRequest {
  /** Resource/plan ID for the subscription */
  resource: string;
  /** Billing interval */
  interval: BillingInterval;
  /** Custom interval in days (only used when interval is 'custom') */
  intervalDays?: number;
  /** Number of trial days (0 for no trial) */
  trialDays?: number;
  /** Customer email (pre-fills Stripe checkout) */
  customerEmail?: string;
  /** Metadata for tracking */
  metadata?: Record<string, string>;
  /** Coupon code for discount */
  couponCode?: string;
  /** URL to redirect on success */
  successUrl?: string;
  /** URL to redirect on cancel */
  cancelUrl?: string;
}

/**
 * Response from subscription session creation
 */
export interface SubscriptionSessionResponse {
  /** Stripe checkout session ID */
  sessionId: string;
  /** Stripe checkout URL */
  url: string;
}

/**
 * Request to check x402 subscription status
 */
export interface SubscriptionStatusRequest {
  /** Resource/plan ID */
  resource: string;
  /** User identifier (wallet address for crypto, email for Stripe) */
  userId: string;
}

/**
 * Response from subscription status check
 */
export interface SubscriptionStatusResponse {
  /** Whether subscription is active */
  active: boolean;
  /** Current subscription status */
  status: SubscriptionStatus;
  /** Subscription expiry timestamp (ISO 8601) */
  expiresAt?: string;
  /** Current period end timestamp (ISO 8601) */
  currentPeriodEnd?: string;
  /** Billing interval */
  interval?: BillingInterval;
  /** Whether subscription will cancel at period end */
  cancelAtPeriodEnd?: boolean;
}

/**
 * x402 subscription quote (extends standard X402Requirement)
 */
export interface SubscriptionQuote {
  /** Standard x402 requirement */
  requirement: X402Requirement;
  /** Subscription-specific details */
  subscription: {
    interval: BillingInterval;
    intervalDays?: number;
    /** Duration in seconds this payment covers */
    durationSeconds: number;
    /** When the subscription period starts */
    periodStart: string;
    /** When the subscription period ends */
    periodEnd: string;
  };
}

/**
 * Subscription payment state
 */
export interface SubscriptionState {
  status: 'idle' | 'loading' | 'checking' | 'success' | 'error';
  error: string | null;
  /** For Stripe: checkout session ID */
  sessionId: string | null;
  /** Subscription status (after verification) */
  subscriptionStatus: SubscriptionStatus | null;
  /** When subscription expires */
  expiresAt: string | null;
}
```

### Update: `src/types/index.ts`

Add export for subscription types:
```typescript
export * from './subscription';
```

---

## Phase 2: Subscription Manager

### File: `src/managers/SubscriptionManager.ts`

**Responsibilities:**
1. Create Stripe subscription checkout sessions
2. Check subscription status (for x402)
3. Request x402 subscription quotes
4. Submit x402 subscription payments

**Interface:**
```typescript
export interface ISubscriptionManager {
  // Stripe subscription flow
  createSubscriptionSession(
    request: SubscriptionSessionRequest
  ): Promise<SubscriptionSessionResponse>;

  redirectToCheckout(sessionId: string): Promise<PaymentResult>;

  processSubscription(
    request: SubscriptionSessionRequest
  ): Promise<PaymentResult>;

  // x402 subscription flow
  checkSubscriptionStatus(
    request: SubscriptionStatusRequest
  ): Promise<SubscriptionStatusResponse>;

  requestSubscriptionQuote(
    resource: string,
    interval: BillingInterval,
    options?: { couponCode?: string; intervalDays?: number }
  ): Promise<SubscriptionQuote>;
}
```

**Backend Endpoints (to be implemented on backend):**
```
POST /paywall/v1/subscription/stripe-session
  Request: SubscriptionSessionRequest
  Response: SubscriptionSessionResponse

GET /paywall/v1/subscription/status?resource={resource}&userId={userId}
  Response: SubscriptionStatusResponse

POST /paywall/v1/subscription/quote
  Request: { resource, interval, intervalDays?, couponCode? }
  Response: HTTP 402 with SubscriptionQuote
```

**Implementation Details:**
- Reuse existing `RouteDiscoveryManager` for endpoint URLs
- Reuse existing `CircuitBreaker` and rate limiting patterns
- Reuse existing retry with exponential backoff
- Use same idempotency key pattern for session creation

---

## Phase 3: Subscription Hook

### File: `src/hooks/useSubscription.ts`

**Responsibilities:**
1. Manage subscription payment state
2. Orchestrate Stripe subscription flow
3. Check subscription status for x402

```typescript
export function useSubscription() {
  const { subscriptionManager } = useCedrosContext();
  const [state, setState] = useState<SubscriptionState>({
    status: 'idle',
    error: null,
    sessionId: null,
    subscriptionStatus: null,
    expiresAt: null,
  });

  // Create and redirect to Stripe subscription checkout
  const processSubscription = useCallback(
    async (request: SubscriptionSessionRequest): Promise<PaymentResult> => {
      // 1. Set loading state
      // 2. Call subscriptionManager.processSubscription()
      // 3. Handle success/error
      // 4. Return result
    },
    [subscriptionManager]
  );

  // Check if user has active subscription (for x402 gating)
  const checkStatus = useCallback(
    async (resource: string, userId: string): Promise<SubscriptionStatusResponse> => {
      // 1. Set checking state
      // 2. Call subscriptionManager.checkSubscriptionStatus()
      // 3. Update state with status
      // 4. Return response
    },
    [subscriptionManager]
  );

  // Reset state
  const reset = useCallback(() => {
    setState({
      status: 'idle',
      error: null,
      sessionId: null,
      subscriptionStatus: null,
      expiresAt: null,
    });
  }, []);

  return {
    ...state,
    processSubscription,
    checkStatus,
    reset,
  };
}
```

---

## Phase 4: Subscribe Button Components

### File: `src/components/SubscribeButton.tsx`

**Stripe subscription button - follows StripeButton pattern:**

```typescript
interface SubscribeButtonProps {
  /** Subscription plan resource ID */
  resource: string;
  /** Billing interval */
  interval: BillingInterval;
  /** Custom interval in days (for 'custom' interval) */
  intervalDays?: number;
  /** Trial period in days */
  trialDays?: number;
  /** Button label */
  label?: string;
  /** Customer email (pre-fills checkout) */
  customerEmail?: string;
  /** Metadata for tracking */
  metadata?: Record<string, string>;
  /** Coupon code */
  couponCode?: string;
  /** Success/cancel URLs */
  successUrl?: string;
  cancelUrl?: string;
  /** Callbacks */
  onAttempt?: (method: 'stripe') => void;
  onSuccess?: (sessionId: string) => void;
  onError?: (error: string) => void;
  /** Styling */
  disabled?: boolean;
  className?: string;
}

export function SubscribeButton({
  resource,
  interval,
  intervalDays,
  trialDays,
  label,
  customerEmail,
  metadata,
  couponCode,
  successUrl,
  cancelUrl,
  onAttempt,
  onSuccess,
  onError,
  disabled,
  className,
}: SubscribeButtonProps) {
  const { processSubscription, status, error } = useSubscription();
  const theme = useCedrosTheme();
  const { t } = useTranslation();

  // Default label based on interval
  const buttonLabel = label || t(`ui.subscribe_${interval}`) || 'Subscribe';

  const handleClick = async () => {
    onAttempt?.('stripe');

    const result = await processSubscription({
      resource,
      interval,
      intervalDays,
      trialDays,
      customerEmail,
      metadata,
      couponCode,
      successUrl,
      cancelUrl,
    });

    if (result.success) {
      onSuccess?.(result.transactionId || '');
    } else {
      onError?.(result.error || 'Subscription failed');
    }
  };

  return (
    <div className={theme.className}>
      <button
        onClick={handleClick}
        disabled={disabled || status === 'loading'}
        className={`cedros-theme__button cedros-theme__stripe ${className}`}
      >
        {status === 'loading' ? t('ui.processing') : buttonLabel}
      </button>
      {error && <div className="cedros-theme__error">{error}</div>}
    </div>
  );
}
```

### File: `src/components/CryptoSubscribeButton.tsx`

**x402 crypto subscription button - follows CryptoButton pattern:**

```typescript
interface CryptoSubscribeButtonProps {
  /** Subscription plan resource ID */
  resource: string;
  /** Billing interval */
  interval: BillingInterval;
  /** Custom interval in days */
  intervalDays?: number;
  /** Button label */
  label?: string;
  /** Metadata */
  metadata?: Record<string, string>;
  /** Coupon code */
  couponCode?: string;
  /** Callbacks */
  onAttempt?: (method: 'crypto') => void;
  onSuccess?: (txHash: string) => void;
  onError?: (error: string) => void;
  /** Styling */
  disabled?: boolean;
  className?: string;
}

export function CryptoSubscribeButton({
  resource,
  interval,
  intervalDays,
  label,
  metadata,
  couponCode,
  onAttempt,
  onSuccess,
  onError,
  disabled,
  className,
}: CryptoSubscribeButtonProps) {
  const { subscriptionManager, walletManager } = useCedrosContext();
  const wallet = useWallet();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const theme = useCedrosTheme();
  const { t } = useTranslation();

  const buttonLabel = label || t(`ui.subscribe_crypto_${interval}`) || 'Subscribe with Crypto';

  const handleClick = async () => {
    if (!wallet.connected) {
      await wallet.connect();
      return;
    }

    onAttempt?.('crypto');
    setStatus('loading');

    try {
      // 1. Get subscription quote
      const quote = await subscriptionManager.requestSubscriptionQuote(
        resource,
        interval,
        { couponCode, intervalDays }
      );

      // 2. Build and sign transaction (reuse existing x402 flow)
      const transaction = await walletManager.buildTransaction({
        requirement: quote.requirement,
        walletPublicKey: wallet.publicKey!,
      });

      const signed = await wallet.signTransaction!(transaction);

      // 3. Submit payment (standard x402 verify endpoint)
      // Backend records subscription period based on quote
      const result = await x402Manager.submitPayment({
        requirement: quote.requirement,
        signedTransaction: signed,
        metadata: {
          ...metadata,
          subscriptionInterval: interval,
          subscriptionPeriodEnd: quote.subscription.periodEnd,
        },
      });

      if (result.success) {
        setStatus('success');
        onSuccess?.(result.txHash || '');
      } else {
        throw new Error(result.error || 'Payment failed');
      }
    } catch (err) {
      setStatus('error');
      const errorMessage = formatError(err, 'Subscription failed');
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  return (
    <div className={theme.className}>
      <button
        onClick={handleClick}
        disabled={disabled || status === 'loading'}
        className={`cedros-theme__button cedros-theme__crypto ${className}`}
      >
        {status === 'loading' ? t('ui.processing') : buttonLabel}
      </button>
      {error && <div className="cedros-theme__error">{error}</div>}
    </div>
  );
}
```

---

## Phase 5: Context & Provider Updates

### Update: `src/context/CedrosContext.tsx`

Add `subscriptionManager` to context:

```typescript
interface CedrosContextValue {
  // ... existing managers
  subscriptionManager: ISubscriptionManager;
}
```

### Update: `src/managers/ManagerCache.ts`

Add subscription manager to cache:

```typescript
function createManagers(config: CacheKey): CachedManagers {
  // ... existing managers

  const subscriptionManager = new SubscriptionManager(
    config.stripePublicKey,
    routeDiscoveryManager
  );

  return {
    // ... existing
    subscriptionManager,
  };
}
```

---

## Phase 6: Exports

### Update: `src/index.ts`

```typescript
// Types
export type {
  BillingInterval,
  SubscriptionStatus,
  SubscriptionSessionRequest,
  SubscriptionSessionResponse,
  SubscriptionStatusRequest,
  SubscriptionStatusResponse,
  SubscriptionQuote,
  SubscriptionState,
} from './types/subscription';

// Components
export { SubscribeButton } from './components/SubscribeButton';
export { CryptoSubscribeButton } from './components/CryptoSubscribeButton';

// Hooks
export { useSubscription } from './hooks/useSubscription';

// Manager interface
export type { ISubscriptionManager } from './managers/SubscriptionManager';
```

---

## Backend API Contract

The frontend assumes the following backend endpoints:

### 1. Create Stripe Subscription Session
```
POST /paywall/v1/subscription/stripe-session

Request:
{
  "resource": "plan-pro-monthly",
  "interval": "monthly",
  "trialDays": 7,
  "customerEmail": "user@example.com",
  "metadata": { "userId": "123" },
  "couponCode": "SAVE20",
  "successUrl": "https://app.com/success",
  "cancelUrl": "https://app.com/cancel"
}

Response:
{
  "sessionId": "cs_test_xxx",
  "url": "https://checkout.stripe.com/xxx"
}
```

### 2. Check Subscription Status
```
GET /paywall/v1/subscription/status?resource=plan-pro-monthly&userId=wallet123

Response:
{
  "active": true,
  "status": "active",
  "expiresAt": "2025-02-01T00:00:00Z",
  "currentPeriodEnd": "2025-02-01T00:00:00Z",
  "interval": "monthly",
  "cancelAtPeriodEnd": false
}
```

### 3. x402 Subscription Quote
```
POST /paywall/v1/subscription/quote

Request:
{
  "resource": "plan-pro-monthly",
  "interval": "monthly",
  "couponCode": "CRYPTO10"
}

Response: HTTP 402
{
  "requirement": {
    "scheme": "solana-spl-transfer",
    "network": "mainnet-beta",
    "maxAmountRequired": "10000000",
    "resource": "plan-pro-monthly",
    "payTo": "...",
    "asset": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  },
  "subscription": {
    "interval": "monthly",
    "durationSeconds": 2592000,
    "periodStart": "2025-01-01T00:00:00Z",
    "periodEnd": "2025-02-01T00:00:00Z"
  }
}
```

### 4. x402 Payment Verification (existing endpoint)

The existing `/paywall/v1/verify` endpoint will be extended to:
- Check if payment is for a subscription (via metadata)
- Record subscription period in database
- Return subscription details in response metadata

---

## Testing Strategy

### Unit Tests
- `SubscriptionManager` - mock fetch, test session creation and status checks
- `useSubscription` hook - test state transitions

### Integration Tests
- Full subscription flow with mocked backend
- x402 subscription quote → payment flow

### E2E Tests (skipped for now, like crypto-payment tests)
- Complex wallet mocking required
- Logic tested via integration tests

---

## File Size Estimates

| File | Estimated Lines |
|------|-----------------|
| `src/types/subscription.ts` | ~100 |
| `src/managers/SubscriptionManager.ts` | ~250 |
| `src/hooks/useSubscription.ts` | ~100 |
| `src/components/SubscribeButton.tsx` | ~150 |
| `src/components/CryptoSubscribeButton.tsx` | ~200 |

All well under the 500-line limit.

---

## Implementation Order

1. **Types** (`subscription.ts`) - Define all interfaces first
2. **Manager** (`SubscriptionManager.ts`) - Business logic
3. **Hook** (`useSubscription.ts`) - State management
4. **Stripe Button** (`SubscribeButton.tsx`) - Simpler, Stripe-only
5. **Crypto Button** (`CryptoSubscribeButton.tsx`) - More complex, wallet integration
6. **Context Updates** - Wire everything together
7. **Exports** - Make available to consumers
8. **Tests** - Unit and integration tests
9. **Documentation** - Update README, CHANGELOG
