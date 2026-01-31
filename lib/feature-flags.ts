/**
 * Feature Flags
 * 
 * Control feature availability via environment variables.
 */

export const FEATURE_FLAGS = {
  /** Enable quest system (tab, prompts, pipeline) */
  quests: process.env.NEXT_PUBLIC_ENABLE_QUESTS === "true",
} as const;
