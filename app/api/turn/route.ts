import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { dbToCharacter, dbToWorld } from "@/lib/supabase/transforms";
import { buildTurnPrompt, RollOutcome } from "@/lib/gemini/prompts";
import { generateTurn } from "@/lib/gemini/client";
import { validateEvents } from "@/lib/turn/validate";
import { applyEvents } from "@/lib/turn/apply";
import { detectIntent } from "@/lib/mechanics/detect";
import { calculateTotalModifier } from "@/lib/mechanics/modifiers";
import { resolveCheck } from "@/lib/mechanics/checks";
import { filterInput, filterOutput, FALLBACK_NARRATION } from "@/lib/safety/sentinel";
import type { Turn, TurnDiff, Character, WorldContext } from "@/types";

/**
 * Test user ID for development (skip auth for now)
 * This will be replaced with real auth in spec 1.2
 */
const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Request body interface
 */
interface TurnRequest {
  characterId: string;
  playerAction: string;
  roll?: boolean; // If true, resolve pending skill check
  turnId?: string; // Required when roll=true
}

/**
 * Response interface
 */
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
  pendingRoll?: boolean; // True if waiting for user to roll
}

/**
 * Transform database turn row to frontend Turn type
 */
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

/**
 * GET /api/turn?character_id=xxx
 * Load turns for a character
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const characterId = searchParams.get("character_id");

    if (!characterId) {
      return NextResponse.json(
        { error: "character_id is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Load turns for character (most recent first, then reverse for chronological order)
    const { data: turnRows, error } = await supabase
      .from("waypoint_turns")
      .select("*")
      .eq("character_id", characterId)
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) {
      console.error("Error loading turns:", error);
      return NextResponse.json(
        { error: "Failed to load turns" },
        { status: 500 }
      );
    }

    const turns = (turnRows || []).map(dbToTurn);

    return NextResponse.json({ turns });
  } catch (error) {
    console.error("Turn loading error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/turn
 * Process a player turn with Gemini AI
 *
 * Requirements:
 * - 1.1: Accept player action and current game state
 * - 1.2: Call Gemini API with combined prompt
 * - 1.3: Parse LLM response for narration and state changes
 * - 1.4: Validate proposed state changes
 * - 1.5: Save turn to waypoint_turns table
 * - 1.6: Update character state in waypoint_characters
 * - 1.7: Return narration and diffs to client
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TurnRequest;
    const { characterId, playerAction, roll, turnId } = body;

    if (!characterId || typeof characterId !== "string") {
      return NextResponse.json(
        { error: "characterId is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Load character
    const { data: characterRow, error: characterError } = await supabase
      .from("waypoint_characters")
      .select("*")
      .eq("id", characterId)
      .single();

    if (characterError || !characterRow) {
      return NextResponse.json(
        { error: "Character not found" },
        { status: 404 }
      );
    }

    const character = dbToCharacter(characterRow);

    // Load world state
    const { data: worldRow, error: worldError } = await supabase
      .from("waypoint_world_state")
      .select("*")
      .eq("character_id", characterId)
      .single();

    if (worldError || !worldRow) {
      return NextResponse.json(
        { error: "World state not found" },
        { status: 404 }
      );
    }

    const world = dbToWorld(worldRow);

    // Load recent turns for context
    const { data: turnRows } = await supabase
      .from("waypoint_turns")
      .select("*")
      .eq("character_id", characterId)
      .order("created_at", { ascending: false })
      .limit(3);

    const recentTurns = (turnRows || []).map(dbToTurn).reverse();

    // ROLL RESOLUTION: Handle pending skill check
    if (roll && turnId) {
      return handleRollResolution(
        supabase,
        turnId,
        character,
        world,
        recentTurns
      );
    }

    // NEW TURN: Validate playerAction
    if (!playerAction || typeof playerAction !== "string") {
      return NextResponse.json(
        { error: "playerAction is required" },
        { status: 400 }
      );
    }

    // Safety filter on input
    const inputFilter = filterInput(playerAction);
    if (inputFilter.status === "block") {
      return NextResponse.json(
        { error: inputFilter.output },
        { status: 400 }
      );
    }

    // Detect intent and mechanics
    const intent = await detectIntent(playerAction, character, world);

    // If action requires a roll, create pending turn
    if (intent.requires_roll && intent.dc) {
      const skillLevel = character.skills[intent.primary_skill]?.level || 0;
      const modifier = calculateTotalModifier(skillLevel, intent.bonus);

      const mechanics: Turn["mechanics"] = {
        type: "check",
        skill: intent.primary_skill,
        dc: intent.dc,
        modifier,
      };

      // Insert pending turn (no narration yet)
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
        return NextResponse.json(
          { error: "Failed to save turn" },
          { status: 500 }
        );
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

    // No roll needed - generate narration directly
    const prompt = buildTurnPrompt(character, world, recentTurns, playerAction);
    const geminiResponse = await generateTurn(prompt);

    // Safety filter on output
    const outputFilter = filterOutput(geminiResponse.narration);
    const finalNarration = outputFilter.status === "block" 
      ? FALLBACK_NARRATION 
      : geminiResponse.narration;

    const validatedEvents = outputFilter.status === "block" 
      ? [] 
      : validateEvents(geminiResponse.proposed_events, character);
    const { characterUpdates, worldUpdates, diffs, questChanges, relationshipChanges } = outputFilter.status === "block"
      ? { characterUpdates: {}, worldUpdates: {}, diffs: [] as TurnDiff[], questChanges: [], relationshipChanges: [] }
      : applyEvents(character, world, validatedEvents);

    // Insert turn
    const { data: turnRow, error: turnInsertError } = await supabase
      .from("waypoint_turns")
      .insert({
        character_id: characterId,
        player_action: playerAction,
        narration: finalNarration,
        diffs,
        suggested_actions: outputFilter.status === "block" 
          ? ["Look around", "Wait"] 
          : geminiResponse.suggested_actions,
        mechanics: null,
      })
      .select()
      .single();

    if (turnInsertError) {
      return NextResponse.json(
        { error: "Failed to save turn" },
        { status: 500 }
      );
    }

    // Update character state (only if not filtered)
    if (outputFilter.status === "allow") {
      await updateCharacterState(supabase, characterId, characterUpdates);
      await updateWorldState(supabase, characterId, worldUpdates);
      await updateQuestState(supabase, characterId, questChanges);
      await updateRelationshipState(supabase, characterId, relationshipChanges);
    }

    const response: TurnResponse = {
      turn: {
        id: turnRow.id,
        narration: finalNarration,
        diffs,
        suggestedActions: outputFilter.status === "block" 
          ? ["Look around", "Wait"] 
          : geminiResponse.suggested_actions,
      },
    };

    if (outputFilter.status === "allow" && Object.keys(characterUpdates).length > 0) {
      response.updatedCharacter = characterUpdates;
    }
    if (outputFilter.status === "allow" && Object.keys(worldUpdates).length > 0) {
      response.updatedWorld = worldUpdates;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Turn processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Handle roll resolution for pending skill check
 */
async function handleRollResolution(
  supabase: ReturnType<typeof createAdminClient>,
  turnId: string,
  character: Character,
  world: WorldContext,
  recentTurns: Turn[]
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

  const mechanics = turnRow.mechanics as Turn["mechanics"];
  if (!mechanics || mechanics.outcome) {
    return NextResponse.json(
      { error: "Turn already resolved" },
      { status: 400 }
    );
  }

  // Resolve the check
  const checkResult = resolveCheck(mechanics.dc, mechanics.modifier || 0);

  const updatedMechanics: Turn["mechanics"] = {
    ...mechanics,
    rolled: checkResult.rolled,
    outcome: checkResult.outcome,
  };

  // Build roll outcome for prompt
  const rollOutcome: RollOutcome = {
    skill: mechanics.skill,
    rolled: checkResult.rolled,
    modifier: mechanics.modifier || 0,
    total: checkResult.total,
    dc: mechanics.dc,
    outcome: checkResult.outcome,
  };

  // Generate narration with roll outcome
  const prompt = buildTurnPrompt(
    character,
    world,
    recentTurns,
    turnRow.player_action,
    rollOutcome
  );
  const geminiResponse = await generateTurn(prompt);

  const validatedEvents = validateEvents(
    geminiResponse.proposed_events,
    character
  );
  const { characterUpdates, worldUpdates, diffs, questChanges, relationshipChanges } = applyEvents(
    character,
    world,
    validatedEvents
  );

  // Update turn with results
  const { error: updateError } = await supabase
    .from("waypoint_turns")
    .update({
      narration: geminiResponse.narration,
      diffs,
      suggested_actions: geminiResponse.suggested_actions,
      mechanics: updatedMechanics,
    })
    .eq("id", turnId);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update turn" },
      { status: 500 }
    );
  }

  // Update character and world state
  await updateCharacterState(supabase, character.id!, characterUpdates);
  await updateWorldState(supabase, character.id!, worldUpdates);
  await updateQuestState(supabase, character.id!, questChanges);
  await updateRelationshipState(supabase, character.id!, relationshipChanges);

  const response: TurnResponse = {
    turn: {
      id: turnId,
      narration: geminiResponse.narration,
      diffs,
      suggestedActions: geminiResponse.suggested_actions,
      mechanics: updatedMechanics,
    },
  };

  if (Object.keys(characterUpdates).length > 0) {
    response.updatedCharacter = characterUpdates;
  }
  if (Object.keys(worldUpdates).length > 0) {
    response.updatedWorld = worldUpdates;
  }

  return NextResponse.json(response);
}

/**
 * Update character state in database
 */
async function updateCharacterState(
  supabase: ReturnType<typeof createAdminClient>,
  characterId: string,
  updates: Partial<Character>
) {
  if (Object.keys(updates).length === 0) return;

  const dbUpdates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.hp !== undefined) dbUpdates.hp = updates.hp;
  if (updates.maxHp !== undefined) dbUpdates.max_hp = updates.maxHp;
  if (updates.gold !== undefined) dbUpdates.gold = updates.gold;
  if (updates.inventory !== undefined) dbUpdates.inventory = updates.inventory;
  if (updates.equipment !== undefined) dbUpdates.equipment = updates.equipment;
  if (updates.conditions !== undefined) dbUpdates.conditions = updates.conditions;
  if (updates.skills !== undefined) dbUpdates.skills = updates.skills;

  await supabase
    .from("waypoint_characters")
    .update(dbUpdates)
    .eq("id", characterId);
}

/**
 * Update world state in database
 */
async function updateWorldState(
  supabase: ReturnType<typeof createAdminClient>,
  characterId: string,
  updates: Partial<WorldContext>
) {
  if (Object.keys(updates).length === 0) return;

  const dbUpdates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

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

  await supabase
    .from("waypoint_world_state")
    .update(dbUpdates)
    .eq("character_id", characterId);
}


/**
 * Update quest state in database
 */
async function updateQuestState(
  supabase: ReturnType<typeof createAdminClient>,
  characterId: string,
  questChanges: Array<{ type: "start" | "progress"; questId: string; questTitle?: string; progress?: number; reason: string }>
) {
  if (questChanges.length === 0) return;

  for (const change of questChanges) {
    if (change.type === "start") {
      // Look up quest by title (case-insensitive) to get the actual quest ID
      const { data: quest } = await supabase
        .from("waypoint_quests")
        .select("id")
        .ilike("title", change.questTitle || change.questId)
        .maybeSingle();

      if (quest) {
        // Check if already started
        const { data: existing } = await supabase
          .from("waypoint_character_quests")
          .select("id")
          .eq("character_id", characterId)
          .eq("quest_id", quest.id)
          .maybeSingle();

        if (!existing) {
          await supabase
            .from("waypoint_character_quests")
            .insert({
              character_id: characterId,
              quest_id: quest.id,
              status: "active",
              progress: 0,
            });
        }
      }
    } else if (change.type === "progress") {
      // Look up quest by title to get the actual quest ID
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
          .update({
            progress: newProgress,
            status: isComplete ? "completed" : "active",
          })
          .eq("character_id", characterId)
          .eq("quest_id", quest.id);
      }
    }
  }
}

/**
 * Update NPC relationship state in database
 */
async function updateRelationshipState(
  supabase: ReturnType<typeof createAdminClient>,
  characterId: string,
  relationshipChanges: Array<{ npc: string; delta: number; reason: string }>
) {
  if (relationshipChanges.length === 0) return;

  for (const change of relationshipChanges) {
    // Look up NPC by name
    const { data: npc } = await supabase
      .from("waypoint_npcs")
      .select("id")
      .ilike("name", change.npc)
      .maybeSingle();

    if (npc) {
      // Check if relationship exists
      const { data: existing } = await supabase
        .from("waypoint_character_npcs")
        .select("id, relationship")
        .eq("character_id", characterId)
        .eq("npc_id", npc.id)
        .maybeSingle();

      if (existing) {
        // Update existing relationship (clamped to -5 to +5)
        const newRelationship = Math.max(-5, Math.min(5, existing.relationship + change.delta));
        await supabase
          .from("waypoint_character_npcs")
          .update({ relationship: newRelationship })
          .eq("id", existing.id);
      } else {
        // Create new relationship
        const newRelationship = Math.max(-5, Math.min(5, change.delta));
        await supabase
          .from("waypoint_character_npcs")
          .insert({
            character_id: characterId,
            npc_id: npc.id,
            relationship: newRelationship,
          });
      }
    }
  }
}
