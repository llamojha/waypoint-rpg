import type { Character, WorldContext } from "@/types";
import type { ProposalResult } from "../tools/proposal-tools";
import { ITEM_BOUNDS, GOLD_BOUNDS } from "@/constants";
import type { QuestGoalType } from "@/lib/rules/types";

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
  activeQuestTitles?: string[];
  activeQuestGoals?: Array<{ id: string; title: string; goalType: QuestGoalType; currentGoal: string }>;
  availableQuestIds?: string[];
  availableQuestTitles?: string[];
  playerAction?: string;
  /** Other proposals in the same turn - used for quest validation */
  otherProposals?: ProposalResult[];
}

/**
 * Validate relationship change: NPC must be present, ±2 per turn max, reject delta=0,
 * reject for purely conversational actions
 */
function validateRelationshipChange(
  proposal: ProposalResult,
  ctx: CodeValidationContext
): ValidationResult {
  if (proposal.type !== "propose_relationship_change") {
    return { valid: true };
  }

  const { npc, delta } = proposal.data;
  
  // Reject no-op changes (delta = 0)
  if (delta === 0) {
    return {
      valid: false,
      reason: `Relationship delta is 0 - no meaningful interaction occurred`,
    };
  }
  
  // Reject relationship changes for purely conversational/question actions
  const actionLower = (ctx.playerAction || "").toLowerCase().trim();
  const conversationalPatterns = [
    /^what (should|do|can|shall) (we|i|you)/,  // "what should we do"
    /^what('s| is) (next|happening|going on)/,  // "what's next"
    /^(hi|hello|hey|greetings)\b/,              // greetings
    /^(good )?(morning|afternoon|evening)/,     // time-based greetings
    /\?$/,                                       // ends with question mark (simple questions)
  ];
  
  // Only reject questions that don't involve meaningful interaction keywords
  const meaningfulKeywords = [
    "help", "give", "offer", "share", "tell secret", "insult", "attack",
    "thank", "apologize", "compliment", "gift", "trade", "buy", "sell",
    "threaten", "intimidate", "persuade", "convince", "flirt", "comfort"
  ];
  
  const isConversational = conversationalPatterns.some(p => p.test(actionLower));
  const hasMeaningfulInteraction = meaningfulKeywords.some(k => actionLower.includes(k));
  
  if (isConversational && !hasMeaningfulInteraction) {
    return {
      valid: false,
      reason: `Relationship change rejected - "${ctx.playerAction?.slice(0, 30)}" is conversational, not meaningful interaction`,
    };
  }
  
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
 * Validate HP bounds: 0 to maxHp, reject delta=0
 */
function validateHpBounds(
  proposal: ProposalResult,
  ctx: CodeValidationContext
): ValidationResult {
  if (proposal.type !== "propose_stat_change") return { valid: true };
  if (proposal.data.stat !== "hp") return { valid: true };

  const { delta } = proposal.data;

  // Reject no-op changes
  if (delta === 0) {
    return { valid: false, reason: "HP delta is 0 - proposal should not be generated for no change" };
  }

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
 * Validate HP loss context: only allow HP loss for physical danger
 * Rejects HP loss for social failures, conversation mishaps, etc.
 */
function validateHpLossContext(
  proposal: ProposalResult,
  ctx: CodeValidationContext
): ValidationResult {
  if (proposal.type !== "propose_stat_change") return { valid: true };
  if (proposal.data.stat !== "hp") return { valid: true };
  
  const { delta, reason } = proposal.data;
  
  // Only validate HP loss (negative delta)
  if (delta >= 0) return { valid: true };
  
  const reasonLower = (reason || "").toLowerCase();
  const actionLower = (ctx.playerAction || "").toLowerCase();
  
  // Keywords indicating physical danger (HP loss allowed)
  const physicalDangerKeywords = [
    // Combat
    "attack", "combat", "fight", "battle", "strike", "hit", "slash", "stab",
    "punch", "kick", "damage", "wound", "injure", "hurt",
    "backstab", "headbutt", "bodyslam", "grapple", "throw", "shove",
    "cleave", "smash", "bash", "pummel", "bludgeon",
    // Traps and hazards
    "trap", "spike", "poison", "acid", "fire", "burn", "fall", "fell",
    "crash", "collapse", "crush", "explosion", "blast",
    // Environmental
    "drown", "suffocate", "freeze", "heat", "cold", "storm",
    // Creatures
    "bite", "claw", "maul", "sting", "venom",
  ];
  
  // Check if reason or action contains physical danger keywords
  const hasPhysicalDanger = physicalDangerKeywords.some(
    keyword => reasonLower.includes(keyword) || actionLower.includes(keyword)
  );
  
  if (!hasPhysicalDanger) {
    return {
      valid: false,
      reason: `HP loss rejected: no physical danger detected in action "${ctx.playerAction?.slice(0, 50)}"`,
    };
  }
  
  return { valid: true };
}

/**
 * Validate gold bounds: >= 0, reject delta=0
 */
function validateGoldBounds(
  proposal: ProposalResult,
  ctx: CodeValidationContext
): ValidationResult {
  if (proposal.type !== "propose_stat_change") return { valid: true };
  if (proposal.data.stat !== "gold") return { valid: true };

  const { delta } = proposal.data;

  // Reject no-op changes
  if (delta === 0) {
    return { valid: false, reason: "Gold delta is 0 - proposal should not be generated for no change" };
  }

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
 * Validate gold gains against economy bounds
 * Only validates positive deltas (gains), losses are handled by validateGoldBounds
 */
function validateGoldGain(
  proposal: ProposalResult,
  ctx: CodeValidationContext
): ValidationResult {
  if (proposal.type !== "propose_stat_change") return { valid: true };
  if (proposal.data.stat !== "gold") return { valid: true };

  const { delta, reason } = proposal.data;
  
  // Only validate gains (positive delta)
  if (delta <= 0) return { valid: true };

  const reasonLower = (reason || "").toLowerCase();
  
  // Determine source type from reason keywords
  let maxGain: number = GOLD_BOUNDS.hard_cap.max;
  
  if (/quest|reward|complet|finish|bounty/.test(reasonLower)) {
    maxGain = GOLD_BOUNDS.quest_reward.max;
  } else if (/loot|defeat|kill|combat|slay|victor|enemy|monster/.test(reasonLower)) {
    maxGain = GOLD_BOUNDS.combat_loot.max;
  } else if (/gift|give|tip|thank|grat|help|donat/.test(reasonLower)) {
    maxGain = GOLD_BOUNDS.npc_gift.max;
  } else if (/found|chest|search|discover|hidden|treasure|stash/.test(reasonLower)) {
    maxGain = GOLD_BOUNDS.found_loot.max;
  }

  if (delta > maxGain) {
    return {
      valid: true,
      modified: {
        ...proposal,
        data: { ...proposal.data, delta: maxGain },
      } as ProposalResult,
      reason: `Gold gain capped from ${delta} to ${maxGain} (source: ${reasonLower.slice(0, 30)})`,
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
  if ((!ctx.availableQuestIds || ctx.availableQuestIds.length === 0) &&
      (!ctx.availableQuestTitles || ctx.availableQuestTitles.length === 0)) {
    return {
      valid: false,
      reason: `No quests available from NPCs at this location`,
    };
  }

  // Quest must be in available list (check by ID or title)
  const questIdLower = (quest_id || "").toLowerCase();
  const questTitleLower = (quest_title || "").toLowerCase();
  
  const isAvailableById = ctx.availableQuestIds?.some(
    id => id.toLowerCase() === questIdLower
  ) || false;
  
  const isAvailableByTitle = ctx.availableQuestTitles?.some(
    title => title.toLowerCase() === questTitleLower
  ) || false;

  if (!isAvailableById && !isAvailableByTitle) {
    return {
      valid: false,
      reason: `Quest "${quest_title || quest_id}" is not available from NPCs here`,
    };
  }

  return { valid: true };
}

/**
 * Validate quest progression: quest must exist, be active, and required events must be present
 * Uses Rules Engine to check if goal requirements are met
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

  // Quest must exist in active quests (check both ID and title)
  const questIdLower = (quest_id || "").toLowerCase();
  
  if (ctx.activeQuestIds && ctx.activeQuestIds.length > 0) {
    const matchesId = ctx.activeQuestIds.some(
      id => id.toLowerCase() === questIdLower
    );
    const matchesTitle = ctx.activeQuestTitles?.some(
      title => title.toLowerCase() === questIdLower
    );
    if (!matchesId && !matchesTitle) {
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

  // Find the quest goal info to validate requirements
  const questGoal = ctx.activeQuestGoals?.find(
    q => q.id.toLowerCase() === questIdLower || q.title.toLowerCase() === questIdLower
  );

  if (questGoal && ctx.otherProposals) {
    // Check if required events are present based on goal type
    const hasRequiredEvent = checkQuestGoalRequirements(
      questGoal.goalType,
      questGoal.currentGoal,
      ctx.otherProposals
    );

    if (!hasRequiredEvent) {
      const requiredEvent = getRequiredEventForGoalType(questGoal.goalType);
      return {
        valid: false,
        reason: `Quest progress requires ${requiredEvent} event matching goal: "${questGoal.currentGoal}"`,
      };
    }
  }

  return { valid: true };
}

/**
 * Check if required events for a quest goal type are present
 */
function checkQuestGoalRequirements(
  goalType: QuestGoalType,
  currentGoal: string,
  proposals: ProposalResult[]
): boolean {
  const goalLower = currentGoal.toLowerCase();

  switch (goalType) {
    case "exploration":
      // Requires location_change to the goal location
      return proposals.some(p => 
        p.type === "propose_location_change" && 
        goalLower.includes(p.data.location?.toLowerCase() || "")
      );

    case "dialogue":
      // Requires relationship_change with the goal NPC
      return proposals.some(p => 
        p.type === "propose_relationship_change" && 
        goalLower.includes(p.data.npc?.toLowerCase() || "")
      );

    case "fetch":
      // Requires inventory_add of the goal item
      return proposals.some(p => 
        p.type === "propose_inventory_add" && 
        goalLower.includes(p.data.item_name?.toLowerCase() || "")
      );

    case "combat":
      // Combat goals are validated by enemy defeat (stat changes with combat reason)
      return proposals.some(p => 
        p.type === "propose_stat_change" && 
        (p.data.reason?.toLowerCase() || "").includes("defeat")
      );

    case "discover":
      // Requires npc_discovered or location_change
      return proposals.some(p => 
        p.type === "propose_npc_discovered" || 
        p.type === "propose_location_change"
      );

    default:
      return true; // Unknown goal type, allow
  }
}

/**
 * Get the required event type description for a goal type
 */
function getRequiredEventForGoalType(goalType: QuestGoalType): string {
  switch (goalType) {
    case "exploration": return "location_change";
    case "dialogue": return "relationship_change";
    case "fetch": return "inventory_add";
    case "combat": return "enemy_defeated";
    case "discover": return "npc_discovered or location_change";
    default: return "unknown";
  }
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
    () => validateHpLossContext(proposal, ctx),
    () => validateGoldBounds(proposal, ctx),
    () => validateGoldGain(proposal, ctx),
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
 * Validate that there are no conflicting proposals (e.g., multiple location changes)
 * Returns the first proposal to keep and rejects the rest
 */
function validateNoConflictingProposals(
  proposals: ProposalResult[]
): Array<{ proposal: ProposalResult; result: ValidationResult }> {
  const results: Array<{ proposal: ProposalResult; result: ValidationResult }> = [];
  
  // Track which types we've seen (for types that can only appear once)
  const seenLocationChange = { seen: false, first: "" };
  
  for (const proposal of proposals) {
    // Only one location change per turn
    if (proposal.type === "propose_location_change") {
      if (seenLocationChange.seen) {
        results.push({
          proposal,
          result: {
            valid: false,
            reason: `Multiple location changes not allowed - already traveling to "${seenLocationChange.first}"`,
          },
        });
        continue;
      }
      seenLocationChange.seen = true;
      seenLocationChange.first = proposal.data.location;
    }
    
    // Proposal passed conflict check, will be validated individually
    results.push({ proposal, result: { valid: true } });
  }
  
  return results;
}

/**
 * Run code validation on all proposals
 */
export function validateProposalsWithCode(
  proposals: ProposalResult[],
  ctx: CodeValidationContext
): Array<{ proposal: ProposalResult; result: ValidationResult }> {
  // First check for conflicting proposals (e.g., multiple location changes)
  const conflictResults = validateNoConflictingProposals(proposals);
  
  // Then run individual validation on proposals that passed conflict check
  return conflictResults.map(({ proposal, result }) => {
    // If already rejected by conflict check, keep that result
    if (!result.valid) {
      return { proposal, result };
    }
    // Otherwise run individual validation
    return {
      proposal,
      result: runCodeValidation(proposal, ctx),
    };
  });
}
