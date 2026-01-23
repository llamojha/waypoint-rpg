/**
 * Equipment stats calculator
 * Aggregates AC, skill bonuses, and weapon damage from equipped items
 */

import type { Equipment, Item } from "@/types";

const BASE_AC = 10;
const DEFAULT_UNARMED_DAMAGE = "1d4";

/**
 * Calculate total AC from equipped armor pieces
 * Formula: 10 (base) + sum of all equipped item AC values
 */
export function calculateTotalAC(equipment: Equipment): number {
  let totalAC = BASE_AC;

  const slots: (keyof Equipment)[] = [
    "head", "chest", "arms", "legs", "cloak", "offHand"
  ];

  for (const slot of slots) {
    const item = equipment[slot] as Item | null;
    if (item?.stats?.ac) {
      totalAC += item.stats.ac;
    }
  }

  return totalAC;
}

/**
 * Aggregate skill bonuses from all equipped items
 * Returns a map of skill name to total bonus
 */
export function calculateEquipmentSkillBonuses(
  equipment: Equipment
): Record<string, number> {
  const bonuses: Record<string, number> = {};

  const slots: (keyof Equipment)[] = [
    "mainHand", "offHand", "head", "chest", "arms", "legs", "cloak", "trinket"
  ];

  for (const slot of slots) {
    const item = equipment[slot] as Item | null;
    if (item?.skillBonuses) {
      for (const [skill, bonus] of Object.entries(item.skillBonuses)) {
        bonuses[skill] = (bonuses[skill] || 0) + bonus;
      }
    }
  }

  return bonuses;
}

/**
 * Get weapon damage notation from mainHand
 * Returns null if no weapon equipped, defaults to unarmed damage
 */
export function getWeaponDamage(equipment: Equipment): string {
  const weapon = equipment.mainHand as Item | null;
  return weapon?.stats?.damage || DEFAULT_UNARMED_DAMAGE;
}

/**
 * Get equipment bonus for a specific skill
 */
export function getEquipmentBonusForSkill(
  equipment: Equipment,
  skill: string
): number {
  const bonuses = calculateEquipmentSkillBonuses(equipment);
  return bonuses[skill] || 0;
}
