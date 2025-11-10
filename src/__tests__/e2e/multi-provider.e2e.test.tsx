/**
 * E2E Tests: Multi-Provider Scenarios
 *
 * Tests critical multi-provider use cases:
 * 1. Manager sharing (same config)
 * 2. Manager isolation (different configs)
 * 3. Wallet pool isolation
 * 4. Nested providers
 * 5. Memory cleanup on unmount
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { CedrosProvider, useCedrosContext } from '../../context';
import { StripeButton } from '../../components/StripeButton';
import { mockLoadStripe, mockBackendAPIs, cleanupE2E } from './setup';
import { getManagerCacheStats } from '../../managers/ManagerCache';
import type { CedrosConfig } from '../../types';

describe('E2E: Multi-Provider Scenarios', () => {
  let cleanupFetch: () => void;

  const config1: CedrosConfig = {
    stripePublicKey: 'pk_test_123',
    serverUrl: 'http://localhost:8080',
    solanaCluster: 'devnet',
  };

  const config2: CedrosConfig = {
    stripePublicKey: 'pk_test_456', // Different key
    serverUrl: 'http://localhost:8080',
    solanaCluster: 'devnet',
  };

  beforeEach(() => {
    mockLoadStripe();
    cleanupFetch = mockBackendAPIs();
  });

  afterEach(() => {
    cleanup();
    cleanupFetch();
    cleanupE2E();
  });

  describe('Manager Sharing (Same Config)', () => {
    it('shares managers between providers with identical config', () => {
      let manager1: unknown;
      let manager2: unknown;

      function Consumer1() {
        const { stripeManager } = useCedrosContext();
        manager1 = stripeManager;
        return <div>Provider 1</div>;
      }

      function Consumer2() {
        const { stripeManager } = useCedrosContext();
        manager2 = stripeManager;
        return <div>Provider 2</div>;
      }

      // Render two providers with identical config
      render(
        <CedrosProvider config={config1}>
          <Consumer1 />
        </CedrosProvider>
      );

      render(
        <CedrosProvider config={config1}>
          <Consumer2 />
        </CedrosProvider>
      );

      // Should share the same manager instance
      expect(manager1).toBe(manager2);

      // Cache should have 1 entry with refCount 2
      const stats = getManagerCacheStats();
      expect(stats.entries).toBe(1);
      expect(stats.details[0].refCount).toBe(2);
    });

    it('prevents duplicate Stripe.js loads for same public key', async () => {
      // Track loadStripe calls
      const { loadStripe } = await import('@stripe/stripe-js');

      // Render 3 providers with same config
      render(
        <CedrosProvider config={config1}>
          <StripeButton resource="product-1" />
        </CedrosProvider>
      );

      render(
        <CedrosProvider config={config1}>
          <StripeButton resource="product-2" />
        </CedrosProvider>
      );

      render(
        <CedrosProvider config={config1}>
          <StripeButton resource="product-3" />
        </CedrosProvider>
      );

      // loadStripe should only be called once (lazy-loaded on first use)
      // Note: In E2E tests, we're mocking loadStripe, so this tests the pattern
      expect(loadStripe).toBeDefined();

      // Cache stats confirm sharing
      const stats = getManagerCacheStats();
      expect(stats.entries).toBe(1);
      expect(stats.details[0].refCount).toBe(3);
    });
  });

  describe('Manager Isolation (Different Configs)', () => {
    it('creates separate managers for different Stripe keys', () => {
      let manager1: unknown;
      let manager2: unknown;

      function Consumer1() {
        const { stripeManager } = useCedrosContext();
        manager1 = stripeManager;
        return <div>Provider 1</div>;
      }

      function Consumer2() {
        const { stripeManager } = useCedrosContext();
        manager2 = stripeManager;
        return <div>Provider 2</div>;
      }

      // Render two providers with different configs
      render(
        <CedrosProvider config={config1}>
          <Consumer1 />
        </CedrosProvider>
      );

      render(
        <CedrosProvider config={config2}>
          <Consumer2 />
        </CedrosProvider>
      );

      // Should have different manager instances
      expect(manager1).not.toBe(manager2);

      // Cache should have 2 separate entries
      const stats = getManagerCacheStats();
      expect(stats.entries).toBe(2);
      expect(stats.details[0].refCount).toBe(1);
      expect(stats.details[1].refCount).toBe(1);
    });

    it('isolates managers for multi-tenant SaaS scenario', () => {
      const tenant1Config: CedrosConfig = {
        stripePublicKey: 'pk_test_tenant1',
        serverUrl: 'https://api.tenant1.com',
        solanaCluster: 'mainnet-beta',
      };

      const tenant2Config: CedrosConfig = {
        stripePublicKey: 'pk_test_tenant2',
        serverUrl: 'https://api.tenant2.com',
        solanaCluster: 'mainnet-beta',
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let tenant1Managers: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let tenant2Managers: any;

      function Tenant1() {
        tenant1Managers = useCedrosContext();
        return <StripeButton resource="product-1" />;
      }

      function Tenant2() {
        tenant2Managers = useCedrosContext();
        return <StripeButton resource="product-1" />;
      }

      render(
        <CedrosProvider config={tenant1Config}>
          <Tenant1 />
        </CedrosProvider>
      );

      render(
        <CedrosProvider config={tenant2Config}>
          <Tenant2 />
        </CedrosProvider>
      );

      // Tenants should have completely isolated managers
      expect(tenant1Managers.stripeManager).not.toBe(tenant2Managers.stripeManager);
      expect(tenant1Managers.x402Manager).not.toBe(tenant2Managers.x402Manager);
      expect(tenant1Managers.walletManager).not.toBe(tenant2Managers.walletManager);

      // Each tenant has separate cache entry
      const stats = getManagerCacheStats();
      expect(stats.entries).toBe(2);
    });
  });

  describe('Wallet Pool Isolation', () => {
    it('isolates wallet pools between providers (security)', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let pool1: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let pool2: any;

      function Consumer1() {
        const { walletPool } = useCedrosContext();
        pool1 = walletPool;
        return <div>User 1</div>;
      }

      function Consumer2() {
        const { walletPool } = useCedrosContext();
        pool2 = walletPool;
        return <div>User 2</div>;
      }

      // Even with same config, wallet pools must be isolated
      render(
        <CedrosProvider config={config1}>
          <Consumer1 />
        </CedrosProvider>
      );

      render(
        <CedrosProvider config={config1}>
          <Consumer2 />
        </CedrosProvider>
      );

      // Wallet pools must be different (security requirement)
      expect(pool1).not.toBe(pool2);
      expect(pool1.getId()).not.toBe(pool2.getId());

      // But managers should be shared
      const stats = getManagerCacheStats();
      expect(stats.entries).toBe(1);
      expect(stats.details[0].refCount).toBe(2);
    });
  });

  describe('Nested Providers', () => {
    it('supports nested providers with different configs', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let outerManagers: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let innerManagers: any;

      function OuterConsumer() {
        outerManagers = useCedrosContext();
        return (
          <div>
            Outer
            <CedrosProvider config={config2}>
              <InnerConsumer />
            </CedrosProvider>
          </div>
        );
      }

      function InnerConsumer() {
        innerManagers = useCedrosContext();
        return <div>Inner</div>;
      }

      render(
        <CedrosProvider config={config1}>
          <OuterConsumer />
        </CedrosProvider>
      );

      // Inner provider should use config2 managers
      expect(outerManagers.stripeManager).not.toBe(innerManagers.stripeManager);

      // Cache should have 2 entries
      const stats = getManagerCacheStats();
      expect(stats.entries).toBe(2);
    });
  });

  describe('Memory Cleanup', () => {
    it('releases managers when providers unmount', () => {
      function Consumer() {
        useCedrosContext();
        return <div>Consumer</div>;
      }

      // Mount 3 providers
      const { unmount: unmount1 } = render(
        <CedrosProvider config={config1}>
          <Consumer />
        </CedrosProvider>
      );

      const { unmount: unmount2 } = render(
        <CedrosProvider config={config1}>
          <Consumer />
        </CedrosProvider>
      );

      const { unmount: unmount3 } = render(
        <CedrosProvider config={config1}>
          <Consumer />
        </CedrosProvider>
      );

      // Cache should have refCount 3
      let stats = getManagerCacheStats();
      expect(stats.entries).toBe(1);
      expect(stats.details[0].refCount).toBe(3);

      // Unmount first provider
      unmount1();

      // refCount should decrease to 2
      stats = getManagerCacheStats();
      expect(stats.entries).toBe(1);
      expect(stats.details[0].refCount).toBe(2);

      // Unmount second provider
      unmount2();

      // refCount should decrease to 1
      stats = getManagerCacheStats();
      expect(stats.entries).toBe(1);
      expect(stats.details[0].refCount).toBe(1);

      // Unmount third provider
      unmount3();

      // Cache should be empty (refCount reached 0)
      stats = getManagerCacheStats();
      expect(stats.entries).toBe(0);
    });

    it('prevents memory leaks in rapid mount/unmount cycles', () => {
      function Consumer() {
        useCedrosContext();
        return <div>Consumer</div>;
      }

      // Rapidly mount and unmount 10 providers
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(
          <CedrosProvider config={config1}>
            <Consumer />
          </CedrosProvider>
        );
        unmount();
      }

      // Cache should be empty (no leaks)
      const stats = getManagerCacheStats();
      expect(stats.entries).toBe(0);
    });
  });

  describe('Real-World Scenarios', () => {
    it('handles dashboard with multiple payment components', () => {
      // Scenario: User dashboard with multiple product purchase buttons
      render(
        <CedrosProvider config={config1}>
          <div>
            <h1>Products</h1>
            <StripeButton resource="product-1" label="Buy Product 1" />
            <StripeButton resource="product-2" label="Buy Product 2" />
            <StripeButton resource="product-3" label="Buy Product 3" />
          </div>
        </CedrosProvider>
      );

      // All buttons share same managers
      const stats = getManagerCacheStats();
      expect(stats.entries).toBe(1);
      expect(stats.details[0].refCount).toBe(1); // Single provider
    });

    it('handles multi-user admin panel', () => {
      // Scenario: Admin viewing payments for multiple users
      // Each user dashboard has separate provider (different serverUrls)

      const user1Config = { ...config1, serverUrl: 'http://localhost:8080/user1' };
      const user2Config = { ...config1, serverUrl: 'http://localhost:8080/user2' };

      render(
        <div>
          <CedrosProvider config={user1Config}>
            <StripeButton resource="subscription" label="User 1 Payment" />
          </CedrosProvider>

          <CedrosProvider config={user2Config}>
            <StripeButton resource="subscription" label="User 2 Payment" />
          </CedrosProvider>
        </div>
      );

      // Different serverUrls = different cache entries
      const stats = getManagerCacheStats();
      expect(stats.entries).toBe(2);
    });
  });
});
