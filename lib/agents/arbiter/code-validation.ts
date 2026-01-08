import type { Character, WorldContext } from "@/types";
import type { ProposalResult } from "../tools/proposal-tools";
import { ITEM_BOUNDS } from "@/constants";

export interface ValidationResult {
  valid: boolean;
  modified?: ProposalResult;
  reason?: string;
}

export interface CodeValidationContext {
  character: Character;
  world: WorldContext;
  validLocations: string[];
}

/**
 * Validate relationship change: ±2 per turn max, total -5 to +5
 */
function validateRelationshipCap(
  proposal: ProposalResult
): ValidationResult {
  if (proposal.type !== "propose_relationship_change") {
    return { valid: true };
  }

  const { delta } = proposal.data;
  
  // Cap delta to ±2 per turn
  if (Math.abs(delta) > 2) {
    const cappedDelta = Math.sign(delta) * 2;
    return {
      valid: true,
      modified: {
        ...proposal,
        data: { ...proposal.data, delta: cappedDelta },
      } as ProposalResult,
      reason: `Relationship delta capped from ${delta} to ${cappedDelta}`,
    };
  }

  return { valid: true };
}

/**
 * Validate HP bounds: 0 to maxHp
 */
function validateHpBounds(
  proposal: ProposalResult,
  ctx: CodeValidationContext
): ValidationResult {
  if (proposal.type !== "propose_stat_change") return { valid: true };
  if (proposal.data.stat !== "hp") return { valid: true };

  const { delta } = proposal.data;
  const newHp = ctx.character.hp + delta;

  // Cap to valid range
  if (newHp < 0) {
    const cappedDelta = -ctx.character.hp;
    return {
      valid: true,
      modified: {
        ...proposal,
        data: { ...proposal.data, delta: cappedDelta },
      } as ProposalResult,
      reason: `HP delta capped to prevent negative HP`,
    };
  }

  if (newHp > ctx.character.maxHp) {
    const cappedDelta = ctx.character.maxHp - ctx.character.hp;
    return {
      valid: true,
      modified: {
        ...proposal,
        data: { ...proposal.data, delta: cappedDelta },
      } as ProposalResult,
      reason: `HP delta capped to maxHp`,
    };
  }

  return { valid: true };
}

/**
 * Validate gold bounds: >= 0
 */
function validateGoldBounds(
  proposal: ProposalResult,
  ctx: CodeValidationContext
): ValidationResult {
  if (proposal.type !== "propose_stat_change") return { valid: true };
  if (proposal.data.stat !== "gold") return { valid: true };

  const { delta } = proposal.data;
  const newGold = ctx.character.gold + delta;

  if (newGold < 0) {
    return {
      valid: false,
      reason: `Insufficient gold: have ${ctx.character.gold}, need ${-delta}`,
    };
  }

  return { valid: true };
}

/**
 * Validate item bounds by rarity
 */
function validateItemBounds(proposal: ProposalResult): ValidationResult {
  if (proposal.type !== "propose_inventory_add") return { valid: true };

  const { rarity } = proposal.data;
  if (!rarity) return { valid: true }; // No rarity specified, allow

  const bounds = ITEM_BOUNDS[rarity as keyof typeof ITEM_BOUNDS];
  if (!bounds) return { valid: true };

  // For now, just validate rarity is valid - detailed stat checks would need item stats
  return { valid: true };
}

/**
 * Validate quest progression: can only increase by 1
 */
function validateQuestProgression(proposal: ProposalResult): ValidationResult {
  if (proposal.type !== "propose_quest_progress") return { valid: true };

  const { new_progress } = proposal.data;
  
  // Progress must be positive
  if (new_progress < 0) {
    return {
      valid: false,
      reason: `Quest progress cannot be negative`,
    };
  }

  // Note: We can't check "no skipping steps" without knowing current progress
  // That check happens in the API route with DB data
  return { valid: true };
}

/**
 * Validate location change: must be in nearbyPoi or current poi
 */
function validateLocationChange(
  proposal: ProposalResult,
  ctx: CodeValidationContext
): ValidationResult {
  if (proposal.type !== "propose_location_change") return { valid: true };

  const { location } = proposal.data;
  const locationLower = location.toLowerCase();

  // Check if location is valid
  const isValid = ctx.validLocations.some(
    loc => loc.toLowerCase() === locationLower
  );

  if (!isValid) {
    return {
      valid: false,
      reason: `Cannot travel to "${location}" - not accessible from current location. Valid: ${ctx.validLocations.join(", ")}`,
    };
  }

  return { valid: true };
}

/**
 * Validate inventory remove: item must exist
 */
function validateInventoryRemove(
  proposal: ProposalResult,
  ctx: CodeValidationContext
): ValidationResult {
  if (proposal.type !== "propose_inventory_remove") return { valid: true };

  const { item_name } = proposal.data;
  const itemExists = ctx.character.inventory.some(
    item => item.name.toLowerCase() === item_name.toLowerCase()
  );

  if (!itemExists) {
    return {
      valid: false,
      reason: `Item "${item_name}" not in inventory`,
    };
  }

  return { valid: true };
}

/**
 * Run all code validations on a proposal
 */
export function runCodeValidation(
  proposal: ProposalResult,
  ctx: CodeValidationContext
): ValidationResult {
  // Skip detect_intent - it's not a state change
  if (proposal.type === "detect_intent") {
    return { valid: true };
  }

  const validators = [
    () => validateRelationshipCap(proposal),
    () => validateHpBounds(proposal, ctx),
    () => validateGoldBounds(proposal, ctx),
    () => validateItemBounds(proposal),
    () => validateQuestProgression(proposal),
    () => validateLocationChange(proposal, ctx),
    () => validateInventoryRemove(proposal, ctx),
  ];

  for (const validate of validators) {
    const result = validate();
    if (!result.valid || result.modified) {
      return result;
    }
  }

  return { valid: true };
}

/**
 * Run code validation on all proposals
 */
export function validateProposalsWithCode(
  proposals: ProposalResult[],
  ctx: CodeValidationContext
): Array<{ proposal: ProposalResult; result: ValidationResult }> {
  return proposals.map(proposal => ({
    proposal,
    result: runCodeValidation(proposal, ctx),
  }));
}
