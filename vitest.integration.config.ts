import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    env: loadEnv('', process.cwd(), ''),
    include: [
      'lib/testing/__tests__/**/*.integration.test.ts',
      'lib/combat/__tests__/**/*.integration.test.ts',
      'lib/world/__tests__/**/*.integration.test.ts',
    ],
    testTimeout: 120_000, // 2 minutes for LLM calls
    hookTimeout: 120_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
