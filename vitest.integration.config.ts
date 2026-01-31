import { defineConfig } from 'vitest/config';
import path from 'path';
import fs from 'fs';

// Load .env.local manually
const envPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      const key = trimmed.slice(0, eqIndex);
      const value = trimmed.slice(eqIndex + 1).replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  }
}

export default defineConfig({
  test: {
    environment: 'node',
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
