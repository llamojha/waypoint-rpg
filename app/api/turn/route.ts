import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { dbToCharacter, dbToWorld } from "@/lib/supabase/transforms";
import { buildTurnPrompt } from "@/lib/gemini/prompts";
import { generateTurn } from "@/lib/gemini/client";
import { validateEvents } from "@/lib/turn/validate";
import { applyEvents } from "@/lib/turn/apply";
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
  };
  updatedCharacter?: Partial<Character>;
  updatedWorld?: Partial<WorldContext>;
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
    // Parse request body
    const body = (await request.json()) as TurnRequest;
    const { characterId, playerAction } = body;

    // Validate required fields
    if (!characterId || typeof characterId !== "string") {
      return NextResponse.json(
        { error: "characterId is required" },
        { status: 400 }
      );
    }

    if (!playerAction || typeof playerAction !== "string") {
      return NextResponse.json(
        { error: "playerAction is required" },
        { status: 400 }
      );
    }

    // Create Supabase admin client (bypasses RLS for TEST_USER_ID)
    const supabase = createAdminClient();

    // Load character from waypoint_characters
    const { data: characterRow, error: characterError } = await supabase
      .from("waypoint_characters")
      .select("*")
      .eq("id", characterId)
      .single();

    if (characterError || !characterRow) {
      console.error("Failed to load character:", characterError);
      return NextResponse.json(
        { error: "Character not found" },
        { status: 404 }
      );
    }

    const character = dbToCharacter(characterRow);

    // Load world state from waypoint_world_state
    const { data: worldRow, error: worldError } = await supabase
      .from("waypoint_world_state")
      .select("*")
      .eq("character_id", characterId)
      .single();

    if (worldError || !worldRow) {
      console.error("Failed to load world state:", worldError);
      return NextResponse.json(
        { error: "World state not found" },
        { status: 404 }
      );
    }

    const world = dbToWorld(worldRow);

    // Load last 3 turns from waypoint_turns for context
    const { data: turnRows, error: turnsError } = await supabase
      .from("waypoint_turns")
      .select("*")
      .eq("character_id", characterId)
      .order("created_at", { ascending: false })
      .limit(3);

    if (turnsError) {
      console.error("Failed to load turns:", turnsError);
      // Continue without recent turns - not a fatal error
    }

    // Transform and reverse to get chronological order
    const recentTurns = (turnRows || []).map(dbToTurn).reverse();

    // Build prompt for Gemini
    const prompt = buildTurnPrompt(character, world, recentTurns, playerAction);

    // Call Gemini API
    const geminiResponse = await generateTurn(prompt);

    // Validate proposed events
    const validatedEvents = validateEvents(
      geminiResponse.proposed_events,
      character
    );

    // Apply valid events to get state updates
    const { characterUpdates, worldUpdates, diffs } = applyEvents(
      character,
      world,
      validatedEvents
    );

    // Insert turn record to waypoint_turns
    const { data: turnRow, error: turnInsertError } = await supabase
      .from("waypoint_turns")
      .insert({
        character_id: characterId,
        player_action: playerAction,
        narration: geminiResponse.narration,
        diffs: diffs,
        suggested_actions: geminiResponse.suggested_actions,
        mechanics: null, // No skill checks in this spec
      })
      .select()
      .single();

    if (turnInsertError) {
      console.error("Failed to insert turn:", turnInsertError);
      return NextResponse.json(
        { error: "Failed to save turn" },
        { status: 500 }
      );
    }

    // Update waypoint_characters with changes if any
    if (Object.keys(characterUpdates).length > 0) {
      const dbCharacterUpdates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      // Map frontend field names to database column names
      if (characterUpdates.hp !== undefined) {
        dbCharacterUpdates.hp = characterUpdates.hp;
      }
      if (characterUpdates.maxHp !== undefined) {
        dbCharacterUpdates.max_hp = characterUpdates.maxHp;
      }
      if (characterUpdates.gold !== undefined) {
        dbCharacterUpdates.gold = characterUpdates.gold;
      }
      if (characterUpdates.inventory !== undefined) {
        dbCharacterUpdates.inventory = characterUpdates.inventory;
      }
      if (characterUpdates.equipment !== undefined) {
        dbCharacterUpdates.equipment = characterUpdates.equipment;
      }
      if (characterUpdates.conditions !== undefined) {
        dbCharacterUpdates.conditions = characterUpdates.conditions;
      }
      if (characterUpdates.skills !== undefined) {
        dbCharacterUpdates.skills = characterUpdates.skills;
      }

      const { error: charUpdateError } = await supabase
        .from("waypoint_characters")
        .update(dbCharacterUpdates)
        .eq("id", characterId);

      if (charUpdateError) {
        console.error("Failed to update character:", charUpdateError);
        // Log but don't fail - turn was already saved
      }
    }

    // Update waypoint_world_state if needed
    if (Object.keys(worldUpdates).length > 0) {
      const dbWorldUpdates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      // Map frontend field names to database column names
      if (worldUpdates.region !== undefined) {
        dbWorldUpdates.region = worldUpdates.region;
      }
      if (worldUpdates.poi !== undefined) {
        dbWorldUpdates.poi = worldUpdates.poi;
      }
      if (worldUpdates.weather !== undefined) {
        dbWorldUpdates.weather = worldUpdates.weather;
      }
      if (worldUpdates.description !== undefined) {
        dbWorldUpdates.description = worldUpdates.description;
      }
      if (worldUpdates.time !== undefined) {
        if (worldUpdates.time.day !== undefined) {
          dbWorldUpdates.time_day = worldUpdates.time.day;
        }
        if (worldUpdates.time.phase !== undefined) {
          dbWorldUpdates.time_phase = worldUpdates.time.phase;
        }
      }
      if (worldUpdates.tags !== undefined) {
        dbWorldUpdates.tags = worldUpdates.tags;
      }
      if (worldUpdates.nearbyPoi !== undefined) {
        dbWorldUpdates.nearby_poi = worldUpdates.nearbyPoi;
      }
      if (worldUpdates.entities !== undefined) {
        dbWorldUpdates.entities = worldUpdates.entities;
      }
      if (worldUpdates.memory !== undefined) {
        dbWorldUpdates.memories = worldUpdates.memory;
      }

      const { error: worldUpdateError } = await supabase
        .from("waypoint_world_state")
        .update(dbWorldUpdates)
        .eq("character_id", characterId);

      if (worldUpdateError) {
        console.error("Failed to update world state:", worldUpdateError);
        // Log but don't fail - turn was already saved
      }
    }

    // Build response
    const response: TurnResponse = {
      turn: {
        id: turnRow.id,
        narration: geminiResponse.narration,
        diffs: diffs,
        suggestedActions: geminiResponse.suggested_actions,
      },
    };

    // Include updated character fields if any changes were made
    if (Object.keys(characterUpdates).length > 0) {
      response.updatedCharacter = characterUpdates;
    }

    // Include updated world fields if any changes were made
    if (Object.keys(worldUpdates).length > 0) {
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
