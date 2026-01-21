/**
 * Quest Rules Engine
 * Validates quest progress based on goal types and required events
 */

import type {
  QuestValidationContext,
  QuestGoalRule,
  ValidationResult,
  RuleConstraints,
  QuestGoalType,
  EventType,
} from "./types";
import { getQuestGoalRules } from "./cache";

/**
 * Validates if proposed events allow quest progress
 */
export async function validateQuestProgress(
  ctx: QuestValidationContext
): Promise<ValidationResult> {
  const rules = await getQuestGoalRules();
  const rule = rules.find((r) => r.goalType === ctx.goalType);

  if (!rule) {
    return { valid: false, reason: `No rule found for goal type: ${ctx.goalType}` };
  }

  const hasRequiredEvent = ctx.proposedEvents.some((event) => {
    if (event.type !== rule.requiredEventType) return false;

    // Goal-specific validation
    switch (ctx.goalType) {
      case "exploration":
        return event.type === "location_change" && 
               event.data.location && 
               ctx.currentGoal.toLowerCase().includes(String(event.data.location).toLowerCase());

      case "dialogue":
        return event.type === "relationship_change" && 
               event.data.npc && 
               ctx.currentGoal.toLowerCase().includes(String(event.data.npc).toLowerCase());

      case "fetch":
        return event.type === "inventory_add" && 
               event.data.item && 
               ctx.currentGoal.toLowerCase().includes(String(event.data.item).toLowerCase());

      case "combat":
        return event.type === "enemy_defeated";

      case "discover":
        return (event.type === "npc_discovered" || event.type === "location_change");

      default:
        return false;
    }
  });

  return {
    valid: hasRequiredEvent,
    reason: hasRequiredEvent ? undefined : `Missing required event: ${rule.requiredEventType}`,
  };
}

/**
 * Returns constraints for what's needed to progress a quest
 */
export async function getQuestConstraints(quest: {
  goalType: QuestGoalType;
  currentGoal: string;
}): Promise<RuleConstraints> {
  const rules = await getQuestGoalRules();
  const rule = rules.find((r) => r.goalType === quest.goalType);

  if (!rule) {
    return { context: `Unknown goal type: ${quest.goalType}` };
  }

  const constraints: RuleConstraints = {
    requires: [rule.requiredEventType],
    context: `Quest progress requires: ${rule.requiredEventType}`,
  };

  // Add goal-specific context
  switch (quest.goalType) {
    case "exploration":
      constraints.context += ". Must visit the specified location.";
      break;
    case "dialogue":
      constraints.context += ". Must interact with the specified NPC.";
      break;
    case "fetch":
      constraints.context += ". Must obtain the specified item.";
      break;
    case "combat":
      constraints.context += ". Must defeat an enemy.";
      break;
    case "discover":
      constraints.context += ". Must discover a new NPC or location.";
      break;
  }

  return constraints;
}
