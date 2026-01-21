/**
 * Relationship Rules
 * Handles relationship delta bounds based on interaction types
 */

import type { InteractionType, RelationshipBounds, ValidationResult, RuleConstraints } from "./types";
import { getRelationshipRules } from "./cache";

/**
 * Classify an action into an interaction type based on keywords
 */
export async function classifyInteraction(
  action: string,
  _npcDisposition?: string
): Promise<InteractionType | null> {
  const rules = await getRelationshipRules();
  const actionLower = action.toLowerCase();

  for (const rule of rules) {
    if (rule.keywords.some((keyword) => actionLower.includes(keyword))) {
      return rule.interactionType;
    }
  }

  return null;
}

/**
 * Get relationship delta bounds for an interaction type
 */
export async function getRelationshipBounds(
  interactionType: InteractionType
): Promise<RelationshipBounds> {
  const rules = await getRelationshipRules();
  const rule = rules.find((r) => r.interactionType === interactionType);

  if (!rule) {
    // Default to small_talk bounds if not found
    return { interactionType, deltaMin: 0, deltaMax: 1 };
  }

  return {
    interactionType: rule.interactionType,
    deltaMin: rule.deltaMin,
    deltaMax: rule.deltaMax,
  };
}

/**
 * Validate a proposed relationship delta against bounds
 */
export async function validateRelationshipDelta(
  interactionType: InteractionType,
  proposedDelta: number
): Promise<ValidationResult> {
  const bounds = await getRelationshipBounds(interactionType);

  if (proposedDelta < bounds.deltaMin) {
    return {
      valid: false,
      reason: `Delta ${proposedDelta} below minimum ${bounds.deltaMin}`,
      modified: bounds.deltaMin,
    };
  }

  if (proposedDelta > bounds.deltaMax) {
    return {
      valid: false,
      reason: `Delta ${proposedDelta} above maximum ${bounds.deltaMax}`,
      modified: bounds.deltaMax,
    };
  }

  return { valid: true };
}

/**
 * Get relationship constraints for prompt injection
 */
export async function getRelationshipConstraints(
  action: string
): Promise<RuleConstraints> {
  const interactionType = await classifyInteraction(action);

  if (!interactionType) {
    return { context: "Interaction type not recognized" };
  }

  const bounds = await getRelationshipBounds(interactionType);

  return {
    bounds: { min: bounds.deltaMin, max: bounds.deltaMax },
    context: `${interactionType}: delta must be ${bounds.deltaMin} to ${bounds.deltaMax}`,
  };
}
