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
 * Includes: skill level bonus + power word bonus + equipment bonus
 */
export function calculateTotalModifier(
  skillLevel: number,
  powerWordBonus: number,
  equipmentBonus: number = 0
): number {
  return getSkillModifier(skillLevel) + powerWordBonus + equipmentBonus;
}
