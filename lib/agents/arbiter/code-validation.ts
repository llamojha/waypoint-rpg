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
  activeQuestIds?: string[];
  availableQuestIds?: string[];
}

/**
 * Validate relationship change: NPC must be present, ±2 per turn max
 */
function validateRelationshipChange(
  proposal: ProposalResult,
  ctx: CodeValidationContext
): ValidationResult {
  if (proposal.type !== "propose_relationship_change") {
    return { valid: true };
  }

  const { npc, delta } = proposal.data;
  
  // NPC must be present at current location (flexible matching for partial names)
  const npcsPresent = ctx.world.entities || [];
  const npcLower = npc.toLowerCase();
  const npcPresent = npcsPresent.some(
    e => e.toLowerCase().includes(npcLower) || npcLower.includes(e.toLowerCase())
  );
  
  if (!npcPresent) {
    return {
      valid: false,
      reason: `Cannot change relationship with "${npc}" - not present at current location`,
    };
  }
  
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
 * Validate quest start: quest must be in available quests from NPC
 */
function validateQuestStart(
  proposal: ProposalResult,
  ctx: CodeValidationContext
): ValidationResult {
  if (proposal.type !== "propose_quest_start") return { valid: true };

  const { quest_id, quest_title } = proposal.data;

  // Must have available quests to start one
  if (!ctx.availableQuestIds || ctx.availableQuestIds.length === 0) {
    return {
      valid: false,
      reason: `No quests available from NPCs at this location`,
    };
  }

  // Quest must be in available list (check by ID or title)
  const questIdLower = (quest_id || "").toLowerCase();
  const questTitleLower = (quest_title || "").toLowerCase();
  
  const isAvailable = ctx.availableQuestIds.some(
    id => id.toLowerCase() === questIdLower || id.toLowerCase() === questTitleLower
  );

  if (!isAvailable) {
    return {
      valid: false,
      reason: `Quest "${quest_title || quest_id}" is not available from NPCs here`,
    };
  }

  return { valid: true };
}

/**
 * Validate quest progression: quest must exist and progress must be valid
 */
function validateQuestProgression(
  proposal: ProposalResult,
  ctx: CodeValidationContext
): ValidationResult {
  if (proposal.type !== "propose_quest_progress") return { valid: true };

  const { quest_id, new_progress } = proposal.data;
  
  // Progress must be positive
  if (new_progress < 0) {
    return {
      valid: false,
      reason: `Quest progress cannot be negative`,
    };
  }

  // Quest must exist in active quests
  if (ctx.activeQuestIds && ctx.activeQuestIds.length > 0) {
    const questExists = ctx.activeQuestIds.some(
      id => id.toLowerCase() === (quest_id || "").toLowerCase()
    );
    if (!questExists) {
      return {
        valid: false,
        reason: `Quest "${quest_id}" is not active`,
      };
    }
  } else {
    // No active quests at all
    return {
      valid: false,
      reason: `No active quests - cannot progress "${quest_id}"`,
    };
  }

  return { valid: true };
}

/**
 * Validate location change: only allow travel to known POIs from nearbyPoi list
 * No invented sub-locations allowed
 */
function validateLocationChange(
  proposal: ProposalResult,
  ctx: CodeValidationContext
): ValidationResult {
  if (proposal.type !== "propose_location_change") return { valid: true };

  const { location } = proposal.data;
  const locationLower = location.toLowerCase();
  const currentPoiLower = ctx.world.poi.toLowerCase();

  // Reject if trying to move to current location (no-op)
  if (locationLower === currentPoiLower) {
    return {
      valid: false,
      reason: `Already at "${location}"`,
    };
  }

  // Location must be in valid list (nearbyPoi or current poi)
  const isKnownPoi = ctx.validLocations.some(
    loc => loc.toLowerCase() === locationLower
  );

  if (!isKnownPoi) {
    return {
      valid: false,
      reason: `"${location}" is not a known location. Valid: ${ctx.validLocations.join(", ")}`,
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
    () => validateRelationshipChange(proposal, ctx),
    () => validateHpBounds(proposal, ctx),
    () => validateGoldBounds(proposal, ctx),
    () => validateItemBounds(proposal),
    () => validateQuestStart(proposal, ctx),
    () => validateQuestProgression(proposal, ctx),
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
