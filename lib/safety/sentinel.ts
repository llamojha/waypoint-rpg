/**
 * Content Sentinel - Safety filtering for player input and LLM output
 * Blocks: explicit sexual, hate speech, real-world violence
 * Allows: fantasy violence, gore, combat, dark themes
 */

import { BLOCK_PATTERNS, REDIRECT_MESSAGES } from "./patterns";

export interface FilterResult {
  status: "allow" | "block";
  output: string;
  flags?: string[];
  category?: string;
}

/**
 * Filter player input before sending to LLM
 */
export function filterInput(text: string): FilterResult {
  return filterText(text, "input");
}

/**
 * Filter LLM output before displaying to user
 */
export function filterOutput(text: string): FilterResult {
  return filterText(text, "output");
}

/**
 * Core filtering logic
 */
function filterText(text: string, type: "input" | "output"): FilterResult {
  const flags: string[] = [];
  let blockedCategory: string | null = null;

  for (const [category, patterns] of Object.entries(BLOCK_PATTERNS)) {
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        flags.push(...matches.map((m) => m.toLowerCase()));
        blockedCategory = category;
      }
    }
  }

  if (blockedCategory) {
    logViolation(type, blockedCategory, flags);
    return {
      status: "block",
      output: REDIRECT_MESSAGES[blockedCategory] || REDIRECT_MESSAGES.default,
      flags,
      category: blockedCategory,
    };
  }

  return { status: "allow", output: text };
}

/**
 * Log violation to console (database logging post-MVP)
 */
function logViolation(
  type: "input" | "output",
  category: string,
  flags: string[]
): void {
  console.warn(`[ContentSentinel] ${type.toUpperCase()} blocked`, {
    category,
    flags: flags.slice(0, 5), // Limit logged flags
    timestamp: new Date().toISOString(),
  });
}

/**
 * Fallback narration when output is blocked
 */
export const FALLBACK_NARRATION =
  "The mists swirl around you, obscuring the moment. When they clear, you find yourself exactly where you were, as if time itself refused to move forward.";
