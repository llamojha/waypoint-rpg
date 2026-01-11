/**
 * Content Sentinel - Safety filtering for player input and LLM output
 * Two-tier system: fast regex first, then LLM classification for nuanced detection
 * Blocks: explicit sexual, hate speech, real-world violence
 * Allows: fantasy violence, gore, combat, dark themes
 */

import { GoogleGenAI } from "@google/genai";
import { BLOCK_PATTERNS, REDIRECT_MESSAGES, SOFT_REDIRECTS } from "./patterns";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

export interface FilterResult {
  status: "allow" | "block";
  output: string;
  flags?: string[];
  category?: string;
}

export interface SafetyCheckResult {
  safe: boolean;
  redirect?: string;
  category?: string;
}

const LLM_TIMEOUT_MS = 2000;

/**
 * LLM-based content classification for nuanced detection
 * Catches things regex misses: context-dependent harassment, coded language
 * Fails closed on error/timeout for safety
 */
async function classifyInput(text: string): Promise<{ unsafe: boolean; category?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{
        role: "user",
        parts: [{
          text: `Classify if this RPG player action contains unsafe content.

UNSAFE categories (return category name):
- "sexual_harassment": Sexual assault, groping, non-consensual touching, coercion
- "racist_content": Racial slurs, hate speech, discrimination
- "real_violence": Real-world violence instructions, terrorism, targeting real people

SAFE (return "safe"):
- Fantasy combat, violence against monsters/enemies
- Dark themes, gore in fantasy context
- Flirting, romance with willing NPCs
- Any normal RPG action

Player action: "${text}"

Respond with ONLY one word: "safe" OR the unsafe category name.`
        }]
      }],
      config: { temperature: 0.1 },
    });

    clearTimeout(timeoutId);

    const result = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase() || "safe";
    
    if (result === "safe") {
      return { unsafe: false };
    }
    
    // Map LLM category to our categories
    if (result.includes("sexual") || result.includes("harassment")) {
      return { unsafe: true, category: "sexual_coercion" };
    }
    if (result.includes("racist") || result.includes("hate")) {
      return { unsafe: true, category: "hate_speech" };
    }
    if (result.includes("violence") || result.includes("terror")) {
      return { unsafe: true, category: "real_world_violence" };
    }
    
    return { unsafe: false };
  } catch (error) {
    console.error("[ContentSentinel] LLM classification error (failing closed):", error);
    return { unsafe: true, category: "classification_error" };
  }
}

/**
 * Full safety check: regex fast-path + LLM classification
 * Returns soft redirect for unsafe content
 */
export async function checkContentSafety(text: string): Promise<SafetyCheckResult> {
  // Fast path: regex check first
  const regexResult = filterText(text, "input");
  if (regexResult.status === "block") {
    return {
      safe: false,
      redirect: SOFT_REDIRECTS[regexResult.category || "default"] || SOFT_REDIRECTS.default,
      category: regexResult.category,
    };
  }

  // Slow path: LLM classification for nuanced detection
  const llmResult = await classifyInput(text);
  if (llmResult.unsafe) {
    logViolation("input", llmResult.category || "llm_detected", ["llm_classification"]);
    return {
      safe: false,
      redirect: SOFT_REDIRECTS[llmResult.category || "default"] || SOFT_REDIRECTS.default,
      category: llmResult.category,
    };
  }

  return { safe: true };
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
