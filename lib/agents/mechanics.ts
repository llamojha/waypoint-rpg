/**
 * Mechanics Layer - Pure code, no LLM involvement
 * Handles all dice rolls and modifier calculations
 */

export interface RollResult {
  rolled: number;
  total: number;
  success: boolean;
  margin: number;
}

export interface SkillCheckResult {
  skill: string;
  rolled: number;
  modifier: number;
  bonus: number;
  total: number;
  dc: number;
  success: boolean;
  margin: number;
}

/**
 * Roll a d20 (1-20)
 */
export function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1;
}

/**
 * Roll multiple dice
 * @param sides - Number of sides on each die
 * @param count - Number of dice to roll
 */
export function rollDice(sides: number, count: number = 1): number[] {
  return Array.from({ length: count }, () => 
    Math.floor(Math.random() * sides) + 1
  );
}

/**
 * Calculate skill modifier from skill level
 * +1 per 10 levels (0-9 = +0, 10-19 = +1, etc.)
 */
export function calculateSkillModifier(skillLevel: number): number {
  return Math.floor(skillLevel / 10);
}

/**
 * Calculate power word bonus from tier
 * Tier 1 = +1, Tier 2 = +2, Tier 3 = +3
 */
export function calculatePowerWordBonus(tier: 1 | 2 | 3 | undefined): number {
  return tier || 0;
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
  return calculateSkillModifier(skillLevel) + powerWordBonus + equipmentBonus;
}

/**
 * Resolve a skill check against a DC
 */
export function resolveSkillCheck(
  skill: string,
  skillLevel: number,
  powerWordBonus: number,
  dc: number
): SkillCheckResult {
  const rolled = rollD20();
  const modifier = calculateSkillModifier(skillLevel);
  const bonus = powerWordBonus;
  const total = rolled + modifier + bonus;
  const success = total >= dc;
  const margin = total - dc;

  return {
    skill,
    rolled,
    modifier,
    bonus,
    total,
    dc,
    success,
    margin,
  };
}

/**
 * Parse dice notation (e.g., "2d6+3") and roll
 */
export function rollDiceNotation(notation: string): number {
  const match = notation.match(/^(\d+)d(\d+)(?:\+(\d+))?$/);
  if (!match) return 0;

  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const bonus = match[3] ? parseInt(match[3], 10) : 0;

  const rolls = rollDice(sides, count);
  return rolls.reduce((a, b) => a + b, 0) + bonus;
}

/**
 * Calculate damage with bonuses
 */
export function calculateDamage(
  diceNotation: string,
  bonuses: number[] = []
): number {
  const baseDamage = rollDiceNotation(diceNotation);
  const totalBonus = bonuses.reduce((a, b) => a + b, 0);
  return Math.max(0, baseDamage + totalBonus);
}
