/**
 * Skill Check Rules
 * Handles skill check patterns, DC ranges, and no-roll action whitelist
 */

import type { SkillCheckResult, RuleConstraints } from "./types";
import { getSkillCheckRules, getNoRollActionRules } from "./cache";

/**
 * Match an action against skill check rules
 */
export async function matchSkillCheckRule(action: string): Promise<SkillCheckResult | null> {
  const noRollRules = await getNoRollActionRules();
  const skillRules = await getSkillCheckRules();

  // Check no-roll patterns first
  for (const rule of noRollRules) {
    if (new RegExp(rule.pattern, "i").test(action)) {
      return { skill: "none", dcRange: { min: 0, max: 0 }, requiresRoll: false };
    }
  }

  // Check skill patterns
  for (const rule of skillRules) {
    if (new RegExp(rule.pattern, "i").test(action)) {
      return {
        skill: rule.skill,
        dcRange: { min: rule.dcMin, max: rule.dcMax },
        requiresRoll: rule.requiresRoll,
        modifiers: rule.contextModifiers,
      };
    }
  }

  return null;
}

/**
 * Check if an action is a no-roll action
 */
export async function isNoRollAction(action: string): Promise<boolean> {
  const result = await matchSkillCheckRule(action);
  return result?.requiresRoll === false;
}

/**
 * Get skill constraints with context modifiers applied
 */
export async function getSkillConstraints(
  action: string,
  context?: { hostile?: boolean; dark?: boolean }
): Promise<RuleConstraints> {
  const result = await matchSkillCheckRule(action);

  if (!result || !result.requiresRoll) {
    return { context: "No skill check required" };
  }

  let { min, max } = result.dcRange;

  // Apply context modifiers
  if (context?.hostile) {
    min += 2;
    max += 2;
  }
  if (context?.dark) {
    min += 3;
    max += 3;
  }

  return {
    bounds: { min, max },
    context: `${result.skill} check, DC ${min}-${max}`,
  };
}
