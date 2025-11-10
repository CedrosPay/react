// Import polyfills FIRST before anything else
import './polyfills';

import type { Decorator, Preview } from '@storybook/react';
import React from 'react';
import { Title, Subtitle, Description, Primary, Controls, Stories } from '@storybook/addon-docs/blocks';
import { CedrosProvider } from '../src';
import './preview.css';
import '../src/styles.css';

const withCedrosProvider: Decorator = (Story, context) => {
  const {
    themeMode,
    themeOverrides,
  } = context.parameters as {
    themeMode?: 'light' | 'dark';
    themeOverrides?: Record<string, string>;
  };

  const storyArgs = context.args as { themeOverrides?: Record<string, string> };
  const overridesFromArgs = storyArgs?.themeOverrides;

  const env = (import.meta as unknown as { env?: Record<string, string> }).env ?? {};

  const stripePublicKey: string = env.VITE_STRIPE_PUBLIC_KEY ?? 'pk_test_placeholder';
  const serverUrl: string = env.VITE_STORYBOOK_SERVER_URL ?? env.VITE_SERVER_URL ?? 'http://localhost:8080';
  const solanaCluster = (env.VITE_SOLANA_CLUSTER as 'mainnet-beta' | 'devnet' | 'testnet') ?? 'mainnet-beta';
  const solanaEndpoint: string | undefined = env.VITE_STORYBOOK_SOLANA_ENDPOINT ?? env.VITE_SOLANA_RPC_URL;

  return (
    <CedrosProvider
      config={{
        stripePublicKey,
        serverUrl,
        solanaCluster,
        solanaEndpoint,
        theme: themeMode ?? 'light',
        themeOverrides: overridesFromArgs ?? themeOverrides,
      }}
    >
      <Story metadata={{ userId: 'demo-user', email: 'demo@cedros.app' }} />
    </CedrosProvider>
  );
};

const preview: Preview = {
  decorators: [withCedrosProvider],

  globalTypes: {
    themeMode: {
      description: 'Global theme for Cedros components',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
      },
    },
  },

  parameters: {
    actions: { argTypesRegex: '^on.*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    docs: {
      page: () => (
        <>
          <Title />
          <Subtitle />
          <Description />
          <Primary />
          <Controls />
          <Stories includePrimary={false} />
        </>
      ),
    },
    options: {
      storySort: (a, b) => {
        // Define desired order for Cedros Pay stories
        const cedrosPayOrder = [
          'Docs',
          'Links',
          'Dual Payments',
          'Card Only',
          'Crypto Only',
          'Purchase Button',
          'Multi Item Cart',
          'Custom Styling',
          'Coupons',
          'Refunds',
          'Refund Demo',
        ];

        // Define desired order for CedrosPay Server stories
        const cedrosPayServerOrder = [
          'Docs',
          'Quick Start',
          'Configuration',
          'Integration Patterns',
          'API Reference',
        ];

        // Top-level section order
        const sectionOrder = ['Cedros Pay', 'CedrosPay Server', 'Tools'];

        const aSection = a.title;
        const bSection = b.title;

        // Sort by section first
        if (aSection !== bSection) {
          const aSectionIdx = sectionOrder.indexOf(aSection);
          const bSectionIdx = sectionOrder.indexOf(bSection);

          if (aSectionIdx !== -1 && bSectionIdx !== -1) {
            return aSectionIdx - bSectionIdx;
          }
          if (aSectionIdx !== -1) return -1;
          if (bSectionIdx !== -1) return 1;
          return aSection.localeCompare(bSection);
        }

        // Within "Cedros Pay" section, use custom order
        if (aSection === 'Cedros Pay') {
          // Autodocs pages come first
          const aIsAutodocs = a.name === 'Docs' || a.id?.endsWith('--docs');
          const bIsAutodocs = b.name === 'Docs' || b.id?.endsWith('--docs');

          if (aIsAutodocs && !bIsAutodocs) return -1;
          if (!aIsAutodocs && bIsAutodocs) return 1;

          const aIdx = cedrosPayOrder.indexOf(a.name);
          const bIdx = cedrosPayOrder.indexOf(b.name);

          if (aIdx !== -1 && bIdx !== -1) {
            return aIdx - bIdx;
          }
          if (aIdx !== -1) return -1;
          if (bIdx !== -1) return 1;
        }

        // Within "CedrosPay Server" section, use custom order
        if (aSection === 'CedrosPay Server') {
          // Autodocs pages come first
          const aIsAutodocs = a.name === 'Docs' || a.id?.endsWith('--docs');
          const bIsAutodocs = b.name === 'Docs' || b.id?.endsWith('--docs');

          if (aIsAutodocs && !bIsAutodocs) return -1;
          if (!aIsAutodocs && bIsAutodocs) return 1;

          const aIdx = cedrosPayServerOrder.indexOf(a.name);
          const bIdx = cedrosPayServerOrder.indexOf(b.name);

          if (aIdx !== -1 && bIdx !== -1) {
            return aIdx - bIdx;
          }
          if (aIdx !== -1) return -1;
          if (bIdx !== -1) return 1;
        }

        // Default alphabetical for other sections
        return a.name.localeCompare(b.name);
      },
    },
  },

  tags: ['autodocs']
};

export default preview;
