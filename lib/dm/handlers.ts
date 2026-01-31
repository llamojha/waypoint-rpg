/**
 * DM Tool Handlers
 * 
 * Execution logic for DM fix tools. Cross-checks against DB state
 * and applies fixes when inconsistencies are found.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Character, WorldContext, Turn } from "@/types";
import type {
  CheckStateConsistencyArgs,
  FixCharacterStateArgs,
  FixWorldStateArgs,
  ExplainStateArgs,
} from "./tools";

/**
 * Result of a consistency check
 */
export interface ConsistencyCheckResult {
  isConsistent: boolean;
  actualValue: string;
  expectedValue?: string;
  details: string;
  canFix: boolean;
}

/**
 * Result of a fix operation
 */
export interface FixResult {
  success: boolean;
  message: string;
  changes?: Record<string, unknown>;
}

/**
 * Check state consistency against DB
 */
export async function handleCheckStateConsistency(
  args: CheckStateConsistencyArgs,
  character: Character,
  world: WorldContext,
  recentTurns: Turn[],
  supabase: SupabaseClient
): Promise<ConsistencyCheckResult> {
  const { claim_type, claimed_value } = args;
  const claimLower = claimed_value.toLowerCase();

  switch (claim_type) {
    case "location": {
      const actualLocation = world.poi;
      // Check if player claims they should be somewhere else
      const claimsWrongLocation = claimLower.includes("should be at") || 
        claimLower.includes("shouldn't be at") ||
        claimLower.includes("wrong location");
      
      return {
        isConsistent: !claimsWrongLocation,
        actualValue: actualLocation,
        details: `You are currently at ${actualLocation} in ${world.region}.`,
        canFix: false, // Location fixes require travel, not DM intervention
      };
    }

    case "npc_presence": {
      const entities = world.entities || [];
      const entitiesLower = entities.map(e => e.toLowerCase());
      
      // Extract NPC name from claim
      const npcMatch = claimLower.match(/(\w+)\s+(should|shouldn't|is|isn't)/);
      const npcName = npcMatch?.[1] || "";
      
      const npcPresent = entitiesLower.some(e => e.includes(npcName));
      const claimsNpcShouldntBeHere = claimLower.includes("shouldn't be here") || 
        claimLower.includes("isn't here") ||
        claimLower.includes("not here");
      const claimsNpcShouldBeHere = claimLower.includes("should be here") ||
        claimLower.includes("is here");

      // Check for inconsistency
      let isConsistent = true;
      let details = "";
      
      if (claimsNpcShouldntBeHere && npcPresent) {
        // Player says NPC shouldn't be here, but they are in state
        // This could be a narration error - report the actual state
        isConsistent = true; // State is what it is - narration may have been wrong
        details = `${npcName} IS currently listed at ${world.poi}. If the narration mentioned them incorrectly, that was a narration error - the state shows they are here.`;
      } else if (claimsNpcShouldBeHere && !npcPresent) {
        isConsistent = false;
        details = `${npcName} is not currently at ${world.poi}. Present: ${entities.join(", ") || "no one"}.`;
      } else {
        details = `NPCs present at ${world.poi}: ${entities.join(", ") || "no one"}.`;
      }

      return {
        isConsistent,
        actualValue: entities.join(", ") || "none",
        details,
        canFix: !isConsistent, // Can fix if there's an inconsistency
      };
    }

    case "character_stat": {
      // Check HP or gold claims
      const claimsHp = claimLower.includes("hp") || claimLower.includes("health");
      const claimsGold = claimLower.includes("gold") || claimLower.includes("coin");
      
      // Extract number from claim
      const numberMatch = claimLower.match(/(\d+)/);
      const claimedNumber = numberMatch ? parseInt(numberMatch[1]) : null;

      if (claimsHp) {
        const actualHp = character.hp;
        const isConsistent = claimedNumber === null || claimedNumber === actualHp;
        
        // Check recent turns for HP changes that might have been missed
        const hpChanges = recentTurns
          .flatMap(t => t.diffs || [])
          .filter(d => d.type === "stat" && d.text.toLowerCase().includes("hp"));
        
        return {
          isConsistent,
          actualValue: `${actualHp}/${character.maxHp}`,
          expectedValue: claimedNumber?.toString(),
          details: isConsistent 
            ? `Your HP is correctly ${actualHp}/${character.maxHp}.`
            : `Your HP is ${actualHp}/${character.maxHp}, not ${claimedNumber}. Recent HP changes: ${hpChanges.length > 0 ? hpChanges.map(d => d.value).join(", ") : "none"}.`,
          canFix: !isConsistent && claimedNumber !== null,
        };
      }

      if (claimsGold) {
        const actualGold = character.gold;
        const isConsistent = claimedNumber === null || claimedNumber === actualGold;
        
        // Check recent turns for gold changes
        const goldChanges = recentTurns
          .flatMap(t => t.diffs || [])
          .filter(d => d.type === "stat" && d.text.toLowerCase().includes("gold"));
        
        return {
          isConsistent,
          actualValue: actualGold.toString(),
          expectedValue: claimedNumber?.toString(),
          details: isConsistent
            ? `Your gold is correctly ${actualGold}.`
            : `Your gold is ${actualGold}, not ${claimedNumber}. Recent gold changes: ${goldChanges.length > 0 ? goldChanges.map(d => d.value).join(", ") : "none"}.`,
          canFix: !isConsistent && claimedNumber !== null,
        };
      }

      return {
        isConsistent: true,
        actualValue: `HP: ${character.hp}/${character.maxHp}, Gold: ${character.gold}`,
        details: `Your stats are HP: ${character.hp}/${character.maxHp}, Gold: ${character.gold}.`,
        canFix: false,
      };
    }

    case "inventory": {
      const inventory = character.inventory;
      const inventoryNames = inventory.map(i => i.name.toLowerCase());
      
      // Extract item name from claim
      const itemMatch = claimLower.match(/(?:have|has|got|missing|lost)\s+(?:a\s+)?(\w+(?:\s+\w+)?)/);
      const itemName = itemMatch?.[1] || "";
      
      const hasItem = inventoryNames.some(n => n.includes(itemName));
      const claimsShouldHave = claimLower.includes("should have") || claimLower.includes("missing");
      const claimsShouldntHave = claimLower.includes("shouldn't have") || claimLower.includes("don't have");

      let isConsistent = true;
      if (claimsShouldHave && !hasItem) {
        isConsistent = false;
      } else if (claimsShouldntHave && hasItem) {
        isConsistent = false;
      }

      return {
        isConsistent,
        actualValue: inventory.map(i => i.name).join(", ") || "empty",
        details: `Your inventory: ${inventory.map(i => i.name).join(", ") || "empty"}.`,
        canFix: !isConsistent,
      };
    }

    case "quest": {
      // Query active quests
      const { data: quests } = await supabase
        .from("waypoint_character_quests")
        .select("quest_id, status, progress, waypoint_quests(title)")
        .eq("character_id", character.id)
        .eq("status", "active");

      const activeQuests = quests?.map(q => (q.waypoint_quests as { title: string })?.title) || [];
      
      return {
        isConsistent: true, // Quest state is complex, just report
        actualValue: activeQuests.join(", ") || "none",
        details: `Active quests: ${activeQuests.join(", ") || "none"}.`,
        canFix: false,
      };
    }

    default:
      return {
        isConsistent: true,
        actualValue: "unknown",
        details: "Unable to check this type of state.",
        canFix: false,
      };
  }
}

/**
 * Fix character state (HP, gold, inventory)
 */
export async function handleFixCharacterState(
  args: FixCharacterStateArgs,
  characterId: string,
  supabase: SupabaseClient
): Promise<FixResult> {
  const { fix_type, new_value, item_name, reason } = args;

  // Validate reason contains evidence of inconsistency
  if (!reason || reason.length < 10) {
    return {
      success: false,
      message: "A valid reason referencing the inconsistency is required.",
    };
  }

  switch (fix_type) {
    case "hp": {
      if (new_value === undefined || new_value < 0) {
        return { success: false, message: "Invalid HP value." };
      }

      const { error } = await supabase
        .from("waypoint_characters")
        .update({ hp: new_value })
        .eq("id", characterId);

      if (error) {
        return { success: false, message: `Failed to update HP: ${error.message}` };
      }

      return {
        success: true,
        message: `HP corrected to ${new_value}. Reason: ${reason}`,
        changes: { hp: new_value },
      };
    }

    case "gold": {
      if (new_value === undefined || new_value < 0) {
        return { success: false, message: "Invalid gold value." };
      }

      const { error } = await supabase
        .from("waypoint_characters")
        .update({ gold: new_value })
        .eq("id", characterId);

      if (error) {
        return { success: false, message: `Failed to update gold: ${error.message}` };
      }

      return {
        success: true,
        message: `Gold corrected to ${new_value}. Reason: ${reason}`,
        changes: { gold: new_value },
      };
    }

    case "add_item": {
      if (!item_name) {
        return { success: false, message: "Item name required." };
      }

      // Get current inventory
      const { data: char } = await supabase
        .from("waypoint_characters")
        .select("inventory")
        .eq("id", characterId)
        .single();

      if (!char) {
        return { success: false, message: "Character not found." };
      }

      const inventory = (char.inventory as unknown[]) || [];
      const newItem = {
        id: crypto.randomUUID(),
        name: item_name,
        type: "misc",
        description: `Added by DM fix: ${reason}`,
        tags: [],
      };

      const { error } = await supabase
        .from("waypoint_characters")
        .update({ inventory: [...inventory, newItem] })
        .eq("id", characterId);

      if (error) {
        return { success: false, message: `Failed to add item: ${error.message}` };
      }

      return {
        success: true,
        message: `Added "${item_name}" to inventory. Reason: ${reason}`,
        changes: { added_item: item_name },
      };
    }

    case "remove_item": {
      if (!item_name) {
        return { success: false, message: "Item name required." };
      }

      // Get current inventory
      const { data: char } = await supabase
        .from("waypoint_characters")
        .select("inventory")
        .eq("id", characterId)
        .single();

      if (!char) {
        return { success: false, message: "Character not found." };
      }

      const inventory = (char.inventory as Array<{ name: string }>) || [];
      const itemIndex = inventory.findIndex(
        i => i.name.toLowerCase() === item_name.toLowerCase()
      );

      if (itemIndex === -1) {
        return { success: false, message: `Item "${item_name}" not in inventory.` };
      }

      const newInventory = [...inventory];
      newInventory.splice(itemIndex, 1);

      const { error } = await supabase
        .from("waypoint_characters")
        .update({ inventory: newInventory })
        .eq("id", characterId);

      if (error) {
        return { success: false, message: `Failed to remove item: ${error.message}` };
      }

      return {
        success: true,
        message: `Removed "${item_name}" from inventory. Reason: ${reason}`,
        changes: { removed_item: item_name },
      };
    }

    default:
      return { success: false, message: "Unknown fix type." };
  }
}

/**
 * Fix world state (location, entities)
 */
export async function handleFixWorldState(
  args: FixWorldStateArgs,
  characterId: string,
  supabase: SupabaseClient
): Promise<FixResult> {
  const { fix_type, value, reason } = args;

  // Validate reason
  if (!reason || reason.length < 10) {
    return {
      success: false,
      message: "A valid reason referencing the inconsistency is required.",
    };
  }

  switch (fix_type) {
    case "location": {
      // Update world state location
      const { error } = await supabase
        .from("waypoint_world_state")
        .update({ poi: value })
        .eq("character_id", characterId);

      if (error) {
        return { success: false, message: `Failed to update location: ${error.message}` };
      }

      return {
        success: true,
        message: `Location corrected to "${value}". Reason: ${reason}`,
        changes: { location: value },
      };
    }

    case "add_entity":
    case "remove_entity": {
      // Get current world state
      const { data: worldState } = await supabase
        .from("waypoint_world_state")
        .select("entities")
        .eq("character_id", characterId)
        .single();

      if (!worldState) {
        return { success: false, message: "World state not found." };
      }

      const entities = (worldState.entities as string[]) || [];
      let newEntities: string[];

      if (fix_type === "add_entity") {
        if (entities.some(e => e.toLowerCase() === value.toLowerCase())) {
          return { success: false, message: `"${value}" is already present.` };
        }
        newEntities = [...entities, value];
      } else {
        const index = entities.findIndex(e => e.toLowerCase() === value.toLowerCase());
        if (index === -1) {
          return { success: false, message: `"${value}" is not present.` };
        }
        newEntities = [...entities];
        newEntities.splice(index, 1);
      }

      const { error } = await supabase
        .from("waypoint_world_state")
        .update({ entities: newEntities })
        .eq("character_id", characterId);

      if (error) {
        return { success: false, message: `Failed to update entities: ${error.message}` };
      }

      return {
        success: true,
        message: fix_type === "add_entity"
          ? `Added "${value}" to location. Reason: ${reason}`
          : `Removed "${value}" from location. Reason: ${reason}`,
        changes: { entities: newEntities },
      };
    }

    default:
      return { success: false, message: "Unknown fix type." };
  }
}

/**
 * Handle explain state - just returns the explanation for the DM to use
 */
export function handleExplainState(args: ExplainStateArgs): string {
  const { state_type, current_value, explanation } = args;
  return `Your ${state_type} is currently: ${current_value}. ${explanation}`;
}
