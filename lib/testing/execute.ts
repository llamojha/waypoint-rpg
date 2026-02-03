/**
 * Turn Execution Helper
 * 
 * Executes a turn directly against the pipeline (not via HTTP).
 * Used for integration testing.
 */

import { createAdminClient } from "@/lib/supabase/server";
import { dbToCharacter, dbToWorld } from "@/lib/supabase/transforms";
import { runRuneMarshal, type ActionType } from "@/lib/agents/rune-marshal";
import { runQuestAgent } from "@/lib/agents/quest-agent";
import { resolveSkillCheck, calculateTotalModifier } from "@/lib/agents/mechanics";
import { getEquipmentBonusForSkill } from "@/lib/mechanics/equipment";
import { filterInput } from "@/lib/safety/sentinel";
import { runTurnPipeline, type RollOutcome } from "@/lib/turn/pipeline";
import { getAllowedProposalTools, getAllowedToolNames, getUnionOfAllowedTools } from "@/lib/rules/proposal-constraints";
import { buildAffordances, constrainTools } from "@/lib/rules/affordances";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import type { Turn, AgentTrace, Character, WorldContext } from "@/types";
import type { QuestContext } from "@/lib/agents/orchestrator";
import type { TestTurnResult } from "./types";

function dbToTurn(row: {
  id: string;
  player_action: string;
  narration: string | null;
  mechanics: unknown;
  diffs: unknown;
  suggested_actions: unknown;
  created_at: string | null;
}): Turn {
  return {
    id: row.id,
    timestamp: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    playerAction: row.player_action,
    narration: row.narration || "",
    isStreaming: false,
    mechanics: row.mechanics as Turn["mechanics"],
    suggestedActions: (row.suggested_actions as string[]) || [],
    diffs: (row.diffs as Turn["diffs"]) || [],
  };
}

async function gatherQuestContext(
  characterId: string,
  playerAction: string,
  world: WorldContext
): Promise<{ context: QuestContext; trace: AgentTrace }> {
  // Skip quest agent when quests are disabled
  if (!FEATURE_FLAGS.quests) {
    return {
      context: { activeQuests: [], npcQuests: [] },
      trace: {
        agent: "quest_agent",
        status: "skipped",
        durationMs: 0,
        description: "Quests disabled",
        details: [],
      },
    };
  }

  const actionLower = playerAction.toLowerCase();
  const mentionedNpc = world.entities?.find(npc =>
    actionLower.includes(npc.toLowerCase()) ||
    actionLower.includes(npc.split(" ")[0].toLowerCase())
  );

  const questAgentStart = Date.now();
  const questAgentResult = await runQuestAgent(characterId, mentionedNpc);
  const activeQuestNames = questAgentResult.activeQuests.map(q => q.title).slice(0, 3);

  const trace: AgentTrace = {
    agent: "quest_agent",
    status: "success",
    durationMs: Date.now() - questAgentStart,
    description: questAgentResult.activeQuests.length > 0
      ? `Found ${questAgentResult.activeQuests.length} active quest(s)`
      : "No active quests",
    details: [
      ...activeQuestNames.map(name => `Active: "${name}"`),
      mentionedNpc ? `Checking quests from: ${mentionedNpc}` : null,
      questAgentResult.npcQuests.length > 0 ? `${questAgentResult.npcQuests.length} NPC quest hooks available` : null,
    ].filter(Boolean) as string[],
  };

  return {
    context: {
      activeQuests: questAgentResult.activeQuests,
      npcQuests: questAgentResult.npcQuests,
    },
    trace,
  };
}

/**
 * Execute a turn directly against the pipeline.
 * Handles both rolled and non-rolled turns automatically.
 */
export async function executeTurn(
  characterId: string,
  playerAction: string
): Promise<TestTurnResult> {
  const supabase = createAdminClient();
  const traces: AgentTrace[] = [];

  // Load character
  const { data: characterRow, error: characterError } = await supabase
    .from("waypoint_characters")
    .select("*")
    .eq("id", characterId)
    .single();

  if (characterError || !characterRow) {
    throw new Error(`Character not found: ${characterError?.message}`);
  }

  const character = dbToCharacter(characterRow);

  // Load world state
  const { data: worldRow, error: worldError } = await supabase
    .from("waypoint_world_state")
    .select("*")
    .eq("character_id", characterId)
    .single();

  if (worldError || !worldRow) {
    throw new Error(`World state not found: ${worldError?.message}`);
  }

  const world = dbToWorld(worldRow);

  // Load known NPC names
  const { data: knownNpcRows } = await supabase
    .from("waypoint_character_npcs")
    .select("waypoint_npcs(name)")
    .eq("character_id", characterId);

  const knownNpcNames = new Set<string>(
    (knownNpcRows || [])
      .map((row) => {
        const npcs = row.waypoint_npcs as { name: string } | { name: string }[] | null;
        if (Array.isArray(npcs)) return npcs[0]?.name?.toLowerCase();
        return npcs?.name?.toLowerCase();
      })
      .filter((name): name is string => typeof name === "string")
  );

  // Load recent turns
  const { data: turnRows } = await supabase
    .from("waypoint_turns")
    .select("*")
    .eq("character_id", characterId)
    .not("narration", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);

  const recentTurns = (turnRows || []).map(dbToTurn).reverse();

  // === SENTINEL ===
  const sentinelStart = Date.now();
  const inputFilter = filterInput(playerAction);
  traces.push({
    agent: "sentinel",
    status: inputFilter.status === "block" ? "error" : "success",
    durationMs: Date.now() - sentinelStart,
    description: inputFilter.status === "block"
      ? `Blocked unsafe input`
      : "Input passed safety check",
    details: [`Result: ${inputFilter.status.toUpperCase()}`],
  });

  if (inputFilter.status === "block") {
    throw new Error(`Input blocked by Sentinel: ${inputFilter.output}`);
  }

  // === RUNE MARSHAL ===
  const runeMarshalStart = Date.now();
  const intent = await runRuneMarshal(playerAction, character, world);
  traces.push({
    agent: "rune_marshal",
    status: "success",
    durationMs: Date.now() - runeMarshalStart,
    description: intent.requires_roll
      ? `Detected ${intent.primary_skill} check (DC ${intent.dc})`
      : "No skill check required - routine action",
    details: [
      `Intent: ${intent.intent}`,
      `Primary skill: ${intent.primary_skill}`,
      `Action types: ${intent.action_types.join(", ")}`,
      intent.requires_roll ? `Difficulty: DC ${intent.dc}` : "Routine action",
      intent.power_words?.length ? `Power words: ${intent.power_words.join(", ")}` : null,
    ].filter(Boolean) as string[],
  });

  // Handle denied actions
  if (intent.denial_reason) {
    return {
      turnId: "denied",
      narration: intent.denial_reason,
      diffs: [],
      suggestedActions: ["Look around", "Try something else"],
      traces,
      character,
      world,
    };
  }

  // === QUEST CONTEXT ===
  const questContext = await gatherQuestContext(characterId, playerAction, world);
  traces.push(questContext.trace);

  // Build affordances from current state (use first action type - travel is what matters)
  const primaryActionType = intent.action_types[0] || "passive";
  const affordances = await buildAffordances(character, world, primaryActionType);

  // Get constrained tools (union of all action types), then constrain with affordances
  const allowedTools = getUnionOfAllowedTools(intent.action_types);
  const constrainedTools = constrainTools(allowedTools, affordances);
  const allowedToolNames = [...new Set(intent.action_types.flatMap(t => getAllowedToolNames(t)))];

  traces.push({
    agent: "rune_marshal",
    status: "success",
    durationMs: 0,
    description: `Action type: ${intent.action_types.join(", ")}`,
    details: [
      `Allowed tools: ${allowedToolNames.length > 0 ? allowedToolNames.join(", ") : "none (passive action)"}`,
      ...(affordances.locationIds.length > 0 ? [`Valid locations: ${affordances.locationIds.join(", ")}`] : []),
      ...(affordances.enemyIds.length > 0 ? [`Valid targets: ${affordances.enemyIds.join(", ")}`] : []),
    ],
  });

  let rollOutcome: RollOutcome | undefined;
  let mechanics: Turn["mechanics"] | undefined;

  // === HANDLE ROLL IF NEEDED ===
  if (intent.requires_roll && intent.dc) {
    const skillLevel = character.skills[intent.primary_skill]?.level || 0;
    const equipmentBonus = getEquipmentBonusForSkill(character.equipment, intent.primary_skill);
    const modifier = calculateTotalModifier(skillLevel, intent.bonus || 0, equipmentBonus);

    const checkResult = resolveSkillCheck(
      intent.primary_skill,
      skillLevel,
      modifier,
      intent.dc
    );

    mechanics = {
      type: "check",
      skill: intent.primary_skill,
      dc: intent.dc,
      modifier,
      rolled: checkResult.rolled,
      total: checkResult.total,
      outcome: checkResult.success ? "success" : "failure",
    };

    rollOutcome = {
      skill: intent.primary_skill,
      success: checkResult.success,
      total: checkResult.total,
      dc: intent.dc,
      rolled: checkResult.rolled,
      modifier,
    };

    traces.push({
      agent: "rune_marshal",
      status: "success",
      durationMs: 0,
      description: `Roll: ${checkResult.rolled} + ${modifier} = ${checkResult.total} vs DC ${intent.dc} → ${checkResult.success ? "SUCCESS" : "FAILURE"}`,
      details: [],
    });
  }

  // === RUN PIPELINE ===
  const pipelineResult = await runTurnPipeline({
    supabase,
    characterId,
    playerAction,
    character,
    world,
    recentTurns,
    questContext: questContext.context,
    knownNpcNames,
    rollOutcome,
    mechanics,
    existingTraces: traces,
    actionTypes: intent.action_types,
    allowedProposalTools: constrainedTools,
    affordances,
    // Pass skill XP context for XP awarding
    skillXPContext: (intent.power_words?.length || rollOutcome) ? {
      skill: intent.primary_skill,
      dc: intent.dc,
      tier: intent.tier,
      powerWords: intent.power_words,
    } : undefined,
  });

  // === TIME ADVANCEMENT ===
  // Check if time should advance based on turn count and action type
  const { calculateTimeAdvancement, getTimeTransitionDescription } = await import("@/lib/world/time");
  type GameTime = { day: number; phase: "Dawn" | "Morning" | "Afternoon" | "Dusk" | "Night" };
  const turnCount = recentTurns.length + 1; // Include this turn
  const currentTime: GameTime = { day: world.time.day, phase: world.time.phase as GameTime["phase"] };
  const newTime = calculateTimeAdvancement(currentTime, turnCount, primaryActionType, playerAction);
  
  if (newTime) {
    // Update world state with new time
    await supabase
      .from("waypoint_world_state")
      .update({ time_day: newTime.day, time_phase: newTime.phase })
      .eq("character_id", characterId);
    
    // Add time advancement to world updates and diffs
    pipelineResult.worldUpdates.time = newTime;
    const timeDesc = getTimeTransitionDescription(currentTime, newTime);
    pipelineResult.diffs.push({ type: "world", text: "Time", value: `${newTime.phase} (Day ${newTime.day})` });
    
    // Add trace for time advancement
    pipelineResult.traces.push({
      agent: "world_time",
      status: "success",
      durationMs: 0,
      description: timeDesc,
      details: [`${currentTime.phase} → ${newTime.phase}`, `Turn ${turnCount}`],
    });
  }

  // Reload character and world to get updated state
  const { data: updatedCharRow } = await supabase
    .from("waypoint_characters")
    .select("*")
    .eq("id", characterId)
    .single();

  const { data: updatedWorldRow } = await supabase
    .from("waypoint_world_state")
    .select("*")
    .eq("character_id", characterId)
    .single();

  return {
    turnId: pipelineResult.turnId,
    narration: pipelineResult.narration,
    diffs: pipelineResult.diffs,
    suggestedActions: pipelineResult.suggestedActions,
    mechanics: pipelineResult.mechanics,
    traces: pipelineResult.traces,
    character: updatedCharRow ? dbToCharacter(updatedCharRow) : character,
    world: updatedWorldRow ? dbToWorld(updatedWorldRow) : world,
  };
}
