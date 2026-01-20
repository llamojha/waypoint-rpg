/**
 * Rules Engine
 * Unified entry point for all game mechanics rules
 * Evaluates rules and returns constraints for Orchestrator/Arbiter
 */

import type {
  RulesContext,
  RulesGameState,
  ValidationResult,
  QuestValidationContext,
  QuestGoalType,
} from "./types";
import { validateQuestProgress, getQuestConstraints } from "./quests";
import { matchSkillCheckRule, getSkillConstraints } from "./skills";
import { classifyInteraction, getRelationshipBounds, validateRelationshipDelta } from "./relationships";
import { canTravelTo, getLocationConstraints } from "./locations";
import { getLootOptions, getLootConstraints } from "./loot";
import { preloadRulesCache } from "./cache";

/**
 * Get full rules context for a player action
 * Used to inject constraints into Orchestrator prompt
 */
export async function getRulesContext(
  playerAction: string,
  gameState: RulesGameState
): Promise<RulesContext> {
  const context: RulesContext = {};

  // Get skill check constraints
  const skillResult = await matchSkillCheckRule(playerAction);
  if (skillResult) {
    context.skillCheck = skillResult;
  }

  // Get location constraints
  const locationConstraints = await getLocationConstraints(
    gameState.world.poi,
    { inventory: gameState.character.inventory },
    gameState.npcRelationships
  );
  context.location = {
    validDestinations: locationConstraints.validOptions || [],
  };

  // Get quest constraints for active quests
  if (gameState.activeQuests.length > 0) {
    const quest = gameState.activeQuests[0]; // Primary active quest
    const questConstraints = await getQuestConstraints({
      goalType: quest.goalType,
      currentGoal: quest.currentGoal,
    });
    context.quest = {
      canProgress: false, // Will be determined by validateQuestProgress
      requiredEvent: questConstraints.requires?.[0] as any,
    };
  }

  // Get loot constraints based on location type
  // Infer location type from POI name (simplified)
  const locationType = inferLocationType(gameState.world.poi);
  if (locationType) {
    context.loot = await getLootOptions(playerAction, locationType);
  }

  return context;
}

/**
 * Validate a quest progress proposal
 */
export async function validateQuestProgressProposal(
  questId: string,
  questTitle: string,
  currentGoal: string,
  goalType: QuestGoalType,
  proposedEvents: Array<{ type: string; data: Record<string, unknown> }>
): Promise<ValidationResult> {
  const ctx: QuestValidationContext = {
    questId,
    questTitle,
    currentGoal,
    goalType,
    proposedEvents,
  };
  return validateQuestProgress(ctx);
}

/**
 * Validate a relationship change proposal
 */
export async function validateRelationshipProposal(
  action: string,
  proposedDelta: number
): Promise<ValidationResult> {
  const interactionType = await classifyInteraction(action);

  if (!interactionType) {
    // Default to small_talk if can't classify
    return validateRelationshipDelta("small_talk", proposedDelta);
  }

  return validateRelationshipDelta(interactionType, proposedDelta);
}

/**
 * Validate a location change proposal
 */
export async function validateLocationProposal(
  from: string,
  to: string,
  character: { inventory: Array<{ name: string }>; questsCompleted?: string[] },
  npcRelationships?: Record<string, number>
): Promise<ValidationResult> {
  const result = await canTravelTo(from, to, character, npcRelationships);
  return {
    valid: result.valid,
    reason: result.reason,
  };
}

/**
 * Validate a loot/item discovery proposal
 */
export async function validateLootProposal(
  action: string,
  locationType: string,
  proposedItem: string
): Promise<ValidationResult> {
  const lootOptions = await getLootOptions(action, locationType);

  if (!lootOptions.canLoot) {
    return {
      valid: false,
      reason: lootOptions.reason || "Cannot loot with this action",
    };
  }

  const itemInPool = lootOptions.availableItems?.some(
    (item) => item.toLowerCase() === proposedItem.toLowerCase()
  );

  if (!itemInPool) {
    return {
      valid: false,
      reason: `Item "${proposedItem}" not in loot table for this location`,
    };
  }

  return { valid: true };
}

/**
 * Get skill check info for an action
 */
export async function getSkillCheckInfo(
  action: string,
  context?: { hostile?: boolean; dark?: boolean }
) {
  const result = await matchSkillCheckRule(action);
  if (!result) return null;

  const constraints = await getSkillConstraints(action, context);
  return {
    ...result,
    adjustedDcRange: constraints.bounds,
  };
}

/**
 * Infer location type from POI name for loot table lookup
 */
function inferLocationType(poi: string): string | null {
  const poiLower = poi.toLowerCase();

  if (poiLower.includes("forest") || poiLower.includes("woods")) return "forest";
  if (poiLower.includes("wilderness") || poiLower.includes("wild")) return "wilderness";
  if (poiLower.includes("dungeon") || poiLower.includes("cave") || poiLower.includes("crypt")) return "dungeon";
  if (poiLower.includes("ruins") || poiLower.includes("ruin") || poiLower.includes("ancient")) return "ruins";
  if (poiLower.includes("outpost") || poiLower.includes("town") || poiLower.includes("village")) return null; // No random loot in settlements

  return null;
}

/**
 * Preload all rules into cache (call on server startup)
 */
export { preloadRulesCache };

// Re-export individual modules for direct access
export * from "./quests";
export * from "./skills";
export * from "./relationships";
export * from "./locations";
export * from "./loot";
