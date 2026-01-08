import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { dbToCharacter, dbToWorld } from "@/lib/supabase/transforms";
import { runRuneMarshal } from "@/lib/agents/rune-marshal";
import { runOrchestrator } from "@/lib/agents/orchestrator";
import { runArbiter, proposalsToEvents } from "@/lib/agents/arbiter";
import type { ProposalResult } from "@/lib/agents/tools/proposal-tools";
import { resolveSkillCheck, calculateTotalModifier } from "@/lib/agents/mechanics";
import { generateTurn } from "@/lib/gemini/client";
import { buildTurnPrompt } from "@/lib/gemini/prompts";
import { applyEvents } from "@/lib/turn/apply";
import { filterInput, filterOutput, FALLBACK_NARRATION } from "@/lib/safety/sentinel";
import type { Turn, TurnDiff, Character, WorldContext } from "@/types";
import type { ValidatedEvent } from "@/lib/turn/validate";

interface TurnRequest {
  characterId: string;
  playerAction?: string;
  roll?: boolean;
  rollOnly?: boolean;  // If true, just roll dice and return result (no narration)
  narrate?: boolean;   // If true, generate narration for already-rolled turn
  turnId?: string;
}

interface TurnResponse {
  turn: {
    id: string;
    narration: string;
    diffs: TurnDiff[];
    suggestedActions: string[];
    mechanics?: Turn["mechanics"];
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
 * POST /api/turn - New Agent Pipeline
 * Flow: Orchestrator → Mechanics → Arbiter → Chronicler
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TurnRequest;
    const { characterId, playerAction, roll, rollOnly, narrate, turnId } = body;

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

    // Load recent turns
    const { data: turnRows } = await supabase
      .from("waypoint_turns")
      .select("*")
      .eq("character_id", characterId)
      .order("created_at", { ascending: false })
      .limit(100);

    const recentTurns = (turnRows || []).map(dbToTurn).reverse();

    // ROLL ONLY: Just roll dice and return result (no narration)
    if (rollOnly && turnId) {
      return handleRollResolution(supabase, turnId, character, world, recentTurns, true);
    }

    // NARRATE: Generate narration for already-rolled turn
    if (narrate && turnId) {
      return handleRollResolution(supabase, turnId, character, world, recentTurns, false);
    }

    // LEGACY: roll && turnId (for backwards compatibility)
    if (roll && turnId) {
      return handleRollResolution(supabase, turnId, character, world, recentTurns, false);
    }

    // NEW TURN: Validate playerAction
    if (!playerAction || typeof playerAction !== "string") {
      return NextResponse.json({ error: "playerAction is required" }, { status: 400 });
    }

    // Safety filter on input
    const inputFilter = filterInput(playerAction);
    if (inputFilter.status === "block") {
      return NextResponse.json({ error: inputFilter.output }, { status: 400 });
    }

    // === RUNE MARSHAL (intent detection only) ===
    const intent = await runRuneMarshal(playerAction, character, world);

    // Handle denied actions (e.g., magic when not unlocked)
    if (intent.denial_reason) {
      const { data: turnRow, error: turnInsertError } = await supabase
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

      if (turnInsertError) {
        return NextResponse.json({ error: "Failed to save turn" }, { status: 500 });
      }

      return NextResponse.json({
        turn: {
          id: turnRow.id,
          narration: intent.denial_reason,
          diffs: [],
          suggestedActions: ["Look around", "Try something else"],
        },
      });
    }

    // If action requires a roll, create pending turn (no Orchestrator yet)
    if (intent.requires_roll && intent.dc) {
      const skillLevel = character.skills[intent.primary_skill]?.level || 0;
      const modifier = calculateTotalModifier(skillLevel, intent.bonus || 0);

      const mechanics: Turn["mechanics"] & { detectedIntent?: string } = {
        type: "check",
        skill: intent.primary_skill,
        dc: intent.dc,
        modifier,
        detectedIntent: intent.intent,
      };

      // Save turn with pending roll - Orchestrator runs after roll
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
        },
        pendingRoll: true,
      });
    }

    // === NO ROLL NEEDED - Run Orchestrator now ===
    const orchestratorResult = await runOrchestrator(playerAction, character, world, recentTurns, undefined, intent.intent);
    
    return completeTurnPipeline(
      supabase,
      characterId,
      playerAction,
      character,
      world,
      recentTurns,
      orchestratorResult.proposals,
      undefined // no roll outcome
    );
  } catch (error) {
    console.error("Turn processing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Handle roll resolution for pending skill check
 * Phase 1 (rollOnly=true): Just roll dice, return result immediately
 * Phase 2 (rollOnly=false): Generate narration with roll outcome
 */
async function handleRollResolution(
  supabase: ReturnType<typeof createAdminClient>,
  turnId: string,
  character: Character,
  world: WorldContext,
  recentTurns: Turn[],
  rollOnly: boolean = false
) {
  // Load pending turn
  const { data: turnRow, error: turnError } = await supabase
    .from("waypoint_turns")
    .select("*")
    .eq("id", turnId)
    .single();

  if (turnError || !turnRow) {
    return NextResponse.json({ error: "Turn not found" }, { status: 404 });
  }

  const mechanics = turnRow.mechanics as Turn["mechanics"] & { detectedIntent?: string };
  if (!mechanics) {
    return NextResponse.json({ error: "No mechanics on turn" }, { status: 400 });
  }

  // If already has outcome and this is rollOnly, return existing result
  if (mechanics.outcome && rollOnly) {
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

  // If no outcome yet, roll the dice
  if (!mechanics.outcome) {
    const skillLevel = character.skills[mechanics.skill]?.level || 0;
    const checkResult = resolveSkillCheck(
      mechanics.skill,
      skillLevel,
      mechanics.modifier || 0,
      mechanics.dc
    );

    const updatedMechanics: Turn["mechanics"] & { detectedIntent?: string } = {
      type: "check",
      skill: mechanics.skill,
      dc: mechanics.dc,
      modifier: mechanics.modifier,
      rolled: checkResult.rolled,
      total: checkResult.total,
      outcome: checkResult.success ? "success" : "failure",
      detectedIntent: mechanics.detectedIntent,
    };

    // Save roll result immediately
    await supabase
      .from("waypoint_turns")
      .update({ mechanics: updatedMechanics })
      .eq("id", turnId);

    // If rollOnly, return just the roll result
    if (rollOnly) {
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

    // Continue with narration using updated mechanics
    return continueWithNarration(
      supabase,
      turnId,
      turnRow.player_action,
      character,
      world,
      recentTurns,
      updatedMechanics
    );
  }

  // Has outcome, not rollOnly - continue with narration
  return continueWithNarration(
    supabase,
    turnId,
    turnRow.player_action,
    character,
    world,
    recentTurns,
    mechanics
  );
}

/**
 * Continue turn pipeline with narration after roll is complete
 */
async function continueWithNarration(
  supabase: ReturnType<typeof createAdminClient>,
  turnId: string,
  playerAction: string,
  character: Character,
  world: WorldContext,
  recentTurns: Turn[],
  mechanics: NonNullable<Turn["mechanics"]> & { detectedIntent?: string }
) {
  const rollOutcome = {
    skill: mechanics.skill,
    success: mechanics.outcome === "success",
    total: mechanics.total!,
    dc: mechanics.dc,
  };

  // Run Orchestrator now that we have roll outcome
  const orchestratorResult = await runOrchestrator(
    playerAction,
    character,
    world,
    recentTurns,
    rollOutcome,
    mechanics.detectedIntent
  );

  // === ARBITER ===
  const arbiterResult = await runArbiter(orchestratorResult.proposals, {
    character,
    world,
    playerAction,
    rollOutcome,
  });

  // Convert approved proposals to events for applyEvents
  const approvedEvents = proposalsToEvents(arbiterResult.approved);

  // === CHRONICLER ===
  const prompt = buildTurnPrompt(
    character,
    world,
    recentTurns,
    playerAction,
    {
      skill: mechanics.skill,
      rolled: mechanics.rolled!,
      modifier: mechanics.modifier || 0,
      total: mechanics.total!,
      dc: mechanics.dc,
      outcome: mechanics.outcome!,
    },
    approvedEvents as unknown as ValidatedEvent[]
  );

  const geminiResponse = await generateTurn(prompt);

  // Safety filter on output
  const outputFilter = filterOutput(geminiResponse.narration);
  const finalNarration = outputFilter.status === "block" ? FALLBACK_NARRATION : geminiResponse.narration;

  // Apply approved events
  const { characterUpdates, worldUpdates, diffs, questChanges, relationshipChanges } =
    outputFilter.status === "block"
      ? { characterUpdates: {}, worldUpdates: {}, diffs: [] as TurnDiff[], questChanges: [], relationshipChanges: [] }
      : applyEvents(character, world, approvedEvents as unknown as ValidatedEvent[]);

  // Clean mechanics for storage (remove pendingProposals)
  const cleanMechanics: Turn["mechanics"] = {
    type: mechanics.type,
    skill: mechanics.skill,
    dc: mechanics.dc,
    modifier: mechanics.modifier,
    rolled: mechanics.rolled,
    total: mechanics.total,
    outcome: mechanics.outcome,
  };

  // Update turn with results
  const { error: updateError } = await supabase
    .from("waypoint_turns")
    .update({
      narration: finalNarration,
      diffs,
      suggested_actions: outputFilter.status === "block" ? ["Look around", "Wait"] : geminiResponse.suggested_actions,
      mechanics: cleanMechanics,
    })
    .eq("id", turnId);

  if (updateError) {
    return NextResponse.json({ error: "Failed to update turn" }, { status: 500 });
  }

  // Update state
  let enrichedWorldUpdates = worldUpdates;
  if (outputFilter.status === "allow") {
    await updateCharacterState(supabase, character.id!, characterUpdates);
    enrichedWorldUpdates = await updateWorldState(supabase, character.id!, worldUpdates);
    await updateQuestState(supabase, character.id!, questChanges);
    await updateRelationshipState(supabase, character.id!, relationshipChanges);
  }

  const response: TurnResponse = {
    turn: {
      id: turnId,
      narration: finalNarration,
      diffs,
      suggestedActions: outputFilter.status === "block" ? ["Look around", "Wait"] : geminiResponse.suggested_actions,
      mechanics: cleanMechanics,
    },
  };

  if (Object.keys(characterUpdates).length > 0) response.updatedCharacter = characterUpdates;
  if (Object.keys(enrichedWorldUpdates).length > 0) response.updatedWorld = enrichedWorldUpdates;

  return NextResponse.json(response);
}

/**
 * Complete the turn pipeline (Arbiter → Chronicler → Apply)
 */
async function completeTurnPipeline(
  supabase: ReturnType<typeof createAdminClient>,
  characterId: string,
  playerAction: string,
  character: Character,
  world: WorldContext,
  recentTurns: Turn[],
  proposals: ProposalResult[],
  rollOutcome?: { skill: string; success: boolean; total: number; dc: number }
) {
  // === ARBITER ===
  const arbiterResult = await runArbiter(proposals, {
    character,
    world,
    playerAction,
    rollOutcome,
  });

  // Convert approved proposals to events for applyEvents
  const approvedEvents = proposalsToEvents(arbiterResult.approved);

  // === CHRONICLER ===
  const prompt = buildTurnPrompt(
    character,
    world,
    recentTurns,
    playerAction,
    rollOutcome ? {
      skill: rollOutcome.skill,
      rolled: 0, // Not available in this path
      modifier: 0,
      total: rollOutcome.total,
      dc: rollOutcome.dc,
      outcome: rollOutcome.success ? "success" : "failure",
    } : undefined,
    approvedEvents as unknown as ValidatedEvent[]
  );

  const geminiResponse = await generateTurn(prompt);

  // Safety filter on output
  const outputFilter = filterOutput(geminiResponse.narration);
  const finalNarration = outputFilter.status === "block" ? FALLBACK_NARRATION : geminiResponse.narration;

  // Apply approved events
  const { characterUpdates, worldUpdates, diffs, questChanges, relationshipChanges } =
    outputFilter.status === "block"
      ? { characterUpdates: {}, worldUpdates: {}, diffs: [] as TurnDiff[], questChanges: [], relationshipChanges: [] }
      : applyEvents(character, world, approvedEvents as unknown as ValidatedEvent[]);

  // Insert turn
  const { data: turnRow, error: turnInsertError } = await supabase
    .from("waypoint_turns")
    .insert({
      character_id: characterId,
      player_action: playerAction,
      narration: finalNarration,
      diffs,
      suggested_actions: outputFilter.status === "block" ? ["Look around", "Wait"] : geminiResponse.suggested_actions,
      mechanics: null,
    })
    .select()
    .single();

  if (turnInsertError) {
    return NextResponse.json({ error: "Failed to save turn" }, { status: 500 });
  }

  // Update state
  let enrichedWorldUpdates = worldUpdates;
  if (outputFilter.status === "allow") {
    await updateCharacterState(supabase, characterId, characterUpdates);
    enrichedWorldUpdates = await updateWorldState(supabase, characterId, worldUpdates);
    await updateQuestState(supabase, characterId, questChanges);
    await updateRelationshipState(supabase, characterId, relationshipChanges);
  }

  const response: TurnResponse = {
    turn: {
      id: turnRow.id,
      narration: finalNarration,
      diffs,
      suggestedActions: outputFilter.status === "block" ? ["Look around", "Wait"] : geminiResponse.suggested_actions,
    },
  };

  if (Object.keys(characterUpdates).length > 0) response.updatedCharacter = characterUpdates;
  if (Object.keys(enrichedWorldUpdates).length > 0) response.updatedWorld = enrichedWorldUpdates;

  return NextResponse.json(response);
}

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
