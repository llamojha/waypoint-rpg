/**
 * Loot Rules
 * Handles loot tables and item discovery rules
 */

import type { LootOptions, RuleConstraints } from "./types";
import { getLootTableRules } from "./cache";

/**
 * Check if an action can yield loot in a location type
 */
export async function canGetLoot(action: string, locationType: string): Promise<boolean> {
  const lootTables = await getLootTableRules();
  const table = lootTables.find(t => t.locationType === locationType);
  
  if (!table) return false;
  
  return table.actionWhitelist.some(pattern => 
    action.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * Get loot options for an action in a location type
 */
export async function getLootOptions(action: string, locationType: string): Promise<LootOptions> {
  const canLoot = await canGetLoot(action, locationType);
  
  if (!canLoot) {
    return {
      canLoot: false,
      reason: "Action not valid for looting in this location"
    };
  }
  
  const lootTables = await getLootTableRules();
  const table = lootTables.find(t => t.locationType === locationType);
  
  return {
    canLoot: true,
    availableItems: table!.itemPool,
    rarityWeights: table!.rarityWeights
  };
}

/**
 * Get loot constraints for a location type
 */
export async function getLootConstraints(locationType: string): Promise<RuleConstraints> {
  const lootTables = await getLootTableRules();
  const table = lootTables.find(t => t.locationType === locationType);
  
  return {
    validOptions: table?.itemPool || []
  };
}
