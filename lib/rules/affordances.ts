/**
 * Affordance Builder
 * 
 * Computes valid IDs from current state and constrains Orchestrator tools.
 * This prevents invalid proposals by construction (defense in depth with Arbiter).
 */

import type { Character, WorldContext } from "@/types";
import type { ActionType } from "@/lib/agents/rune-marshal";
import type { FunctionDeclaration } from "@google/genai";
import { getLocationConnectionRules } from "./cache";

export interface Affordances {
  /** Valid destination POI names for travel */
  locationIds: string[];
  /** NPC names present at current location */
  npcIds: string[];
  /** Enemy names in active combat */
  enemyIds: string[];
  /** Item names in inventory */
  itemIds: string[];
}

/**
 * Build affordances from current game state
 */
export async function buildAffordances(
  character: Character,
  world: WorldContext,
  actionType: ActionType
): Promise<Affordances> {
  // Get connected locations for travel
  let locationIds: string[] = [];
  if (actionType === "travel") {
    const connections = await getLocationConnectionRules();
    locationIds = connections
      .filter(c => c.fromLocation.toLowerCase() === world.poi.toLowerCase())
      .map(c => c.toLocation);
    
    // Add nearbyPoi as fallback
    if (world.nearbyPoi?.length) {
      locationIds = [...new Set([...locationIds, ...world.nearbyPoi])];
    }
  }

  return {
    locationIds,
    npcIds: world.entities || [],
    enemyIds: world.activeCombat?.enemies.map(e => e.name) || [],
    itemIds: character.inventory.map(i => i.name),
  };
}

/**
 * Inject enum constraint into a tool's property
 */
function injectEnum(
  tool: FunctionDeclaration,
  propertyName: string,
  validValues: string[]
): FunctionDeclaration {
  if (!validValues.length) return tool;
  
  const cloned = JSON.parse(JSON.stringify(tool)) as FunctionDeclaration;
  const props = cloned.parameters?.properties as Record<string, { enum?: string[] }> | undefined;
  if (props?.[propertyName]) {
    props[propertyName].enum = validValues;
  }
  return cloned;
}

/**
 * Constrain tools with affordances by injecting enums
 */
export function constrainTools(
  tools: FunctionDeclaration[],
  affordances: Affordances
): FunctionDeclaration[] {
  return tools.map(tool => {
    switch (tool.name) {
      case "propose_location_change":
        return injectEnum(tool, "location", affordances.locationIds);
      case "propose_combat_damage":
        return injectEnum(tool, "enemy_name", affordances.enemyIds);
      case "propose_inventory_remove":
        return injectEnum(tool, "item_name", affordances.itemIds);
      default:
        return tool;
    }
  });
}

/**
 * Format affordances for prompt text (backup for LLM)
 */
export function formatAffordancesForPrompt(affordances: Affordances): string {
  const lines: string[] = [];
  
  if (affordances.locationIds.length > 0) {
    lines.push(`Valid travel destinations: ${affordances.locationIds.join(", ")}`);
  }
  
  if (affordances.enemyIds.length > 0) {
    lines.push(`Valid combat targets: ${affordances.enemyIds.join(", ")}`);
  }
  
  return lines.length > 0 ? `\n## Affordances (ONLY these are valid)\n${lines.join("\n")}` : "";
}

/**
 * Valid skill pillars for each action type
 * Used to validate that detected skill matches the action context
 */
const ACTION_TYPE_SKILL_PILLARS: Record<ActionType, string[]> = {
  combat: ["Combat", "Defense", "Athleticism"],
  travel: ["Athleticism", "Stealth", "Wisdom", "Survival"],
  social: ["Charisma", "Wisdom"],
  object: ["Sleight", "Wisdom", "Lore"],
  passive: ["Wisdom", "Lore"], // observation/perception
};

/**
 * Skill to pillar mapping (derived from SKILL_TREE)
 * WARNING: Keep in sync with SKILL_TREE in constants.ts
 */
const SKILL_TO_PILLAR: Record<string, string> = {
  // Combat
  Melee: "Combat", Ranged: "Combat", Styles: "Combat",
  // Defense
  Blocking: "Defense", Armor: "Defense", Toughness: "Defense",
  // Athleticism
  Athletics: "Athleticism", Acrobatics: "Athleticism", Endurance: "Athleticism",
  // Stealth
  Sneaking: "Stealth", Hiding: "Stealth", "Scouting Unseen": "Stealth",
  // Sleight
  Lockpicking: "Sleight", "Trap Disarm": "Sleight", "Sleight of Hand": "Sleight",
  // Charisma
  Persuasion: "Charisma", Deception: "Charisma", Intimidation: "Charisma", Performance: "Charisma",
  // Wisdom
  Perception: "Wisdom", Insight: "Wisdom",
  // Lore
  History: "Lore", Arcana: "Lore", Nature: "Lore", Religion: "Lore",
  // Survival
  Tracking: "Survival", Foraging: "Survival", Navigation: "Survival",
  // Crafting
  Smithing: "Crafting", Alchemy: "Crafting", Enchanting: "Crafting",
  // Trade
  Appraisal: "Trade", Haggling: "Trade", Networking: "Trade",
  // Medicine
  "First Aid": "Medicine", Diagnosis: "Medicine", Surgery: "Medicine",
  // Magic
  Spellcasting: "Magic", Rituals: "Magic", Wards: "Magic", Summoning: "Magic",
};

/**
 * Validate that a detected skill is appropriate for the action type
 * Returns null if valid, or a suggested skill if invalid
 */
export function validateSkillForActionType(
  skill: string,
  actionType: ActionType
): { valid: boolean; reason?: string; suggestedPillars?: string[] } {
  const pillar = SKILL_TO_PILLAR[skill];
  if (!pillar) {
    // Unknown skill - allow it (might be new)
    return { valid: true };
  }

  const validPillars = ACTION_TYPE_SKILL_PILLARS[actionType];
  if (!validPillars) {
    // Unknown action type - allow it
    return { valid: true };
  }

  if (validPillars.includes(pillar)) {
    return { valid: true };
  }

  return {
    valid: false,
    reason: `Skill "${skill}" (${pillar}) is unusual for ${actionType} action`,
    suggestedPillars: validPillars,
  };
}
