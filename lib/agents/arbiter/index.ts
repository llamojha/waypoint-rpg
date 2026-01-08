import type { ProposalResult } from "../tools/proposal-tools";
import type { Character, WorldContext } from "@/types";
import { runCodeValidation, CodeValidationContext } from "./code-validation";
import { runLLMValidation, LLMValidationContext } from "./llm-validation";

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
 * Run the full Arbiter pipeline: code validation → LLM validation
 */
export async function runArbiter(
  proposals: ProposalResult[],
  ctx: ArbiterContext
): Promise<ArbiterOutput> {
  const results: ArbiterResult[] = [];
  const approved: ProposalResult[] = [];
  const rejected: Array<{ proposal: ProposalResult; reason: string }> = [];

  // Deduplicate proposals (same type + same key data)
  const seen = new Set<string>();
  const uniqueProposals = proposals.filter(p => {
    const key = getProposalKey(p);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Build validation contexts
  const codeCtx: CodeValidationContext = {
    character: ctx.character,
    world: ctx.world,
    validLocations: [ctx.world.poi, ...(ctx.world.nearbyPoi || [])],
  };

  const llmCtx: LLMValidationContext = {
    character: ctx.character,
    world: ctx.world,
    playerAction: ctx.playerAction,
    rollOutcome: ctx.rollOutcome,
  };

  // Step 1: Code validation for all proposals
  const codeValidated: Array<{ proposal: ProposalResult; passedCode: boolean; reason?: string }> = [];
  
  for (const proposal of uniqueProposals) {
    // Always pass detect_intent through
    if (proposal.type === "detect_intent") {
      codeValidated.push({ proposal, passedCode: true });
      continue;
    }

    const codeResult = runCodeValidation(proposal, codeCtx);
    
    if (!codeResult.valid) {
      // Code validation failed - reject immediately
      results.push({
        proposal,
        approved: false,
        reason: codeResult.reason || "Failed code validation",
      });
      rejected.push({ proposal, reason: codeResult.reason || "Failed code validation" });
    } else if (codeResult.modified) {
      // Code validation modified the proposal
      codeValidated.push({ 
        proposal: codeResult.modified, 
        passedCode: true,
        reason: codeResult.reason,
      });
    } else {
      // Code validation passed
      codeValidated.push({ proposal, passedCode: true });
    }
  }

  // Step 2: LLM validation for proposals that passed code validation
  const proposalsForLLM = codeValidated
    .filter(v => v.passedCode && v.proposal.type !== "detect_intent")
    .map(v => v.proposal);

  let llmResults: Array<{ eventIndex: number; approved: boolean; reason: string }> = [];
  
  if (proposalsForLLM.length > 0) {
    llmResults = await runLLMValidation(proposalsForLLM, llmCtx);
  }

  // Step 3: Combine results
  let llmIndex = 0;
  for (const validated of codeValidated) {
    if (validated.proposal.type === "detect_intent") {
      // Always approve detect_intent
      results.push({
        proposal: validated.proposal,
        approved: true,
        reason: "Intent detection always approved",
      });
      approved.push(validated.proposal);
      continue;
    }

    // Find LLM result for this proposal
    const llmResult = llmResults.find(r => r.eventIndex === llmIndex);
    llmIndex++;

    if (llmResult && !llmResult.approved) {
      // LLM rejected
      results.push({
        proposal: validated.proposal,
        approved: false,
        reason: llmResult.reason,
      });
      rejected.push({ proposal: validated.proposal, reason: llmResult.reason });
    } else {
      // Approved (either by LLM or default)
      const reason = validated.reason 
        ? `${validated.reason}; ${llmResult?.reason || "LLM approved"}`
        : llmResult?.reason || "Approved";
      
      results.push({
        proposal: validated.proposal,
        approved: true,
        reason,
        modified: validated.reason ? validated.proposal : undefined,
      });
      approved.push(validated.proposal);
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
          return {
            type: "stat_change",
            stat: p.data.stat,
            delta: p.data.delta,
            reason: p.data.reason,
          };
        case "propose_inventory_add":
          return {
            type: "inventory_add",
            item: {
              name: p.data.item_name,
              type: p.data.item_type,
              description: p.data.description || "",
            },
            reason: p.data.reason,
          };
        case "propose_inventory_remove":
          return {
            type: "inventory_remove",
            itemName: p.data.item_name,
            reason: p.data.reason,
          };
        case "propose_relationship_change":
          return {
            type: "relationship_change",
            npc: p.data.npc,
            delta: p.data.delta,
            reason: p.data.reason,
          };
        case "propose_quest_progress":
          return {
            type: "quest_progress",
            questId: p.data.quest_id,
            progress: p.data.new_progress,
            reason: p.data.reason,
          };
        case "propose_quest_start":
          return {
            type: "quest_start",
            questId: p.data.quest_id,
            questTitle: p.data.quest_title,
            reason: p.data.reason,
          };
        case "propose_npc_discovered":
          return {
            type: "relationship_change",
            npc: p.data.name,
            delta: 0,
            reason: `Met ${p.data.name} (${p.data.role}) at ${p.data.location}`,
          };
        case "propose_location_change":
          return {
            type: "location_change",
            location: p.data.location,
            reason: p.data.reason,
          };
        default: {
          // Handle any unknown proposal types
          const unknownProposal = p as { type: string; data: Record<string, unknown> };
          return { type: "unknown", ...unknownProposal.data };
        }
      }
    });
}
