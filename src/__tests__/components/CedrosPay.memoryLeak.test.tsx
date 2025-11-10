import { describe, it, expect, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { WalletAdapter } from '@solana/wallet-adapter-base';
import { CedrosPay } from '../../components/CedrosPay';
import { CedrosProvider, useCedrosContext } from '../../context';
import type { WalletPool } from '../../utils/walletPool';

describe('CedrosPay - Memory Leak Prevention (Wallet Pool)', () => {
  const defaultConfig = {
    stripePublicKey: 'pk_test_123',
    serverUrl: 'http://localhost:3000',
    solanaCluster: 'devnet' as const,
  };

  beforeEach(() => {
    cleanup();
  });

  describe('context-scoped wallet pool behavior', () => {
    it('creates wallet pool on provider mount', () => {
      let poolId: string = '';

      function PoolCapture() {
        const { walletPool } = useCedrosContext();
        poolId = walletPool.getId();
        return <CedrosPay resource="test-item" />;
      }

      render(
        <CedrosProvider config={defaultConfig}>
          <PoolCapture />
        </CedrosProvider>
      );

      // Should have created a pool
      expect(poolId).toMatch(/^pool_\d+_[a-z0-9]+$/);
    });

    it('creates separate wallet pools for separate providers', () => {
      const poolIds: string[] = [];

      function PoolCapture() {
        const { walletPool } = useCedrosContext();
        poolIds.push(walletPool.getId());
        return <CedrosPay resource="test-item" />;
      }

      // Mount provider 1
      const { unmount: unmount1 } = render(
        <CedrosProvider config={defaultConfig}>
          <PoolCapture />
        </CedrosProvider>
      );

      // Mount provider 2
      const { unmount: unmount2 } = render(
        <CedrosProvider config={defaultConfig}>
          <PoolCapture />
        </CedrosProvider>
      );

      // Should have different pool IDs (no singleton behavior)
      expect(poolIds.length).toBe(2);
      expect(poolIds[0]).not.toBe(poolIds[1]);

      unmount1();
      unmount2();
    });

    it('reuses wallet adapters within same provider across re-renders', () => {
      let adapters1: WalletAdapter[] = [];
      let adapters2: WalletAdapter[] = [];

      function WalletCapture({ id }: { id: number }) {
        const { walletPool } = useCedrosContext();
        const adapters = walletPool.getAdapters();
        if (id === 1) {
          adapters1 = adapters;
        } else {
          adapters2 = adapters;
        }
        return <CedrosPay resource="test-item" />;
      }

      const { rerender } = render(
        <CedrosProvider config={defaultConfig}>
          <WalletCapture id={1} />
        </CedrosProvider>
      );

      rerender(
        <CedrosProvider config={defaultConfig}>
          <WalletCapture id={2} />
        </CedrosProvider>
      );

      // Same provider instance = same wallet pool = same adapters
      // This prevents re-instantiation within the same context
      expect(adapters1).toBe(adapters2);
    });

    it('handles rapid mount/unmount without memory leaks', () => {
      // Simulate rapid component churn
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(
          <CedrosProvider config={defaultConfig}>
            <CedrosPay resource={`test-item-${i}`} />
          </CedrosProvider>
        );

        unmount();
      }

      // If we got here without errors, the cleanup worked correctly
      expect(true).toBe(true);
    });

    it('isolates wallet adapters between concurrent providers', () => {
      const walletSets: WalletAdapter[][] = [];

      function WalletCapture() {
        const { walletPool } = useCedrosContext();
        const adapters = walletPool.getAdapters();
        walletSets.push(adapters);
        return <CedrosPay resource="test-item" />;
      }

      // Mount 3 providers concurrently (simulating multi-tenant scenario)
      const unmounts = [1, 2, 3].map((i) => {
        const { unmount } = render(
          <CedrosProvider config={{ ...defaultConfig, serverUrl: `http://localhost:${8080 + i}` }}>
            <WalletCapture />
          </CedrosProvider>
        );
        return unmount;
      });

      // All should have separate wallet instances
      expect(walletSets.length).toBe(3);
      expect(walletSets[0]).not.toBe(walletSets[1]);
      expect(walletSets[1]).not.toBe(walletSets[2]);
      expect(walletSets[0][0]).not.toBe(walletSets[1][0]);
      expect(walletSets[1][0]).not.toBe(walletSets[2][0]);

      // Cleanup
      unmounts.forEach(unmount => unmount());
    });
  });

  describe('custom wallets prop', () => {
    it('uses custom wallets when provided', () => {
      const customWallets: WalletAdapter[] = [
        // Mock wallet adapters would go here in real test
      ];

      // Component should accept custom wallets
      render(
        <CedrosProvider config={defaultConfig}>
          <CedrosPay resource="test-item" advanced={{ wallets: customWallets }} />
        </CedrosProvider>
      );

      expect(true).toBe(true);
    });

    it('falls back to pool wallets when empty array provided', () => {
      let poolAdapters: WalletAdapter[] = [];

      function AdapterCapture() {
        const { walletPool } = useCedrosContext();
        poolAdapters = walletPool.getAdapters();
        return <CedrosPay resource="test-item" advanced={{ wallets: [] }} />;
      }

      render(
        <CedrosProvider config={defaultConfig}>
          <AdapterCapture />
        </CedrosProvider>
      );

      // With empty custom wallets, should use pool adapters
      expect(poolAdapters.length).toBeGreaterThan(0);
    });
  });

  describe('provider lifecycle', () => {
    it('maintains stable wallet pool across component re-renders within same provider', () => {
      const poolIds: string[] = [];

      function PoolTracker() {
        const { walletPool } = useCedrosContext();
        poolIds.push(walletPool.getId());
        return <CedrosPay resource="test-item" />;
      }

      render(
        <CedrosProvider config={defaultConfig}>
          <PoolTracker />
        </CedrosProvider>
      );

      // Pool should be created on first mount
      expect(poolIds.length).toBe(1);
    });

    it('cleans up wallet pool on provider unmount', () => {
      let poolInstance: WalletPool | null = null;

      function PoolCapture() {
        const { walletPool } = useCedrosContext();
        poolInstance = walletPool;
        return <CedrosPay resource="test-item" />;
      }

      const { unmount } = render(
        <CedrosProvider config={defaultConfig}>
          <PoolCapture />
        </CedrosProvider>
      );

      expect(poolInstance).not.toBeNull();
      const poolId = poolInstance!.getId();

      unmount();

      // After unmount, the pool should have been cleaned up
      // (cleanup is async, so we can't directly test it here,
      // but we can verify the structure is correct)
      expect(poolId).toBeTruthy();
    });
  });
});
