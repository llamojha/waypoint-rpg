import type { ProposalResult } from "../tools/proposal-tools";
import type { Character, WorldContext } from "@/types";
import { runCodeValidation, CodeValidationContext } from "./code-validation";

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
  activeQuestIds?: string[];
  activeQuestTitles?: string[];
  availableQuestIds?: string[];
  availableQuestTitles?: string[];
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

  const codeCtx: CodeValidationContext = {
    character: ctx.character,
    world: ctx.world,
    validLocations: [ctx.world.poi, ...(ctx.world.nearbyPoi || [])],
    activeQuestIds: ctx.activeQuestIds,
    activeQuestTitles: ctx.activeQuestTitles,
    availableQuestIds: ctx.availableQuestIds,
    availableQuestTitles: ctx.availableQuestTitles,
    playerAction: ctx.playerAction,
  };

  for (const proposal of uniqueProposals) {
    // Always pass detect_intent through
    if (proposal.type === "detect_intent") {
      results.push({ proposal, approved: true, reason: "Intent detection always approved" });
      approved.push(proposal);
      continue;
    }

    const codeResult = runCodeValidation(proposal, codeCtx);

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
          return { type: "location_change", location: p.data.location, reason: p.data.reason };
        default: {
          const unknownProposal = p as { type: string; data: Record<string, unknown> };
          return { type: "unknown", ...unknownProposal.data };
        }
      }
    });
}
