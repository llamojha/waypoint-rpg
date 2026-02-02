import type { Character, WorldContext } from "@/types";
import type { ProposalResult } from "../tools/proposal-tools";
import { ITEM_BOUNDS, GOLD_BOUNDS } from "@/constants";
import type { QuestGoalType } from "@/lib/rules/types";
import { findPath } from "@/lib/rules/locations";

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
 * reject for purely conversational actions, reject negative changes for polite actions
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
  
  const actionLower = (ctx.playerAction || "").toLowerCase().trim();
  const npcLower = npc.toLowerCase();
  
  // Reject relationship changes for NPCs only mentioned in future intent (not actual interaction)
  // e.g., "I'll go talk to Helga" - Helga is mentioned but not interacted with
  const futureIntentPhrases = [
    "i'll go talk to", "i'll talk to", "i will talk to", "i'll go speak to",
    "i'm going to talk to", "going to talk to", "going to speak to",
    "i want to talk to", "i need to talk to", "i'll go see", "i'll visit",
    "heading to talk to", "walking to talk to",
  ];
  
  // Check if action contains future intent phrase followed by this NPC
  const isFutureIntent = futureIntentPhrases.some(phrase => {
    const phraseIndex = actionLower.indexOf(phrase);
    if (phraseIndex === -1) return false;
    // Check if NPC name appears after the phrase
    const afterPhrase = actionLower.slice(phraseIndex + phrase.length);
    return afterPhrase.includes(npcLower);
  });
  
  // Check if there's actual present interaction with this NPC (direct address or action)
  const presentInteractionPhrases = [
    `hi ${npcLower}`, `hello ${npcLower}`, `hey ${npcLower}`,
    `thank you ${npcLower}`, `thanks ${npcLower}`,
    `${npcLower},`, // Direct address with comma
  ];
  const hasPresentInteraction = presentInteractionPhrases.some(p => actionLower.includes(p)) ||
    // Also check for "talk to X" without future tense
    (actionLower.includes(`talk to ${npcLower}`) && !isFutureIntent);
  
  if (isFutureIntent && !hasPresentInteraction) {
    return {
      valid: false,
      reason: `Relationship change rejected - "${npc}" only mentioned as future intent, not actual interaction`,
    };
  }
  
  // Reject NEGATIVE relationship changes for polite/neutral actions
  if (delta < 0) {
    const politePatterns = [
      /\bthank(s| you)\b/,                        // "thank you", "thanks"
      /\bgoodbye\b|\bbye\b|\bfarewell\b/,         // farewells
      /\bsee you\b|\btake care\b/,                // polite departures
      /\bi('ll| will) (go|talk|speak|head|leave)/, // stating intent to leave/talk elsewhere
      /\bnice (to |meeting |talking )/,           // "nice to meet you"
      /\bpleasure\b/,                             // "pleasure meeting you"
    ];
    
    const hostilePatterns = [
      /\binsult\b|\brude\b|\bdismiss\b|\bignore\b/,
      /\battack\b|\bhit\b|\bpunch\b|\bkick\b/,
      /\bthreaten\b|\bintimidate\b|\bscare\b/,
      /\bsteal\b|\brob\b|\btake from\b/,
      /\blie\b|\bdeceive\b|\btrick\b/,
      /\bmock\b|\bridicule\b|\blaugh at\b/,
      /\bshout\b|\byell\b|\bscream at\b/,
      /\brefuse\b|\breject\b|\bdeny\b/,
    ];
    
    const isPolite = politePatterns.some(p => p.test(actionLower));
    const isHostile = hostilePatterns.some(p => p.test(actionLower));
    
    // If action is polite and NOT hostile, reject negative delta
    if (isPolite && !isHostile) {
      return {
        valid: false,
        reason: `Negative relationship rejected - "${ctx.playerAction?.slice(0, 40)}" is polite, not hostile`,
      };
    }
  }
  
  // Reject relationship changes for purely conversational/question actions
  const conversationalPatterns = [
    /^what (should|do|can|shall) (we|i|you)/,  // "what should we do"
    /^what('s| is) (next|happening|going on)/,  // "what's next"
    /^(good )?(morning|afternoon|evening)/,     // time-based greetings (without NPC name)
    /\?$/,                                       // ends with question mark (simple questions)
  ];
  
  // Greetings that directly address the NPC are meaningful interactions
  const isDirectGreeting = /^(hi|hello|hey|greetings),?\s+\w/i.test(actionLower) && 
    actionLower.includes(npcLower);
  
  // Only reject questions that don't involve meaningful interaction keywords
  const meaningfulKeywords = [
    "help", "give", "offer", "share", "tell secret", "insult", "attack",
    "thank", "apologize", "compliment", "gift", "trade", "buy", "sell",
    "threaten", "intimidate", "persuade", "convince", "flirt", "comfort"
  ];
  
  const isConversational = conversationalPatterns.some(p => p.test(actionLower));
  const hasMeaningfulInteraction = meaningfulKeywords.some(k => actionLower.includes(k)) || isDirectGreeting;
  
  if (isConversational && !hasMeaningfulInteraction) {
    return {
      valid: false,
      reason: `Relationship change rejected - "${ctx.playerAction?.slice(0, 30)}" is conversational, not meaningful interaction`,
    };
  }
  
  // NPC must be present at current location (flexible matching for partial names)
  const npcsPresent = ctx.world.entities || [];
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
 * Validate gold gains against economy bounds and context
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
  const actionLower = (ctx.playerAction || "").toLowerCase();

  // Check if player is just CLAIMING to find gold (not a valid source)
  const claimKeywords = [
    "i found", "i have", "i got", "i picked up", "there is", "there's a",
    "i see a", "i grab", "i take the",
  ];
  const isPlayerClaim = claimKeywords.some(kw => actionLower.includes(kw));

  // Valid sources for gold gain
  const validSourceKeywords = [
    // Combat/loot (requires defeated enemy or container in scene)
    "loot", "defeat", "kill", "combat", "slay", "victor", "enemy", "monster",
    // Quest rewards
    "quest", "reward", "complet", "finish", "bounty",
    // NPC giving gold
    "gift", "give", "paid", "payment", "tip", "thank", "hire",
    // Commerce
    "sell", "sold", "trade", "merchant", "shop",
  ];
  const hasValidSource = validSourceKeywords.some(kw => reasonLower.includes(kw));

  // If player just claims to find gold without valid source, reject
  if (isPlayerClaim && !hasValidSource) {
    return {
      valid: false,
      reason: `Gold gain rejected: player cannot declare finding gold - must come from valid source (combat, quest, NPC, commerce)`,
    };
  }
  
  // Determine source type from reason keywords for cap
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
 * Validate inventory add context: player cannot just claim items exist
 */
function validateInventoryAddContext(
  proposal: ProposalResult,
  ctx: CodeValidationContext
): ValidationResult {
  if (proposal.type !== "propose_inventory_add") return { valid: true };

  const { reason } = proposal.data;
  const reasonLower = (reason || "").toLowerCase();
  const actionLower = (ctx.playerAction || "").toLowerCase();

  // Check if player is just CLAIMING to have/find an item
  const claimKeywords = [
    "i found", "i have", "i got", "i picked up", "there is", "there's a",
    "i see a", "i grab the", "i take the", "lying here", "on the ground",
  ];
  const isPlayerClaim = claimKeywords.some(kw => actionLower.includes(kw));

  // Valid sources for item gain
  const validSourceKeywords = [
    // Combat/loot
    "loot", "defeat", "kill", "combat", "slay", "drop", "enemy", "body",
    // Quest rewards
    "quest", "reward", "complet",
    // NPC giving item
    "gift", "give", "gave", "offer", "hand",
    // Commerce
    "buy", "bought", "purchase", "merchant", "shop",
    // Crafting
    "craft", "make", "create",
  ];
  const hasValidSource = validSourceKeywords.some(kw => reasonLower.includes(kw));

  // If player just claims to find/have item without valid source, reject
  if (isPlayerClaim && !hasValidSource) {
    return {
      valid: false,
      reason: `Item gain rejected: player cannot declare finding items - must come from valid source (loot, quest, NPC, purchase)`,
    };
  }

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
 * Validate location change: allow travel to any reachable location via pathfinding
 * If destination is not directly adjacent, find path and modify proposal to include route
 */
async function validateLocationChange(
  proposal: ProposalResult,
  ctx: CodeValidationContext
): Promise<ValidationResult> {
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

  // Check if directly adjacent (in validLocations)
  const isDirectlyReachable = ctx.validLocations.some(
    loc => loc.toLowerCase() === locationLower
  );

  if (isDirectlyReachable) {
    return { valid: true };
  }

  // Not directly reachable - try pathfinding
  const pathResult = await findPath(
    ctx.world.poi,
    location,
    { inventory: ctx.character.inventory, questsCompleted: [] }
  );

  if (!pathResult.found) {
    return {
      valid: false,
      reason: `"${location}" is not reachable from "${ctx.world.poi}". Valid nearby: ${ctx.validLocations.join(", ")}`,
    };
  }

  // Path found! Modify proposal to include the full path
  return {
    valid: true,
    modified: {
      ...proposal,
      data: {
        ...proposal.data,
        path: pathResult.path,
        totalTravelTime: pathResult.totalTravelTime,
      },
    },
  };
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
 * Validate inventory remove context: item loss must make sense for the action
 * Rejects item loss for search/observation actions where losing items is illogical
 */
function validateInventoryRemoveContext(
  proposal: ProposalResult,
  ctx: CodeValidationContext
): ValidationResult {
  if (proposal.type !== "propose_inventory_remove") return { valid: true };

  const { item_name, reason } = proposal.data;
  const reasonLower = (reason || "").toLowerCase();
  const actionLower = (ctx.playerAction || "").toLowerCase();

  // Keywords indicating actions where item loss makes sense
  const itemLossKeywords = [
    // Intentional use/consumption
    "use", "consume", "eat", "drink", "apply", "throw", "give", "trade", "sell",
    "sacrifice", "offer", "drop", "discard", "abandon",
    // Physical actions that could cause loss
    "jump", "climb", "fall", "swim", "dive", "run", "flee", "escape",
    // Combat/danger
    "attack", "fight", "combat", "battle", "defend",
    // Crafting/modification
    "craft", "combine", "modify", "upgrade", "repair", "break",
  ];

  // Keywords indicating search/observation (item loss doesn't make sense)
  const searchKeywords = [
    "search", "look", "examine", "inspect", "observe", "scan", "check",
    "rummage", "forage", "scavenge", "investigate", "explore",
  ];

  const isSearchAction = searchKeywords.some(kw => actionLower.includes(kw));
  const hasItemLossContext = itemLossKeywords.some(
    kw => reasonLower.includes(kw) || actionLower.includes(kw)
  );

  // If it's a search action and there's no valid reason for item loss, reject
  if (isSearchAction && !hasItemLossContext) {
    return {
      valid: false,
      reason: `Item loss rejected: "${item_name}" cannot be lost from searching`,
    };
  }

  return { valid: true };
}

/**
 * Run all code validations on a proposal
 */
export async function runCodeValidation(
  proposal: ProposalResult,
  ctx: CodeValidationContext
): Promise<ValidationResult> {
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
    () => validateInventoryAddContext(proposal, ctx),
    () => validateQuestStart(proposal, ctx),
    () => validateQuestProgression(proposal, ctx),
    () => validateInventoryRemove(proposal, ctx),
    () => validateInventoryRemoveContext(proposal, ctx),
  ];

  for (const validate of validators) {
    const result = validate();
    if (!result.valid || result.modified) {
      return result;
    }
  }

  // Async validators (pathfinding)
  const locationResult = await validateLocationChange(proposal, ctx);
  if (!locationResult.valid || locationResult.modified) {
    return locationResult;
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
export async function validateProposalsWithCode(
  proposals: ProposalResult[],
  ctx: CodeValidationContext
): Promise<Array<{ proposal: ProposalResult; result: ValidationResult }>> {
  // First check for conflicting proposals (e.g., multiple location changes)
  const conflictResults = validateNoConflictingProposals(proposals);
  
  // Then run individual validation on proposals that passed conflict check
  const results: Array<{ proposal: ProposalResult; result: ValidationResult }> = [];
  
  for (const { proposal, result } of conflictResults) {
    // If already rejected by conflict check, keep that result
    if (!result.valid) {
      results.push({ proposal, result });
    } else {
      // Otherwise run individual validation
      results.push({
        proposal,
        result: await runCodeValidation(proposal, ctx),
      });
    }
  }
  
  return results;
}
