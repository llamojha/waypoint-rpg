/**
 * Skill XP System
 * OSRS-based XP formula with diminishing returns for anti-grinding
 */

import { SKILL_TREE, SKILL_RULES } from "@/constants";
import type { SkillProgression, TurnDiff } from "@/types";

// === XP FORMULA (OSRS-based) ===

/**
 * Calculate total XP required to reach a given level (1-99)
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += Math.floor(i + 300 * Math.pow(2, i / 7));
  }
  return Math.floor(total / 4);
}

/**
 * Calculate level from total XP
 */
export function levelFromXp(totalXp: number): number {
  for (let level = 99; level >= 1; level--) {
    if (totalXp >= xpForLevel(level)) return level;
  }
  return 1;
}

// === XP CALCULATION ===

/**
 * Calculate base XP for a skill action
 * Success: 15-50 based on DC, Failure: 5-15
 * Power word tier adds bonus XP
 */
export function calculateSkillXP(
  dc: number | undefined,
  tier: number | undefined,
  success: boolean | undefined
): number {
  // Base XP from DC (or default if no roll)
  const baseDc = dc ?? 10;
  const isSuccess = success ?? true; // Power word use without roll counts as success
  
  let xp: number;
  if (isSuccess) {
    // Success: 15-50 scaled by DC (DC 5 = 15, DC 20 = 50)
    xp = Math.floor(15 + (baseDc - 5) * (35 / 15));
    xp = Math.max(15, Math.min(50, xp));
  } else {
    // Failure: 5-15 scaled by DC
    xp = Math.floor(5 + (baseDc - 5) * (10 / 15));
    xp = Math.max(5, Math.min(15, xp));
  }
  
  // Tier bonus: +5 per tier
  const tierBonus = (tier ?? 0) * 5;
  
  return xp + tierBonus;
}

// === DIMINISHING RETURNS ===

// In-memory tracking of recent skill uses per character
const recentSkillUses: Map<string, string[]> = new Map();
const HISTORY_SIZE = 5;
const DIMINISHING_FACTOR = 0.7; // 30% reduction per repeat

/**
 * Apply diminishing returns based on recent skill usage
 * Returns multiplier (0.0 - 1.1)
 */
export function applyDiminishingReturns(
  characterId: string,
  skillName: string
): number {
  const history = recentSkillUses.get(characterId) || [];
  
  // Count recent uses of this skill
  const recentCount = history.filter(s => s === skillName).length;
  
  // Check for variety bonus (different from last 3)
  const last3 = history.slice(-3);
  const hasVariety = last3.length >= 3 && !last3.includes(skillName);
  
  // Update history
  const newHistory = [...history, skillName].slice(-HISTORY_SIZE);
  recentSkillUses.set(characterId, newHistory);
  
  // Calculate multiplier
  let multiplier = Math.pow(DIMINISHING_FACTOR, recentCount);
  if (hasVariety) multiplier *= 1.1; // 10% variety bonus
  
  return Math.max(0.3, multiplier); // Floor at 30%
}

/**
 * Clear diminishing returns history (for testing)
 */
export function clearDiminishingReturns(characterId?: string): void {
  if (characterId) {
    recentSkillUses.delete(characterId);
  } else {
    recentSkillUses.clear();
  }
}

// === SKILL XP AWARDING ===

export interface SkillXPResult {
  updatedSkills: Record<string, SkillProgression>;
  diffs: TurnDiff[];
  xpGained: number;
  leveledUp: boolean;
}

/**
 * Get unlocked verbs for a skill at a given level
 */
function getUnlockedVerbs(skillName: string, level: number): string[] {
  const verbs: string[] = [];
  
  for (const pillar of SKILL_TREE) {
    const skill = pillar.skills.find(s => s.name === skillName);
    if (skill) {
      if (level >= SKILL_RULES.unlockLevels.tier1) verbs.push(...skill.tier1);
      if (level >= SKILL_RULES.unlockLevels.tier2) verbs.push(...skill.tier2);
      if (level >= SKILL_RULES.unlockLevels.tier3) verbs.push(...skill.tier3);
      break;
    }
  }
  
  return verbs;
}

/**
 * Award XP to a skill and handle level-ups
 */
export function awardSkillXP(
  characterId: string,
  currentSkills: Record<string, SkillProgression>,
  skillName: string,
  dc?: number,
  tier?: number,
  success?: boolean
): SkillXPResult {
  // Get or initialize skill
  const skill = currentSkills[skillName] || {
    level: 0,
    xp: 0,
    nextLevel: xpForLevel(2),
    verbs: [],
  };
  
  // Calculate XP with diminishing returns
  const baseXp = calculateSkillXP(dc, tier, success);
  const multiplier = applyDiminishingReturns(characterId, skillName);
  const xpGained = Math.floor(baseXp * multiplier);
  
  // Apply XP
  const oldLevel = skill.level;
  const newTotalXp = skill.xp + xpGained;
  const newLevel = Math.max(oldLevel, levelFromXp(newTotalXp));
  const leveledUp = newLevel > oldLevel;
  
  // Build updated skill
  const updatedSkill: SkillProgression = {
    level: newLevel,
    xp: newTotalXp,
    nextLevel: xpForLevel(newLevel + 1),
    verbs: getUnlockedVerbs(skillName, newLevel),
  };
  
  // Build diffs
  const diffs: TurnDiff[] = [];
  
  if (leveledUp) {
    diffs.push({
      type: "skill",
      text: `${skillName} Level Up!`,
      value: `→ ${newLevel}`,
    });
  } else {
    diffs.push({
      type: "skill",
      text: skillName,
      value: `+${xpGained} XP`,
    });
  }
  
  return {
    updatedSkills: { ...currentSkills, [skillName]: updatedSkill },
    diffs,
    xpGained,
    leveledUp,
  };
}
