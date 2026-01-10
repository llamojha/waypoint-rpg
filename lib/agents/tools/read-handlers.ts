import { SKILL_TREE } from "@/constants";
import type { Character } from "@/types";

export interface PowerWordTierResult {
  tier: 1 | 2 | 3;
  bonus: number;
  skill: string;
}

export interface SkillLevelResult {
  level: number;
  xp: number;
  nextLevel: number;
}

/**
 * Look up power word tier from SKILL_TREE
 * Returns null if word not found in the specified skill
 */
export function getPowerWordTier(word: string, skillName: string): PowerWordTierResult | null {
  const wordLower = word.toLowerCase();
  
  for (const pillar of SKILL_TREE) {
    for (const skill of pillar.skills) {
      if (skill.name !== skillName) continue;
      
      // Check each tier
      if (skill.tier1.some(w => w.toLowerCase() === wordLower)) {
        return { tier: 1, bonus: 1, skill: skillName };
      }
      if (skill.tier2.some(w => w.toLowerCase() === wordLower)) {
        return { tier: 2, bonus: 2, skill: skillName };
      }
      if (skill.tier3.some(w => w.toLowerCase() === wordLower)) {
        return { tier: 3, bonus: 3, skill: skillName };
      }
      // Check aliases (treated as tier 1)
      if (skill.aliases.some(w => w.toLowerCase() === wordLower)) {
        return { tier: 1, bonus: 1, skill: skillName };
      }
    }
  }
  
  return null;
}

/**
 * Search all skills for a power word (when skill is unknown)
 */
export function findPowerWord(word: string): PowerWordTierResult | null {
  const wordLower = word.toLowerCase();
  
  for (const pillar of SKILL_TREE) {
    for (const skill of pillar.skills) {
      if (skill.tier1.some(w => w.toLowerCase() === wordLower)) {
        return { tier: 1, bonus: 1, skill: skill.name };
      }
      if (skill.tier2.some(w => w.toLowerCase() === wordLower)) {
        return { tier: 2, bonus: 2, skill: skill.name };
      }
      if (skill.tier3.some(w => w.toLowerCase() === wordLower)) {
        return { tier: 3, bonus: 3, skill: skill.name };
      }
      if (skill.aliases.some(w => w.toLowerCase() === wordLower)) {
        return { tier: 1, bonus: 1, skill: skill.name };
      }
    }
  }
  
  return null;
}

/**
 * Get character's skill level and XP
 */
export function getSkillLevel(character: Character, skillName: string): SkillLevelResult {
  const skill = character.skills[skillName];
  if (!skill) {
    return { level: 0, xp: 0, nextLevel: 100 };
  }
  return {
    level: skill.level,
    xp: skill.xp,
    nextLevel: skill.nextLevel,
  };
}

/**
 * Handle read tool calls from Orchestrator
 */
export function handleReadToolCall(
  toolName: string,
  args: Record<string, unknown>,
  character: Character
): unknown {
  switch (toolName) {
    case "get_skill_level":
      return getSkillLevel(character, args.skill as string);
    default:
      return null;
  }
}
