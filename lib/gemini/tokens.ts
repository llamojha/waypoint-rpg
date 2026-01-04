/**
 * Token estimation and budget management for Gemini context window
 */

export const TOKEN_ESTIMATES = {
  systemPrompt: 2000,
  characterState: 500,
  worldContext: 300,
  perSummary: 200,
  perVerbatimTurn: 150,
  playerAction: 50,
  buffer: 500,
} as const;

export const MAX_CONTEXT = 30000;

/**
 * Estimate token count from text (rough approximation: ~4 chars per token)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Calculate token budget for a turn based on context composition
 */
export function calculateBudget(
  summaryCount: number,
  verbatimTurns: number
): number {
  return (
    TOKEN_ESTIMATES.systemPrompt +
    TOKEN_ESTIMATES.characterState +
    TOKEN_ESTIMATES.worldContext +
    summaryCount * TOKEN_ESTIMATES.perSummary +
    verbatimTurns * TOKEN_ESTIMATES.perVerbatimTurn +
    TOKEN_ESTIMATES.playerAction +
    TOKEN_ESTIMATES.buffer
  );
}

/**
 * Get remaining token budget after accounting for used tokens
 */
export function getRemainingBudget(usedTokens: number): number {
  return MAX_CONTEXT - usedTokens;
}
