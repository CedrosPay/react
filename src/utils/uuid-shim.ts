/**
 * Browser-safe UUID shim for dependencies that import 'uuid'
 *
 * This file provides a compatible API for the uuid package
 * using browser-native crypto.randomUUID()
 */

import { generateUUID } from './uuid';

// Default export (uuid package style: import { v4 } from 'uuid')
export function v4(): string {
  return generateUUID();
}

// Named export for compatibility
export { v4 as default };
