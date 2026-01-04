/**
 * Skill modifier calculation
 */

/**
 * Get modifier bonus from skill level (+1 per 10 levels)
 */
export function getSkillModifier(skillLevel: number): number {
  return Math.floor(skillLevel / 10);
}

/**
 * Calculate total modifier for a skill check
 */
export function calculateTotalModifier(
  skillLevel: number,
  powerWordBonus: number
): number {
  return getSkillModifier(skillLevel) + powerWordBonus;
}
