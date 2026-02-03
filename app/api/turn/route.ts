import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { dbToCharacter, dbToWorld } from "@/lib/supabase/transforms";
import { runRuneMarshal, type ActionType } from "@/lib/agents/rune-marshal";
import { runQuestAgent } from "@/lib/agents/quest-agent";
import type { QuestContext } from "@/lib/agents/orchestrator";
import { resolveSkillCheck, calculateTotalModifier } from "@/lib/agents/mechanics";
import { getEquipmentBonusForSkill } from "@/lib/mechanics/equipment";
import { filterInput } from "@/lib/safety/sentinel";
import { runTurnPipeline, type RollOutcome } from "@/lib/turn/pipeline";
import { getAllowedProposalTools, getAllowedToolNames, getUnionOfAllowedTools } from "@/lib/rules/proposal-constraints";
import { buildAffordances, constrainTools } from "@/lib/rules/affordances";
import { getWeatherForToday } from "@/lib/world/weather";
import { calculateTimeAdvancement, getTimeTransitionDescription, type GameTime } from "@/lib/world/time";
import { getLocationSummaries } from "@/lib/compression/queue";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import type { Turn, TurnDiff, Character, WorldContext, AgentTrace } from "@/types";

interface TurnRequest {
  characterId: string;
  playerAction?: string;
  rollOnly?: boolean;
  narrate?: boolean;
  turnId?: string;
}

interface TurnResponse {
  turn: {
    id: string;
    narration: string;
    diffs: TurnDiff[];
    suggestedActions: string[];
    mechanics?: Turn["mechanics"];
    trace?: AgentTrace[];
  };
  updatedCharacter?: Partial<Character>;
  updatedWorld?: Partial<WorldContext>;
  pendingRoll?: boolean;
}

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
    diffs: (row.diffs as TurnDiff[]) || [],
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const characterId = searchParams.get("character_id");

    if (!characterId) {
      return NextResponse.json({ error: "character_id is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: turnRows, error } = await supabase
      .from("waypoint_turns")
      .select("*")
      .eq("character_id", characterId)
      .order("created_at", { ascending: false })
      .limit(50);

    turnRows?.reverse();

    if (error) {
      console.error("Error loading turns:", error);
      return NextResponse.json({ error: "Failed to load turns" }, { status: 500 });
    }

    return NextResponse.json({ turns: (turnRows || []).map(dbToTurn) });
  } catch (error) {
    console.error("Turn loading error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/turn - Consolidated Turn Pipeline
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TurnRequest;
    const { characterId, playerAction, rollOnly, narrate, turnId } = body;

    if (!characterId || typeof characterId !== "string") {
      return NextResponse.json({ error: "characterId is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Load character
    const { data: characterRow, error: characterError } = await supabase
      .from("waypoint_characters")
      .select("*")
      .eq("id", characterId)
      .single();

    if (characterError || !characterRow) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    const character = dbToCharacter(characterRow);

    // Load world state
    const { data: worldRow, error: worldError } = await supabase
      .from("waypoint_world_state")
      .select("*")
      .eq("character_id", characterId)
      .single();

    if (worldError || !worldRow) {
      return NextResponse.json({ error: "World state not found" }, { status: 404 });
    }

    const world = dbToWorld(worldRow);

    // === FETCH GLOBAL WEATHER ===
    // Weather is shared across all players, changes daily
    const globalWeather = await getWeatherForToday(world.region);
    world.weather = globalWeather.type; // Override per-character weather with global

    // Load known NPC names for this character
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

    // Load location summaries for compressed history
    const locationSummaries = await getLocationSummaries(characterId);

    // === ROLL ONLY: Just roll dice and return result ===
    if (rollOnly && turnId) {
      return handleRollOnly(supabase, turnId, character);
    }

    // === NARRATE: Generate narration for already-rolled turn ===
    if (narrate && turnId) {
      return handleNarration(supabase, turnId, characterId, character, world, recentTurns, knownNpcNames, locationSummaries);
    }

    // === NEW TURN ===
    if (!playerAction || typeof playerAction !== "string") {
      return NextResponse.json({ error: "playerAction is required" }, { status: 400 });
    }

    const traces: AgentTrace[] = [];

    // Safety filter on input
    const sentinelStart = Date.now();
    const inputFilter = filterInput(playerAction);
    traces.push({
      agent: "sentinel",
      status: inputFilter.status === "block" ? "error" : "success",
      durationMs: Date.now() - sentinelStart,
      description: inputFilter.status === "block"
        ? `Blocked unsafe input: "${playerAction.slice(0, 30)}..."`
        : "Input passed safety check",
      details: [`Scanned ${playerAction.length} characters`, `Result: ${inputFilter.status.toUpperCase()}`],
    });

    if (inputFilter.status === "block") {
      return NextResponse.json({ error: inputFilter.output }, { status: 400 });
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
        intent.requires_roll ? `Difficulty: DC ${intent.dc}` : "Routine action",
        intent.power_words?.length ? `Power words: ${intent.power_words.join(", ")}` : "No power words detected",
        intent.bonus ? `Bonus: +${intent.bonus}` : null,
      ].filter(Boolean) as string[],
    });

    // Handle denied actions
    if (intent.denial_reason) {
      const { data: turnRow } = await supabase
        .from("waypoint_turns")
        .insert({
          character_id: characterId,
          player_action: playerAction,
          narration: intent.denial_reason,
          diffs: [],
          suggested_actions: ["Look around", "Try something else"],
          mechanics: null,
        })
        .select()
        .single();

      return NextResponse.json({
        turn: {
          id: turnRow?.id || "denied",
          narration: intent.denial_reason,
          diffs: [],
          suggestedActions: ["Look around", "Try something else"],
          trace: traces,
        },
      });
    }

    // === REQUIRES ROLL: Create pending turn ===
    if (intent.requires_roll && intent.dc) {
      const skillLevel = character.skills[intent.primary_skill]?.level || 0;
      const equipmentBonus = getEquipmentBonusForSkill(character.equipment, intent.primary_skill);
      const modifier = calculateTotalModifier(skillLevel, intent.bonus || 0, equipmentBonus);

      const mechanics: Turn["mechanics"] & { detectedIntent?: string; actionTypes?: ActionType[] } = {
        type: "check",
        skill: intent.primary_skill,
        dc: intent.dc,
        modifier,
        detectedIntent: intent.intent,
        actionTypes: intent.action_types,  // Store for narration phase
      };

      const { data: turnRow, error: turnInsertError } = await supabase
        .from("waypoint_turns")
        .insert({
          character_id: characterId,
          player_action: playerAction,
          narration: null,
          diffs: [],
          suggested_actions: [],
          mechanics,
        })
        .select()
        .single();

      if (turnInsertError) {
        return NextResponse.json({ error: "Failed to save turn" }, { status: 500 });
      }

      return NextResponse.json({
        turn: {
          id: turnRow.id,
          narration: "",
          diffs: [],
          suggestedActions: [],
          mechanics,
          trace: traces,
        },
        pendingRoll: true,
      });
    }

    // === NO ROLL: Run full pipeline ===
    const questContext = await gatherQuestContext(characterId, playerAction, world);
    traces.push(questContext.trace);

    // Build affordances from current state (use first action type for affordances - travel is what matters)
    const primaryActionType = intent.action_types[0] || "passive";
    const affordances = await buildAffordances(character, world, primaryActionType);

    // Get constrained tools based on action types (union of all), then constrain with affordances
    const allowedTools = getUnionOfAllowedTools(intent.action_types);
    const constrainedTools = constrainTools(allowedTools, affordances);
    const allowedToolNames = [...new Set(intent.action_types.flatMap(t => getAllowedToolNames(t)))];

    // Add action type trace with affordances info
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

    // Run consolidated pipeline (handles Orchestrator internally)
    const pipelineResult = await runTurnPipeline({
      supabase,
      characterId,
      playerAction,
      character,
      world,
      recentTurns,
      questContext: questContext.context,
      knownNpcNames,
      existingTraces: traces,
      actionTypes: intent.action_types,
      allowedProposalTools: constrainedTools,
      affordances,
      locationSummaries,
      // Pass skill XP context for power word use (no roll)
      skillXPContext: intent.power_words?.length ? {
        skill: intent.primary_skill,
        dc: intent.dc,
        tier: intent.tier,
        powerWords: intent.power_words,
      } : undefined,
    });

    // === TIME ADVANCEMENT ===
    // Check if time should advance based on turn count and action type
    const turnCount = recentTurns.length + 1; // Include this turn
    const currentTime: GameTime = { day: world.time.day, phase: world.time.phase as GameTime["phase"] };
    
    // Check for multi-hop travel time override
    const locationChangeEvent = pipelineResult.approvedEvents?.find(
      (e: { type: string; totalTravelTime?: number }) => e.type === "location_change" && e.totalTravelTime
    );
    const travelTimeOverride = locationChangeEvent?.totalTravelTime;
    
    const newTime = calculateTimeAdvancement(currentTime, turnCount, primaryActionType, playerAction, travelTimeOverride);
    
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

    const response: TurnResponse = {
      turn: {
        id: pipelineResult.turnId,
        narration: pipelineResult.narration,
        diffs: pipelineResult.diffs,
        suggestedActions: pipelineResult.suggestedActions,
        trace: pipelineResult.traces,
      },
    };

    if (Object.keys(pipelineResult.characterUpdates).length > 0) {
      response.updatedCharacter = pipelineResult.characterUpdates;
    }
    if (Object.keys(pipelineResult.worldUpdates).length > 0) {
      response.updatedWorld = pipelineResult.worldUpdates;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Turn processing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Handle roll-only request (phase 1 of rolled turns)
 */
async function handleRollOnly(
  supabase: ReturnType<typeof createAdminClient>,
  turnId: string,
  character: Character
) {
  const { data: turnRow, error: turnError } = await supabase
    .from("waypoint_turns")
    .select("*")
    .eq("id", turnId)
    .single();

  if (turnError || !turnRow) {
    return NextResponse.json({ error: "Turn not found" }, { status: 404 });
  }

  const mechanics = turnRow.mechanics as Turn["mechanics"] & { detectedIntent?: string; actionType?: ActionType };
  if (!mechanics) {
    return NextResponse.json({ error: "No mechanics on turn" }, { status: 400 });
  }

  // If already has outcome, return it
  if (mechanics.outcome) {
    return NextResponse.json({
      turn: {
        id: turnId,
        mechanics: {
          type: mechanics.type,
          skill: mechanics.skill,
          dc: mechanics.dc,
          modifier: mechanics.modifier,
          rolled: mechanics.rolled,
          total: mechanics.total,
          outcome: mechanics.outcome,
        },
      },
      rollComplete: true,
    });
  }

  // Roll the dice
  const skillLevel = character.skills[mechanics.skill]?.level || 0;
  const checkResult = resolveSkillCheck(
    mechanics.skill,
    skillLevel,
    mechanics.modifier || 0,
    mechanics.dc
  );

  const updatedMechanics: Turn["mechanics"] & { detectedIntent?: string; actionType?: ActionType } = {
    type: "check",
    skill: mechanics.skill,
    dc: mechanics.dc,
    modifier: mechanics.modifier,
    rolled: checkResult.rolled,
    total: checkResult.total,
    outcome: checkResult.success ? "success" : "failure",
    detectedIntent: mechanics.detectedIntent,
    actionType: mechanics.actionType,  // Preserve action type for narration phase
  };

  await supabase
    .from("waypoint_turns")
    .update({ mechanics: updatedMechanics })
    .eq("id", turnId);

  return NextResponse.json({
    turn: {
      id: turnId,
      mechanics: {
        type: updatedMechanics.type,
        skill: updatedMechanics.skill,
        dc: updatedMechanics.dc,
        modifier: updatedMechanics.modifier,
        rolled: updatedMechanics.rolled,
        total: updatedMechanics.total,
        outcome: updatedMechanics.outcome,
      },
    },
    rollComplete: true,
  });
}

/**
 * Handle narration request (phase 2 of rolled turns)
 */
async function handleNarration(
  supabase: ReturnType<typeof createAdminClient>,
  turnId: string,
  characterId: string,
  character: Character,
  world: WorldContext,
  recentTurns: Turn[],
  knownNpcNames: Set<string>,
  locationSummaries: Awaited<ReturnType<typeof getLocationSummaries>>
) {
  const { data: turnRow, error: turnError } = await supabase
    .from("waypoint_turns")
    .select("*")
    .eq("id", turnId)
    .single();

  if (turnError || !turnRow) {
    return NextResponse.json({ error: "Turn not found" }, { status: 404 });
  }

  const mechanics = turnRow.mechanics as Turn["mechanics"] & { detectedIntent?: string; actionTypes?: ActionType[] };
  if (!mechanics || !mechanics.outcome) {
    return NextResponse.json({ error: "Roll not complete" }, { status: 400 });
  }

  const playerAction = turnRow.player_action;
  const questContext = await gatherQuestContext(characterId, playerAction, world);

  // Get constrained tools based on stored action types (default to object for search/manipulation)
  const actionTypes = mechanics.actionTypes || ["object"];
  const allowedTools = getUnionOfAllowedTools(actionTypes);

  const rollOutcome: RollOutcome = {
    skill: mechanics.skill,
    success: mechanics.outcome === "success",
    total: mechanics.total!,
    dc: mechanics.dc,
    rolled: mechanics.rolled,
    modifier: mechanics.modifier,
  };

  const pipelineResult = await runTurnPipeline({
    supabase,
    characterId,
    playerAction,
    character,
    world,
    recentTurns,
    questContext: questContext.context,
    knownNpcNames,
    turnId,
    rollOutcome,
    mechanics,
    existingTraces: [questContext.trace],
    actionTypes,
    allowedProposalTools: allowedTools,
    locationSummaries,
    // Pass skill XP context for rolled skill checks
    skillXPContext: {
      skill: mechanics.skill,
      dc: mechanics.dc,
    },
  });

  // === TIME ADVANCEMENT ===
  // Check if time should advance based on turn count and action type
  const turnCount = recentTurns.length + 1; // Include this turn
  const currentTime: GameTime = { day: world.time.day, phase: world.time.phase as GameTime["phase"] };
  const primaryActionType = actionTypes[0] || "object";
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

  const response: TurnResponse = {
    turn: {
      id: pipelineResult.turnId,
      narration: pipelineResult.narration,
      diffs: pipelineResult.diffs,
      suggestedActions: pipelineResult.suggestedActions,
      mechanics: pipelineResult.mechanics,
      trace: pipelineResult.traces,
    },
  };

  if (Object.keys(pipelineResult.characterUpdates).length > 0) {
    response.updatedCharacter = pipelineResult.characterUpdates;
  }
  if (Object.keys(pipelineResult.worldUpdates).length > 0) {
    response.updatedWorld = pipelineResult.worldUpdates;
  }

  return NextResponse.json(response);
}

/**
 * Gather quest context for the turn
 */
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
