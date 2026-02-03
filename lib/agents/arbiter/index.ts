import type { ProposalResult } from "../tools/proposal-tools";
import type { Character, WorldContext } from "@/types";
import { runCodeValidation, CodeValidationContext } from "./code-validation";
import type { QuestGoalType } from "@/lib/rules/types";
import type { ActionType } from "@/lib/agents/rune-marshal";
import { getLocationConnectionRules } from "@/lib/rules/cache";

export interface ArbiterResult {
  proposal: ProposalResult;
  approved: boolean;
  reason: string;
  modified?: ProposalResult;
}

export interface ArbiterOutput {
  results: ArbiterResult[];
  approved: ProposalResult[];
  rejected: Array<{ proposal: ProposalResult; reason: string }>;
}

export interface ArbiterContext {
  character: Character;
  world: WorldContext;
  playerAction: string;
  rollOutcome?: {
    skill: string;
    success: boolean;
    total: number;
    dc: number;
  };
  actionTypes?: ActionType[];
  activeQuestIds?: string[];
  activeQuestTitles?: string[];
  activeQuestGoals?: Array<{ id: string; title: string; goalType: QuestGoalType; currentGoal: string }>;
  availableQuestIds?: string[];
  availableQuestTitles?: string[];
}

/**
 * Check if a proposal should be blocked due to failed roll
 * Failed rolls block "positive outcomes" for the action type
 */
function isBlockedByFailedRoll(
  proposal: ProposalResult,
  rollOutcome: ArbiterContext["rollOutcome"],
  actionTypes?: ActionType[]
): string | null {
  // No roll or roll succeeded - don't block
  if (!rollOutcome || rollOutcome.success) return null;

  // Roll failed - check if this proposal type should be blocked
  // Use first action type for blocking logic
  const actionType = actionTypes?.[0];
  switch (proposal.type) {
    case "propose_inventory_add":
      // Block finding items on failed search/object manipulation
      if (actionType === "object") {
        return "Failed skill check - cannot find items";
      }
      // Block loot on failed combat (you didn't defeat the enemy)
      if (actionType === "combat") {
        return "Failed combat - no loot";
      }
      break;

    case "propose_relationship_change":
      // Block positive relationship changes on failed social
      if (actionType === "social" && proposal.data.delta > 0) {
        return "Failed social check - relationship cannot improve";
      }
      break;

    case "propose_quest_progress":
      // Block quest progress on failure (you didn't accomplish the goal)
      return "Failed skill check - quest cannot progress";

    // These are allowed even on failure (but validated for context):
    // - stat_change (damage validated by validateHpLossContext)
    // - inventory_remove (validated by validateInventoryRemoveContext)
    // - location_change (you can still move even if you failed something)
    // - quest_start (starting a quest doesn't require success)
    // - npc_discovered (meeting someone doesn't require success)
  }

  return null;
}

/** Generate a unique key for a proposal to detect duplicates */
function getProposalKey(p: ProposalResult): string {
  const type = p.type;
  switch (type) {
    case "propose_stat_change":
      return `stat:${p.data.stat}`;
    case "propose_inventory_add":
      return `inv_add:${p.data.item_name}`;
    case "propose_inventory_remove":
      return `inv_rm:${p.data.item_name}`;
    case "propose_relationship_change":
      return `rel:${p.data.npc}`;
    case "propose_location_change":
      return `loc:${p.data.location}`;
    case "propose_quest_start":
      return `quest_start:${p.data.quest_id || p.data.quest_title}`;
    case "propose_quest_progress":
      return `quest_prog:${p.data.quest_id}`;
    case "propose_npc_discovered":
      return `npc:${p.data.name}`;
    case "detect_intent":
      return "intent";
    default:
      return `unknown:${JSON.stringify(p)}`;
  }
}

/**
 * Run the Arbiter - pure code validation only
 */
export async function runArbiter(
  proposals: ProposalResult[],
  ctx: ArbiterContext
): Promise<ArbiterOutput> {
  const results: ArbiterResult[] = [];
  const approved: ProposalResult[] = [];
  const rejected: Array<{ proposal: ProposalResult; reason: string }> = [];

  // Deduplicate proposals
  const seen = new Set<string>();
  const uniqueProposals = proposals.filter(p => {
    const key = getProposalKey(p);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Fetch valid destinations from connections table (more reliable than nearbyPoi)
  const connections = await getLocationConnectionRules();
  const validDestinations = connections
    .filter(c => c.fromLocation === ctx.world.poi)
    .map(c => c.toLocation);
  
  // Combine with nearbyPoi as fallback, plus current location
  const validLocations = [
    ctx.world.poi,
    ...validDestinations,
    ...(ctx.world.nearbyPoi || []),
  ].filter((v, i, a) => a.indexOf(v) === i); // dedupe

  const codeCtx: CodeValidationContext = {
    character: ctx.character,
    world: ctx.world,
    validLocations,
    activeQuestIds: ctx.activeQuestIds,
    activeQuestTitles: ctx.activeQuestTitles,
    activeQuestGoals: ctx.activeQuestGoals,
    availableQuestIds: ctx.availableQuestIds,
    availableQuestTitles: ctx.availableQuestTitles,
    playerAction: ctx.playerAction,
    otherProposals: uniqueProposals, // Pass all proposals for cross-validation
  };

  for (const proposal of uniqueProposals) {
    // Always pass detect_intent through
    if (proposal.type === "detect_intent") {
      results.push({ proposal, approved: true, reason: "Intent detection always approved" });
      approved.push(proposal);
      continue;
    }

    // Check if blocked by failed roll FIRST
    const failedRollReason = isBlockedByFailedRoll(proposal, ctx.rollOutcome, ctx.actionTypes);
    if (failedRollReason) {
      results.push({ proposal, approved: false, reason: failedRollReason });
      rejected.push({ proposal, reason: failedRollReason });
      continue;
    }

    const codeResult = await runCodeValidation(proposal, codeCtx);

    if (!codeResult.valid) {
      results.push({ proposal, approved: false, reason: codeResult.reason || "Failed validation" });
      rejected.push({ proposal, reason: codeResult.reason || "Failed validation" });
    } else if (codeResult.modified) {
      results.push({ proposal: codeResult.modified, approved: true, reason: codeResult.reason || "Modified and approved", modified: codeResult.modified });
      approved.push(codeResult.modified);
    } else {
      results.push({ proposal, approved: true, reason: "Approved" });
      approved.push(proposal);
    }
  }

  return { results, approved, rejected };
}

/**
 * Convert approved proposals to the event format expected by applyEvents
 */
export function proposalsToEvents(proposals: ProposalResult[]): Array<{
  type: string;
  [key: string]: unknown;
}> {
  return proposals
    .filter(p => p.type !== "detect_intent")
    .map(p => {
      switch (p.type) {
        case "propose_stat_change":
          return { type: "stat_change", stat: p.data.stat, delta: p.data.delta, reason: p.data.reason };
        case "propose_inventory_add":
          return { type: "inventory_add", item: { name: p.data.item_name, type: p.data.item_type, description: p.data.description || "" }, reason: p.data.reason };
        case "propose_inventory_remove":
          return { type: "inventory_remove", itemName: p.data.item_name, reason: p.data.reason };
        case "propose_relationship_change":
          return { type: "relationship_change", npc: p.data.npc, delta: p.data.delta, reason: p.data.reason };
        case "propose_quest_progress":
          return { type: "quest_progress", questId: p.data.quest_id, progress: p.data.new_progress, reason: p.data.reason };
        case "propose_quest_start":
          return { type: "quest_start", questId: p.data.quest_id, questTitle: p.data.quest_title, reason: p.data.reason };
        case "propose_npc_discovered":
          return { type: "relationship_change", npc: p.data.name, delta: 0, reason: `Met ${p.data.name} (${p.data.role}) at ${p.data.location}` };
        case "propose_location_change":
          return { 
            type: "location_change", 
            location: p.data.location, 
            reason: p.data.reason,
            path: p.data.path,
            totalTravelTime: p.data.totalTravelTime,
          };
        case "propose_combat_damage":
          return { type: "combat_damage", target: p.data.target, damage: p.data.damage, reason: p.data.reason };
        case "propose_combat_start":
          return { type: "combat_start", enemies: p.data.enemies, reason: p.data.reason };
        default: {
          const unknownProposal = p as unknown as { type: string; data: Record<string, unknown> };
          return { type: "unknown", ...unknownProposal.data };
        }
      }
    });
}
