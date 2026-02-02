/**
 * Test Configuration
 * 
 * Environment variables and configuration for integration tests.
 */

/** Default test user ID (can be overridden via TEST_USER_ID env var) */
const DEFAULT_TEST_USER_ID = "d3f0e7f7-20e4-4b0d-930d-ac998e3710d2";

/** Get test user ID from environment or use default */
export function getTestUserId(): string {
  return process.env.TEST_USER_ID || DEFAULT_TEST_USER_ID;
}

/** Check if Gemini QA mode is enabled */
export function isGeminiQAEnabled(): boolean {
  return process.argv.includes("--gemini-qa");
}

/** Test configuration */
export const TEST_CONFIG = {
  /** Timeout for LLM calls (ms) */
  turnTimeout: 60_000,
  /** Timeout for test setup (ms) */
  setupTimeout: 30_000,
  /** Default test character name */
  characterName: "Test Hero",
  /** Default test character gender */
  characterGender: "Unknown",
} as const;
