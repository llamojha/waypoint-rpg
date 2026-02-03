/**
 * Consolidated Turn Pipeline
 * 
 * Handles both rolled and non-rolled turns through a single code path.
 * Includes retry loop for Arbiter rejections.
 */

import { createAdminClient } from "@/lib/supabase/server";
import { runOrchestrator, type QuestContext } from "@/lib/agents/orchestrator";
import { runArbiter, proposalsToEvents } from "@/lib/agents/arbiter";
import { runLorekeeper } from "@/lib/agents/lorekeeper";
import { collectParallelOutputs, buildChroniclerContext } from "@/lib/agents/collector";
import type { ProposalResult } from "@/lib/agents/tools/proposal-tools";
import { generateTurn } from "@/lib/gemini/client";
import { buildTurnPrompt, type LocationSummaryForPrompt } from "@/lib/gemini/prompts";
import { applyEvents } from "@/lib/turn/apply";
import { shouldRespawn, handlePlayerDeath } from "@/lib/combat/respawn";
import { filterOutput, FALLBACK_NARRATION } from "@/lib/safety/sentinel";
import { isCacheLoadedForRegion, loadRegionCache } from "@/lib/cache/region";
import { getWeaponDamage } from "@/lib/mechanics/equipment";
import { rollDiceNotation } from "@/lib/agents/mechanics";
import { awardSkillXP } from "@/lib/mechanics/skill-xp";
import { compressLocationTurns } from "@/lib/compression/queue";
import { validateSkillForActionType } from "@/lib/rules/affordances";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import type { ActionType } from "@/lib/agents/rune-marshal";
import type { FunctionDeclaration } from "@google/genai";
import type { Turn, TurnDiff, Character, WorldContext, AgentTrace } from "@/types";
import type { ValidatedEvent } from "@/lib/turn/validate";

const MAX_RETRIES = 2;

/** Patterns for unfixable rejections (don't retry) */
const UNFIXABLE_PATTERNS = [
  /not present/i,
  /not at.*location/i,
  /invalid location/i,
  /not in inventory/i,
  /not active/i,
  /no.*quests/i,
  /already at/i,
];

export interface RollOutcome {
  skill: string;
  success: boolean;
  total: number;
  dc: number;
  rolled?: number;
  modifier?: number;
}

/** Skill XP context for awarding XP after actions */
export interface SkillXPContext {
  skill: string;
  dc?: number;
  tier?: number;
  powerWords?: string[];
}

export interface PipelineInput {
  supabase: ReturnType<typeof createAdminClient>;
  characterId: string;
  playerAction: string;
  character: Character;
  world: WorldContext;
  recentTurns: Turn[];
  questContext: QuestContext;
  knownNpcNames: Set<string>;
  /** Existing turn ID (for roll path - updates existing turn) */
  turnId?: string;
  /** Roll outcome (for rolled actions) */
  rollOutcome?: RollOutcome;
  /** Full mechanics object (for rolled actions) */
  mechanics?: Turn["mechanics"];
  /** Existing traces to append to */
  existingTraces?: AgentTrace[];
  /** Action type for proposal constraints */
  actionType?: ActionType;
  /** Allowed proposal tools (if constrained) */
  allowedProposalTools?: FunctionDeclaration[];
  /** Affordances for prompt text backup */
  affordances?: import("@/lib/rules/affordances").Affordances;
  /** Skill XP context for awarding XP */
  skillXPContext?: SkillXPContext;
  /** Location summaries for compressed history */
  locationSummaries?: LocationSummaryForPrompt[];
}

export interface PipelineOutput {
  turnId: string;
  narration: string;
  diffs: TurnDiff[];
  suggestedActions: string[];
  mechanics?: Turn["mechanics"];
  traces: AgentTrace[];
  characterUpdates: Partial<Character>;
  worldUpdates: Partial<WorldContext>;
  /** Approved events (for extracting travel time, etc.) */
  approvedEvents?: Array<{ type: string; totalTravelTime?: number; [key: string]: unknown }>;
}

/**
 * Format a proposal for trace display
 */
function formatProposalForTrace(p: ProposalResult): string {
  switch (p.type) {
    case "propose_stat_change":
      const sign = p.data.delta > 0 ? "+" : "";
      return `${p.data.stat.toUpperCase()} ${sign}${p.data.delta}`;
    case "propose_inventory_add":
      return `+Item: ${p.data.item_name}`;
    case "propose_inventory_remove":
      return `-Item: ${p.data.item_name}`;
    case "propose_relationship_change":
      const relSign = p.data.delta > 0 ? "+" : "";
      return `${p.data.npc} ${relSign}${p.data.delta}`;
    case "propose_location_change":
      return `Travel to: ${p.data.location}`;
    case "propose_quest_start":
      return `Start quest: ${p.data.quest_title || p.data.quest_id}`;
    case "propose_quest_progress":
      return `Quest progress: ${p.data.quest_id} → step ${p.data.new_progress}`;
    case "propose_npc_discovered":
      return `New NPC: ${p.data.name} (${p.data.role})`;
    case "detect_intent":
      return `Intent: ${p.data.primary_skill}${p.data.requires_roll ? ` DC ${p.data.dc}` : ""}`;
    case "propose_combat_damage":
      return `Damage: ${p.data.target} -${p.data.damage} HP`;
    case "propose_combat_start":
      return `Combat: ${p.data.enemies.join(", ")}`;
    default:
      return `Unknown proposal`;
  }
}

/**
 * Run the consolidated turn pipeline
 */
export async function runTurnPipeline(input: PipelineInput): Promise<PipelineOutput> {
  const {
    supabase,
    characterId,
    playerAction,
    character,
    world,
    recentTurns,
    questContext,
    knownNpcNames,
    turnId,
    rollOutcome,
    mechanics,
    existingTraces = [],
    actionType,
    allowedProposalTools,
    affordances,
    skillXPContext,
    locationSummaries = [],
  } = input;

  const traces: AgentTrace[] = [...existingTraces];

  // Ensure region cache is loaded for current region
  if (!isCacheLoadedForRegion(world.region)) {
    await loadRegionCache(world.region);
  }

  // Add server-side state snapshot trace (for debugging state sync issues)
  traces.push({
    agent: "state_snapshot",
    status: "success",
    durationMs: 0,
    description: `Server loaded state for ${world.poi}`,
    details: [
      `Location: ${world.poi} (${world.region})`,
      `Entities: ${world.entities?.join(", ") || "none"}`,
      `Character HP: ${character.hp}/${character.maxHp}`,
      `Character Gold: ${character.gold}`,
      `Region cache: loaded`,
    ],
  });

  // Build arbiter context
  const arbiterContext = {
    character,
    world,
    playerAction,
    rollOutcome,
    actionType,  // Pass action type for failed roll blocking
    activeQuestIds: FEATURE_FLAGS.quests ? questContext.activeQuests.map(q => q.id) : [],
    activeQuestTitles: FEATURE_FLAGS.quests ? questContext.activeQuests.map(q => q.title) : [],
    activeQuestGoals: FEATURE_FLAGS.quests ? questContext.activeQuests.map(q => ({
      id: q.id,
      title: q.title,
      goalType: q.goalType || "dialogue",
      currentGoal: q.currentGoal || "",
    })) : [],
    availableQuestIds: FEATURE_FLAGS.quests ? questContext.npcQuests.map(q => q.id) : [],
    availableQuestTitles: FEATURE_FLAGS.quests ? questContext.npcQuests.map(q => q.title) : [],
  };

  // Determine detected intent for Orchestrator context
  const detectedIntent = mechanics?.skill 
    ? `${mechanics.skill} check ${mechanics.outcome || "pending"}`
    : undefined;

  // === ORCHESTRATOR + RETRY LOOP ===
  let proposals: ProposalResult[] = [];
  let arbiterResult;
  let lorekeeperResult;
  let retryCount = 0;

  // Skip Orchestrator entirely for passive actions with no tools
  const skipOrchestrator = actionType === "passive" && allowedProposalTools?.length === 0;

  if (skipOrchestrator) {
    // No proposals needed - run Arbiter/Lorekeeper with empty proposals
    traces.push({
      agent: "orchestrator",
      status: "success",
      durationMs: 0,
      description: `Skipped - passive action with no tools [${actionType}]`,
      details: ["No state changes proposed"],
    });

    // Still need to run Arbiter (with empty proposals) and Lorekeeper
    const parallelStart = Date.now();
    [arbiterResult, lorekeeperResult] = await Promise.all([
      runArbiter([], arbiterContext),
      runLorekeeper(playerAction, world, characterId),
    ]);
    const parallelDuration = Date.now() - parallelStart;

    traces.push({
      agent: "arbiter",
      status: "success",
      durationMs: parallelDuration,
      description: "No proposals to validate",
      details: [],
    });

    const npcNames = lorekeeperResult.npcsPresent?.map(n => n.name) || [];
    traces.push({
      agent: "lorekeeper",
      status: "success",
      durationMs: parallelDuration,
      description: `Fetched context for ${world.poi}`,
      details: [
        npcNames.length > 0 ? `NPCs present: ${npcNames.join(", ")}` : "No NPCs at this location",
        lorekeeperResult.codexSnippets?.length ? `Found ${lorekeeperResult.codexSnippets.length} codex entries` : "No relevant lore",
        lorekeeperResult.atmosphere ? `Atmosphere: ${lorekeeperResult.atmosphere.mood || "neutral"}` : null,
      ].filter(Boolean) as string[],
    });
  }

  while (!skipOrchestrator && retryCount <= MAX_RETRIES) {
    const rejectionContext = retryCount > 0 && arbiterResult?.rejected.length
      ? `Previous proposals rejected: ${arbiterResult.rejected.map(r => `${r.proposal.type} - ${r.reason}`).join("; ")}. Please adjust.`
      : detectedIntent;

    // Run Orchestrator with constrained tools if provided
    const orchestratorStart = Date.now();
    const orchestratorResult = await runOrchestrator(
      playerAction,
      character,
      world,
      recentTurns,
      rollOutcome,
      rejectionContext,
      questContext,
      allowedProposalTools,
      actionType,
      knownNpcNames,
      affordances
    );
    proposals = orchestratorResult.proposals;

    // Add orchestrator trace
    const toolsDesc = allowedProposalTools 
      ? `[${actionType || "unknown"}] tools: ${allowedProposalTools.length > 0 ? allowedProposalTools.map(t => t.name).join(", ") : "none"}`
      : "all tools";
    const orchestratorDesc = retryCount === 0
      ? `Generated ${proposals.length} proposal(s)${rollOutcome ? ` after ${rollOutcome.success ? "SUCCESS" : "FAILURE"} roll` : ""} (${toolsDesc})`
      : `Retry ${retryCount}: Generated ${proposals.length} proposal(s)`;

    traces.push({
      agent: "orchestrator",
      status: "success",
      durationMs: Date.now() - orchestratorStart,
      description: orchestratorDesc,
      details: [
        ...(orchestratorResult.traceDetails || []),
        ...(proposals.length > 0
          ? proposals.map(p => `→ ${formatProposalForTrace(p)}`)
          : ["No state changes proposed"]),
      ],
    });

    // === PARALLEL: ARBITER + LOREKEEPER ===
    const parallelStart = Date.now();
    
    // Only run Lorekeeper on first attempt
    if (retryCount === 0) {
      [arbiterResult, lorekeeperResult] = await Promise.all([
        runArbiter(proposals, arbiterContext),
        runLorekeeper(playerAction, world, characterId),
      ]);
    } else {
      // Retry: only run Arbiter, reuse Lorekeeper result
      arbiterResult = await runArbiter(proposals, arbiterContext);
    }

    const parallelDuration = Date.now() - parallelStart;

    // Add arbiter trace
    traces.push({
      agent: "arbiter",
      status: arbiterResult.rejected.length > 0 ? "error" : "success",
      durationMs: parallelDuration,
      description: arbiterResult.rejected.length > 0
        ? `Rejected ${arbiterResult.rejected.length} proposal(s), approved ${arbiterResult.approved.length}`
        : `Validated all ${arbiterResult.approved.length} proposal(s)`,
      details: [
        ...arbiterResult.approved.map(p => `✓ ${formatProposalForTrace(p)}`),
        ...arbiterResult.rejected.map(r => `✗ ${formatProposalForTrace(r.proposal)} - ${r.reason}`),
      ],
    });

    // Add lorekeeper trace only on first run
    if (retryCount === 0 && lorekeeperResult) {
      const npcNames = lorekeeperResult.npcsPresent?.map(n => n.name) || [];
      traces.push({
        agent: "lorekeeper",
        status: "success",
        durationMs: parallelDuration,
        description: `Fetched context for ${world.poi}`,
        details: [
          npcNames.length > 0 ? `NPCs present: ${npcNames.join(", ")}` : "No NPCs at this location",
          lorekeeperResult.codexSnippets?.length ? `Found ${lorekeeperResult.codexSnippets.length} codex entries` : "No relevant lore",
          lorekeeperResult.atmosphere ? `Atmosphere: ${lorekeeperResult.atmosphere.mood || "neutral"}` : null,
        ].filter(Boolean) as string[],
      });
    }

    // Check if we should retry
    const hasUnfixable = arbiterResult.rejected.some(r =>
      UNFIXABLE_PATTERNS.some(pattern => pattern.test(r.reason))
    );
    const hasFixable = arbiterResult.rejected.some(r =>
      /capped|too high|too large|exceeds/i.test(r.reason)
    );

    const shouldRetry = arbiterResult.rejected.length > 0
      && retryCount < MAX_RETRIES
      && hasFixable
      && !hasUnfixable;

    if (!shouldRetry) break;
    retryCount++;
  }

  // === COLLECTOR: First pass ===
  const collectorStart = Date.now();
  const collected = collectParallelOutputs(arbiterResult!, lorekeeperResult!);
  traces.push({
    agent: "collector",
    status: "success",
    durationMs: Date.now() - collectorStart,
    description: "Merged arbiter and lorekeeper outputs",
    details: [
      `${collected.arbiter.approved.length} approved events ready`,
      collected.lore.npcsPresent?.length ? `${collected.lore.npcsPresent.length} NPC(s) in context` : "No NPCs in context",
    ],
  });

  // Convert approved proposals to events
  const approvedEvents = proposalsToEvents(collected.arbiter.approved);

  // === APPLY STATE ===
  const applyStart = Date.now();
  const applyResult = applyEvents(character, world, approvedEvents as unknown as ValidatedEvent[], knownNpcNames);
  traces.push({
    agent: "apply_state",
    status: "success",
    durationMs: Date.now() - applyStart,
    description: applyResult.diffs.length > 0
      ? `Applied ${applyResult.diffs.length} state change(s)`
      : "No state changes to apply",
    details: applyResult.diffs.length > 0
      ? applyResult.diffs.map(d => d.value !== undefined ? `${d.type}: ${d.text} (${d.value})` : `${d.type}: ${d.text}`)
      : ["World state unchanged"],
  });

  // === SKILL XP AWARDING ===
  // Award XP if we have skill context (from power words or skill check)
  let skillXPResult: { updatedSkills: Record<string, import("@/types").SkillProgression>; diffs: TurnDiff[]; xpGained: number; leveledUp: boolean } | null = null;
  
  if (skillXPContext?.skill) {
    // Validate skill matches action type (warning only, still award XP)
    const skillValidation = validateSkillForActionType(skillXPContext.skill, actionType || "passive");
    if (!skillValidation.valid) {
      traces.push({
        agent: "arbiter",
        status: "success",
        durationMs: 0,
        description: `Skill mismatch warning: ${skillValidation.reason}`,
        details: [`Expected pillars: ${skillValidation.suggestedPillars?.join(", ")}`],
      });
    }

    const success = rollOutcome?.success ?? true; // Power word use without roll counts as success
    skillXPResult = awardSkillXP(
      characterId,
      character.skills,
      skillXPContext.skill,
      skillXPContext.dc ?? rollOutcome?.dc,
      skillXPContext.tier,
      success
    );
    
    // Merge skill updates into applyResult
    applyResult.characterUpdates.skills = skillXPResult.updatedSkills;
    applyResult.diffs.push(...skillXPResult.diffs);
    
    traces.push({
      agent: "apply_state",
      status: "success",
      durationMs: 0,
      description: skillXPResult.leveledUp 
        ? `${skillXPContext.skill} leveled up!`
        : `Awarded ${skillXPResult.xpGained} XP to ${skillXPContext.skill}`,
      details: skillXPResult.diffs.map(d => `${d.text} ${d.value || ""}`),
    });
  }

  // === RESPAWN CHECK ===
  // If player died (HP <= 0), respawn at Waystone
  if (shouldRespawn(character, applyResult.characterUpdates)) {
    const respawnResult = handlePlayerDeath(character, world);
    
    // Merge respawn updates
    Object.assign(applyResult.characterUpdates, respawnResult.characterUpdates);
    Object.assign(applyResult.worldUpdates, respawnResult.worldUpdates);
    applyResult.diffs.push(...respawnResult.diffs);
    applyResult.consequences.push(respawnResult.consequence);
    
    traces.push({
      agent: "apply_state",
      status: "success",
      durationMs: 0,
      description: "Player died - respawning at Waystone",
      details: respawnResult.diffs.map(d => `${d.text}: ${d.value || ""}`),
    });
  }

  // === COMPRESSION TRIGGER ===
  // Compress old location's turns when player changes location (synchronous)
  const locationChanged = applyResult.consequences.some(c => c.type === "location_changed");
  if (locationChanged && recentTurns.length > 0) {
    const compressionStart = Date.now();
    
    // Compress turns from the old location
    await compressLocationTurns(characterId, world.poi, recentTurns);
    
    traces.push({
      agent: "compression",
      status: "success",
      durationMs: Date.now() - compressionStart,
      description: `Compressed ${recentTurns.length} turns at ${world.poi}`,
      details: [`Generated summary for location visit`],
    });
  }

  // === COLLECTOR: Second pass ===
  let chroniclerContext = buildChroniclerContext(collected, applyResult);

  // If location changed, re-fetch NPCs and atmosphere for the NEW location
  if (locationChanged && applyResult.worldUpdates.poi) {
    const { getNpcsAtLocation, getLocationDetails, getNpcVoice, getAtmosphere } = await import("@/lib/agents/lorekeeper/handlers");
    const newLocation = applyResult.worldUpdates.poi;
    const newRegion = applyResult.worldUpdates.region || world.region;
    
    const [newNpcs, newLocationDetails] = await Promise.all([
      getNpcsAtLocation(newLocation, newRegion),
      getLocationDetails(newLocation, newRegion),
    ]);
    
    // Fetch voices for new NPCs
    const newVoices = [];
    for (const npc of newNpcs) {
      const voice = await getNpcVoice(npc.name, newRegion);
      if (voice) newVoices.push(voice);
    }
    
    // Get atmosphere for new location
    const newAtmosphere = newLocationDetails
      ? getAtmosphere(newLocationDetails.type, world.time.phase, world.weather)
      : null;
    
    // Update chronicler context with new location data
    chroniclerContext = {
      ...chroniclerContext,
      npcsPresent: newNpcs,
      locationDetails: newLocationDetails,
      npcVoices: newVoices,
      atmosphere: newAtmosphere,
    };
  }

  // === CHRONICLER ===
  const chroniclerStart = Date.now();
  
  // Merge world updates into world for Chronicler (so it sees the NEW location after travel)
  const worldForChronicler: WorldContext = {
    ...world,
    ...applyResult.worldUpdates,
  };
  
  // Calculate weapon damage for combat skills on success
  const combatSkills = ["Melee", "Ranged", "Styles"];
  const isCombatSkill = rollOutcome && combatSkills.includes(rollOutcome.skill);
  const weaponDamage = isCombatSkill ? getWeaponDamage(character.equipment) : undefined;
  const damageRolled = isCombatSkill && rollOutcome?.success && weaponDamage 
    ? rollDiceNotation(weaponDamage) 
    : undefined;

  const rollOutcomeForPrompt = rollOutcome ? {
    skill: rollOutcome.skill,
    rolled: rollOutcome.rolled || 0,
    modifier: rollOutcome.modifier || 0,
    total: rollOutcome.total,
    dc: rollOutcome.dc,
    outcome: rollOutcome.success ? "success" as const : "failure" as const,
    weaponDamage,
    damageRolled,
  } : undefined;

  const prompt = buildTurnPrompt(
    character,
    worldForChronicler,
    recentTurns,
    playerAction,
    rollOutcomeForPrompt,
    approvedEvents as unknown as ValidatedEvent[],
    chroniclerContext.npcsPresent.map(npc => ({
      name: npc.name,
      role: npc.role,
      personality: npc.personality,
      dialogueHints: npc.dialogueHints,
      relationship: 0,
    })),
    chroniclerContext.codexSnippets,
    chroniclerContext.consequences,
    chroniclerContext.npcVoices,
    chroniclerContext.atmosphere,
    // Pass rejected proposals so Chronicler knows NOT to narrate them
    arbiterResult?.rejected.map(r => ({
      type: r.proposal.type,
      reason: r.reason,
    })),
    locationSummaries
  );

  const geminiResponse = await generateTurn(prompt);
  traces.push({
    agent: "chronicler",
    status: "success",
    durationMs: Date.now() - chroniclerStart,
    description: `Generated ${geminiResponse.narration.length} character narration`,
    details: [
      "Called Gemini API for narrative generation",
      `Output: ${geminiResponse.narration.slice(0, 60)}...`,
      `Suggested ${geminiResponse.suggested_actions.length} follow-up action(s)`,
    ],
  });

  // === SAFETY FILTER ===
  const outputFilter = filterOutput(geminiResponse.narration);
  const finalNarration = outputFilter.status === "block" ? FALLBACK_NARRATION : geminiResponse.narration;
  const finalSuggestions = outputFilter.status === "block" ? ["Look around", "Wait"] : geminiResponse.suggested_actions;

  // Get updates (or empty if blocked)
  const { characterUpdates, worldUpdates, diffs, questChanges, relationshipChanges } =
    outputFilter.status === "block"
      ? { characterUpdates: {}, worldUpdates: {}, diffs: [] as TurnDiff[], questChanges: [], relationshipChanges: [] }
      : applyResult;

  // === PERSIST TURN ===
  let finalTurnId = turnId;

  if (turnId) {
    // Update existing turn (roll path)
    const cleanMechanics: Turn["mechanics"] = mechanics ? {
      type: mechanics.type,
      skill: mechanics.skill,
      dc: mechanics.dc,
      modifier: mechanics.modifier,
      rolled: mechanics.rolled,
      total: mechanics.total,
      outcome: mechanics.outcome,
    } : undefined;

    await supabase
      .from("waypoint_turns")
      .update({
        narration: finalNarration,
        diffs,
        suggested_actions: finalSuggestions,
        mechanics: cleanMechanics,
      })
      .eq("id", turnId);
  } else {
    // Insert new turn (no-roll path)
    const { data: turnRow, error: turnInsertError } = await supabase
      .from("waypoint_turns")
      .insert({
        character_id: characterId,
        player_action: playerAction,
        narration: finalNarration,
        diffs,
        suggested_actions: finalSuggestions,
        mechanics: null,
      })
      .select()
      .single();

    if (turnInsertError) {
      throw new Error("Failed to save turn");
    }
    finalTurnId = turnRow.id;
  }

  // === PERSIST STATE (all awaited) ===
  let enrichedWorldUpdates = worldUpdates;
  if (outputFilter.status === "allow") {
    await updateCharacterState(supabase, characterId, characterUpdates);
    enrichedWorldUpdates = await updateWorldState(supabase, characterId, worldUpdates);
    await updateQuestState(supabase, characterId, questChanges);
    await updateRelationshipState(supabase, characterId, relationshipChanges);
  }

  return {
    turnId: finalTurnId!,
    narration: finalNarration,
    diffs,
    suggestedActions: finalSuggestions,
    mechanics,
    traces,
    characterUpdates,
    worldUpdates: enrichedWorldUpdates,
    approvedEvents,
  };
}

// === STATE UPDATE HELPERS (moved from route.ts) ===

async function updateCharacterState(
  supabase: ReturnType<typeof createAdminClient>,
  characterId: string,
  updates: Partial<Character>
) {
  if (Object.keys(updates).length === 0) return;

  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.hp !== undefined) dbUpdates.hp = updates.hp;
  if (updates.maxHp !== undefined) dbUpdates.max_hp = updates.maxHp;
  if (updates.gold !== undefined) dbUpdates.gold = updates.gold;
  if (updates.inventory !== undefined) dbUpdates.inventory = updates.inventory;
  if (updates.equipment !== undefined) dbUpdates.equipment = updates.equipment;
  if (updates.conditions !== undefined) dbUpdates.conditions = updates.conditions;
  if (updates.skills !== undefined) dbUpdates.skills = updates.skills;

  await supabase.from("waypoint_characters").update(dbUpdates).eq("id", characterId);
}

async function updateWorldState(
  supabase: ReturnType<typeof createAdminClient>,
  characterId: string,
  updates: Partial<WorldContext>
): Promise<Partial<WorldContext>> {
  if (Object.keys(updates).length === 0) return updates;

  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.region !== undefined) dbUpdates.region = updates.region;
  if (updates.poi !== undefined) dbUpdates.poi = updates.poi;
  if (updates.weather !== undefined) dbUpdates.weather = updates.weather;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.time !== undefined) {
    if (updates.time.day !== undefined) dbUpdates.time_day = updates.time.day;
    if (updates.time.phase !== undefined) dbUpdates.time_phase = updates.time.phase;
  }
  if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
  if (updates.nearbyPoi !== undefined) dbUpdates.nearby_poi = updates.nearbyPoi;
  if (updates.entities !== undefined) dbUpdates.entities = updates.entities;
  if (updates.memory !== undefined) dbUpdates.memories = updates.memory;

  // If location changed and entities weren't explicitly set, sync with NPCs at that location
  if (updates.poi && updates.entities === undefined) {
    const { data: npcsAtLocation } = await supabase
      .from("waypoint_npcs")
      .select("name")
      .eq("location", updates.poi);

    const npcNames = (npcsAtLocation || []).map(n => n.name);
    dbUpdates.entities = npcNames;
    updates.entities = npcNames;
  }

  // If location changed, update nearbyPoi from connections table
  if (updates.poi && updates.nearbyPoi === undefined) {
    const { data: connections } = await supabase
      .from("waypoint_rules_location_connections")
      .select("to_location")
      .eq("from_location", updates.poi);

    const nearbyPois = (connections || []).map(c => c.to_location);
    dbUpdates.nearby_poi = nearbyPois;
    updates.nearbyPoi = nearbyPois;
  }

  // If location changed, update region from locations table
  if (updates.poi && updates.region === undefined) {
    const { data: locationData } = await supabase
      .from("waypoint_locations")
      .select("region")
      .eq("name", updates.poi)
      .maybeSingle();

    if (locationData?.region) {
      dbUpdates.region = locationData.region;
      updates.region = locationData.region;
    }
  }

  await supabase.from("waypoint_world_state").update(dbUpdates).eq("character_id", characterId);

  // If location changed, fetch the new location's imageUrl
  if (updates.poi) {
    const { data: locationData } = await supabase
      .from("waypoint_locations")
      .select("art_url")
      .eq("name", updates.poi)
      .maybeSingle();

    if (locationData?.art_url) {
      return { ...updates, imageUrl: locationData.art_url };
    }
  }

  return updates;
}

async function updateQuestState(
  supabase: ReturnType<typeof createAdminClient>,
  characterId: string,
  questChanges: Array<{ type: "start" | "progress"; questId: string; questTitle?: string; progress?: number; reason: string }>
) {
  if (questChanges.length === 0) return;

  for (const change of questChanges) {
    if (change.type === "start") {
      const { data: quest } = await supabase
        .from("waypoint_quests")
        .select("id")
        .ilike("title", change.questTitle || change.questId)
        .maybeSingle();

      if (quest) {
        const { data: existing } = await supabase
          .from("waypoint_character_quests")
          .select("id")
          .eq("character_id", characterId)
          .eq("quest_id", quest.id)
          .maybeSingle();

        if (!existing) {
          await supabase.from("waypoint_character_quests").insert({
            character_id: characterId,
            quest_id: quest.id,
            status: "active",
            progress: 0,
          });
        }
      }
    } else if (change.type === "progress") {
      const { data: quest } = await supabase
        .from("waypoint_quests")
        .select("id, total_progress")
        .ilike("title", change.questId)
        .maybeSingle();

      if (quest) {
        const newProgress = change.progress ?? 0;
        const isComplete = newProgress >= quest.total_progress;

        await supabase
          .from("waypoint_character_quests")
          .update({ progress: newProgress, status: isComplete ? "completed" : "active" })
          .eq("character_id", characterId)
          .eq("quest_id", quest.id);
      }
    }
  }
}

async function updateRelationshipState(
  supabase: ReturnType<typeof createAdminClient>,
  characterId: string,
  relationshipChanges: Array<{ npc: string; delta: number; reason: string }>
) {
  if (relationshipChanges.length === 0) return;

  for (const change of relationshipChanges) {
    const { data: npc } = await supabase
      .from("waypoint_npcs")
      .select("id")
      .ilike("name", change.npc)
      .maybeSingle();

    if (npc) {
      const { data: existing } = await supabase
        .from("waypoint_character_npcs")
        .select("id, relationship")
        .eq("character_id", characterId)
        .eq("npc_id", npc.id)
        .maybeSingle();

      if (existing) {
        const newRelationship = Math.max(-25, Math.min(25, existing.relationship + change.delta));
        await supabase.from("waypoint_character_npcs").update({ relationship: newRelationship }).eq("id", existing.id);
      } else {
        const newRelationship = Math.max(-25, Math.min(25, change.delta));
        await supabase.from("waypoint_character_npcs").insert({
          character_id: characterId,
          npc_id: npc.id,
          relationship: newRelationship,
        });
      }
    }
  }
}
