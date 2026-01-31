/**
 * Personal Time System
 * 
 * Each character has their own day/phase that advances based on:
 * - Turn count (every 5 turns)
 * - Significant actions (travel, rest)
 */

import type { ActionType } from "@/lib/agents/rune-marshal";

export type TimePhase = "Dawn" | "Morning" | "Afternoon" | "Dusk" | "Night";

export interface GameTime {
  day: number;
  phase: TimePhase;
}

/** Phase cycle order */
export const PHASE_ORDER: TimePhase[] = ["Dawn", "Morning", "Afternoon", "Dusk", "Night"];

/** Actions that advance time */
const TIME_ADVANCING_ACTIONS: ActionType[] = ["travel"];

/** Keywords that indicate resting (checked in player action) - use word boundaries */
const REST_PATTERNS = [
  /\brest\b/i,
  /\bsleep\b/i,
  /\bcamp\b/i,
  /\bmake camp\b/i,
  /\bset up camp\b/i,
  /\btake a nap\b/i,
  /\bnap\b/i,
];

/**
 * Get the next phase in the cycle.
 * Returns new day number if wrapping from Night to Dawn.
 */
export function getNextPhase(current: GameTime): GameTime {
  const currentIndex = PHASE_ORDER.indexOf(current.phase);
  const nextIndex = (currentIndex + 1) % PHASE_ORDER.length;
  const wrapsToNewDay = nextIndex === 0;
  
  return {
    day: wrapsToNewDay ? current.day + 1 : current.day,
    phase: PHASE_ORDER[nextIndex],
  };
}

/**
 * Advance time by N phases.
 */
export function advanceTimeByPhases(current: GameTime, phases: number): GameTime {
  let result = { ...current };
  for (let i = 0; i < phases; i++) {
    result = getNextPhase(result);
  }
  return result;
}

/**
 * Check if player action contains rest keywords.
 */
export function isRestAction(playerAction: string): boolean {
  return REST_PATTERNS.some(pattern => pattern.test(playerAction));
}

/**
 * Determine if time should advance and by how much.
 * 
 * @param turnCount - Total turns played by this character
 * @param actionType - Type of action from Rune Marshal
 * @param playerAction - Raw player input (for rest detection)
 * @returns Number of phases to advance (0 if no advancement)
 */
export function shouldAdvanceTime(
  turnCount: number,
  actionType: ActionType,
  playerAction: string
): number {
  // Rest action: +2 phases
  if (isRestAction(playerAction)) {
    return 2;
  }
  
  // Travel action: +1 phase
  if (TIME_ADVANCING_ACTIONS.includes(actionType)) {
    return 1;
  }
  
  // Every 5 turns: +1 phase
  if (turnCount > 0 && turnCount % 5 === 0) {
    return 1;
  }
  
  return 0;
}

/**
 * Calculate new time after potential advancement.
 * Returns null if no advancement needed.
 */
export function calculateTimeAdvancement(
  currentTime: GameTime,
  turnCount: number,
  actionType: ActionType,
  playerAction: string
): GameTime | null {
  const phasesToAdvance = shouldAdvanceTime(turnCount, actionType, playerAction);
  
  if (phasesToAdvance === 0) {
    return null;
  }
  
  return advanceTimeByPhases(currentTime, phasesToAdvance);
}

/**
 * Get a description of the time transition for narration.
 */
export function getTimeTransitionDescription(from: GameTime, to: GameTime): string {
  if (to.day > from.day) {
    return `A new day dawns (Day ${to.day})`;
  }
  
  const descriptions: Record<TimePhase, string> = {
    Dawn: "The first light of dawn breaks over the horizon",
    Morning: "The morning sun climbs higher in the sky",
    "Afternoon": "The sun reaches its peak overhead",
    Dusk: "The sun begins its descent, painting the sky in warm hues",
    Night: "Darkness settles over the land as night falls",
  };
  
  return descriptions[to.phase];
}
