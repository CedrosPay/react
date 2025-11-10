import type { StorybookConfig } from 'storybook';
import { loadEnv } from 'vite';

// SECURITY: Only load VITE_STORYBOOK_* variables to prevent leaking production secrets
const env = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), 'VITE_STORYBOOK_');

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs'],

  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: async (config) => {
    const prefixes = Array.isArray(config.envPrefix) ? config.envPrefix : (config.envPrefix ? [config.envPrefix] : []);
    // SECURITY: Only expose VITE_STORYBOOK_* variables to prevent leaking production secrets
    if (!prefixes.includes('VITE_STORYBOOK_')) {
      prefixes.push('VITE_STORYBOOK_');
    }
    if (!prefixes.includes('STORYBOOK_')) {
      prefixes.push('STORYBOOK_');
    }
    config.envPrefix = prefixes;
    config.define = {
      ...config.define,
      'import.meta.env.VITE_STORYBOOK_SERVER_URL': JSON.stringify(env.VITE_STORYBOOK_SERVER_URL ?? ''),
      'import.meta.env.VITE_STORYBOOK_SOLANA_ENDPOINT': JSON.stringify(env.VITE_STORYBOOK_SOLANA_ENDPOINT ?? ''),
    };

    // Configure Vite to exclude uuid from dependency optimization
    // @particle-network packages import uuid (Node.js package), but we use browser-compatible UUID
    if (!config.optimizeDeps) config.optimizeDeps = {};
    if (!config.optimizeDeps.exclude) config.optimizeDeps.exclude = [];
    config.optimizeDeps.exclude.push('uuid');

    // Configure rollup to handle uuid dependency from @particle-network
    if (!config.build) config.build = {};
    if (!config.build.rollupOptions) config.build.rollupOptions = {};

    // Preserve existing external configuration and add uuid
    const existingExternal = config.build.rollupOptions.external;
    config.build.rollupOptions.external = (id: string, importer: string | undefined, isResolved: boolean) => {
      // Check uuid first
      if (id === 'uuid' || id.startsWith('uuid/')) {
        return true;
      }
      // Then delegate to existing external config if it exists
      if (existingExternal) {
        if (typeof existingExternal === 'function') {
          return existingExternal(id, importer, isResolved);
        }
        if (Array.isArray(existingExternal)) {
          return existingExternal.includes(id);
        }
        if (existingExternal instanceof RegExp) {
          return existingExternal.test(id);
        }
        return existingExternal === id;
      }
      return false;
    };

    return config;
  }
};

export default config;
