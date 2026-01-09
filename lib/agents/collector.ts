/**
 * Collector - Coordinates parallel agent outputs and Apply State results
 * 
 * Flow:
 * 1. First pass: Gather outputs from Arbiter + Lorekeeper (parallel)
 * 2. Second pass: After Apply State, merge in consequences for Chronicler
 */

import type { ArbiterOutput } from "./arbiter";
import type { LorekeeperOutput } from "./lorekeeper";
import type { ApplyEventsResult, Consequence } from "@/lib/turn/apply";
import type { CodexEntry } from "@/types";
import type { NPCPresent, LocationDetails, NpcVoice, Atmosphere } from "./lorekeeper/handlers";

/**
 * First pass: Collected context from parallel agents
 */
export interface CollectedContext {
  arbiter: ArbiterOutput;
  lore: LorekeeperOutput;
}

/**
 * Second pass: Full context for Chronicler (after Apply State)
 */
export interface ChroniclerContext {
  /** Approved events from Arbiter */
  approvedEvents: ArbiterOutput["approved"];
  /** NPCs present at current location */
  npcsPresent: NPCPresent[];
  /** Current location details */
  locationDetails: LocationDetails | null;
  /** Relevant codex snippets */
  codexSnippets: CodexEntry[];
  /** NPC voice data for dialogue */
  npcVoices: NpcVoice[];
  /** Scene atmosphere */
  atmosphere: Atmosphere | null;
  /** Consequences from Apply State (NPC died, quest completed, etc.) */
  consequences: Consequence[];
  /** Final character state after Apply */
  finalCharacterState: ApplyEventsResult["characterUpdates"];
  /** Final world state after Apply */
  finalWorldState: ApplyEventsResult["worldUpdates"];
}

/**
 * First pass: Merge parallel agent outputs
 */
export function collectParallelOutputs(
  arbiterResult: ArbiterOutput,
  lorekeeperResult: LorekeeperOutput
): CollectedContext {
  return {
    arbiter: arbiterResult,
    lore: lorekeeperResult,
  };
}

/**
 * Second pass: Merge Apply State results into Chronicler context
 */
export function buildChroniclerContext(
  collected: CollectedContext,
  applyResult: ApplyEventsResult
): ChroniclerContext {
  return {
    approvedEvents: collected.arbiter.approved,
    npcsPresent: collected.lore.npcsPresent,
    locationDetails: collected.lore.locationDetails,
    codexSnippets: collected.lore.codexSnippets,
    npcVoices: collected.lore.npcVoices,
    atmosphere: collected.lore.atmosphere,
    consequences: applyResult.consequences,
    finalCharacterState: applyResult.characterUpdates,
    finalWorldState: applyResult.worldUpdates,
  };
}
