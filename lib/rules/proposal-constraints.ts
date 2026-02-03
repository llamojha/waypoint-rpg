/**
 * Proposal Constraint Layer
 * 
 * Maps action types to allowed proposal tools.
 * This is the core of the constrained orchestrator - the LLM can only
 * propose changes using tools it's given access to.
 */

import type { ActionType } from "@/lib/agents/rune-marshal";
import { PROPOSAL_TOOLS } from "@/lib/agents/tools/proposal-tools";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import type { FunctionDeclaration } from "@google/genai";

/**
 * Mapping of action types to allowed proposal tool names
 * 
 * | Type        | Allowed Proposals                                                    |
 * |-------------|----------------------------------------------------------------------|
 * | passive     | [] (none - observation/conversation)                                 |
 * | travel      | [location_change, npc_discovered]                                    |
 * | social      | [relationship_change, quest_start*, quest_progress*, npc_discovered] |
 * | combat      | [stat_change, inventory_add, relationship_change, combat_damage, combat_start] |
 * | object      | [inventory_add, inventory_remove, stat_change]                       |
 * | transaction | [inventory_add, inventory_remove, stat_change, relationship_change]  |
 * 
 * * Quest tools only available when FEATURE_FLAGS.quests is enabled
 * 
 * Multiple action types can be combined (e.g., ["social", "transaction"] for accepting a gift)
 * Use getUnionOfAllowedTools() to merge tools from multiple action types.
 */
function getActionTypeConstraints(): Record<ActionType, string[]> {
  const socialTools = ["propose_relationship_change", "propose_npc_discovered"];
  if (FEATURE_FLAGS.quests) {
    socialTools.push("propose_quest_start", "propose_quest_progress");
  }
  
  return {
    passive: [],
    travel: ["propose_location_change", "propose_npc_discovered"],
    social: socialTools,
    combat: ["propose_stat_change", "propose_inventory_add", "propose_relationship_change", "propose_combat_damage", "propose_combat_start"],
    object: ["propose_inventory_add", "propose_inventory_remove", "propose_stat_change"],
    transaction: ["propose_inventory_add", "propose_inventory_remove", "propose_stat_change", "propose_relationship_change"],
  };
}

/**
 * Get allowed proposal tools for an action type
 * 
 * @param actionType - The classified action type from Rune Marshal
 * @returns Array of FunctionDeclaration for allowed proposal tools
 */
export function getAllowedProposalTools(actionType: ActionType): FunctionDeclaration[] {
  const constraints = getActionTypeConstraints();
  const allowedNames = constraints[actionType] || [];
  
  // Filter PROPOSAL_TOOLS to only include allowed ones
  // Note: detect_intent is always excluded as it's handled by Rune Marshal
  return PROPOSAL_TOOLS.filter(
    tool => tool.name && allowedNames.includes(tool.name) && tool.name !== "detect_intent"
  ) as FunctionDeclaration[];
}

/**
 * Get allowed tool names for an action type (for display/debugging)
 */
export function getAllowedToolNames(actionType: ActionType): string[] {
  const constraints = getActionTypeConstraints();
  return constraints[actionType] || [];
}

/**
 * Get union of allowed tools for multiple action types
 * Used when player action spans multiple types (e.g., "I thank Lucie and head to the market")
 */
export function getUnionOfAllowedTools(actionTypes: ActionType[]): FunctionDeclaration[] {
  const constraints = getActionTypeConstraints();
  const allAllowedNames = new Set<string>();
  
  for (const actionType of actionTypes) {
    const names = constraints[actionType] || [];
    names.forEach(name => allAllowedNames.add(name));
  }
  
  return PROPOSAL_TOOLS.filter(
    tool => tool.name && allAllowedNames.has(tool.name) && tool.name !== "detect_intent"
  ) as FunctionDeclaration[];
}

/**
 * Check if a proposal type is allowed for an action type
 */
export function isProposalAllowed(actionType: ActionType, proposalType: string): boolean {
  const constraints = getActionTypeConstraints();
  const allowedNames = constraints[actionType] || [];
  return allowedNames.includes(proposalType);
}

/**
 * Get a human-readable description of constraints for an action type
 * Used in Orchestrator prompt to explain why tools are limited
 */
export function getConstraintDescription(actionType: ActionType): string {
  switch (actionType) {
    case "passive":
      return "This is an observation or conversation action. No state changes should be proposed - the Chronicler will generate an appropriate response.";
    case "travel":
      return "This is a travel action. You may only propose location changes and NPC discoveries (if arriving at a new location).";
    case "social":
      return "This is a social interaction. You may propose relationship changes, quest starts/progress, and NPC discoveries.";
    case "combat":
      return "This is a combat action. You may propose combat damage to enemies, stat changes (HP damage to player), and inventory additions (loot).";
    case "object":
      return "This is an object manipulation action. You may propose inventory changes and stat changes (gold for purchases).";
    case "transaction":
      return "This is a transaction action (buying, selling, accepting/giving items). You may propose inventory changes, stat changes (gold), and relationship changes.";
    default:
      return "Unknown action type. No proposals allowed.";
  }
}

/**
 * Get a combined description for multiple action types
 */
export function getUnionConstraintDescription(actionTypes: ActionType[]): string {
  if (actionTypes.length === 0) return "No action types specified. No proposals allowed.";
  if (actionTypes.length === 1) return getConstraintDescription(actionTypes[0]);
  
  return `This action combines multiple types (${actionTypes.join(", ")}). You may use tools from any of these categories.`;
}
