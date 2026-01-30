/**
 * Player Death and Respawn Handling
 * 
 * When player HP reaches 0:
 * - Respawn at The Waystone with 1 HP
 * - Clear active combat
 * - No penalty (soft death for MVP)
 */

import type { Character, WorldContext, TurnDiff } from "@/types";
import type { Consequence } from "@/lib/turn/apply";
import { RESPAWN_LOCATION } from '@/constants';

const RESPAWN_HP = 1;

export interface RespawnResult {
  characterUpdates: Partial<Character>;
  worldUpdates: Partial<WorldContext>;
  diffs: TurnDiff[];
  consequence: Consequence;
}

/**
 * Handle player death - respawn at Waystone
 */
export function handlePlayerDeath(
  character: Character,
  world: WorldContext
): RespawnResult {
  return {
    characterUpdates: {
      hp: RESPAWN_HP,
    },
    worldUpdates: {
      poi: RESPAWN_LOCATION,
      activeCombat: null,
    },
    diffs: [
      { type: "stat", text: "HP", value: `→ ${RESPAWN_HP}` },
      { type: "world", text: "Respawned", value: RESPAWN_LOCATION },
    ],
    consequence: {
      type: "respawned",
      location: RESPAWN_LOCATION,
      reason: "You fell in battle and awoke at the Waystone",
    },
  };
}

/**
 * Check if player should respawn
 */
export function shouldRespawn(character: Character, characterUpdates: Partial<Character>): boolean {
  const finalHp = characterUpdates.hp ?? character.hp;
  return finalHp <= 0;
}
