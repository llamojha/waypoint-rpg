import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  dbToCharacter,
  characterToDb,
  worldToDb,
  dbToWorld,
} from "@/lib/supabase/transforms";
import { TEST_USER_ID, USE_MOCK_USER, OPENING_NARRATION, OPENING_SUGGESTED_ACTIONS } from "@/constants";
import type { Character } from "@/types";

/**
 * GET /api/character
 * Retrieve character data for the authenticated user
 */
export async function GET() {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    let userId: string;

    if (authError || !user) {
      // Fall back to mock user if enabled
      if (USE_MOCK_USER) {
        userId = TEST_USER_ID;
      } else {
        return NextResponse.json(
          { error: "Authentication required", code: "AUTH_REQUIRED" },
          { status: 401 }
        );
      }
    } else {
      userId = user.id;
    }

    const { data, error } = await supabase
      .from("waypoint_characters")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching character:", error);
      return NextResponse.json(
        { error: "Failed to fetch character", code: "DB_ERROR" },
        { status: 500 }
      );
    }

    // Return null if no character exists (not an error)
    if (!data) {
      return NextResponse.json({ character: null });
    }

    const character = dbToCharacter(data);
    return NextResponse.json({ character });
  } catch (err) {
    console.error("Unexpected error in GET /api/character:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/character
 * Create a new character for the authenticated user
 * Body: { name, gender?, portraitUrl? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json(
        { error: "Character name is required", code: "MISSING_NAME" },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    let userId: string;

    if (authError || !user) {
      // Fall back to mock user if enabled
      if (USE_MOCK_USER) {
        userId = TEST_USER_ID;
      } else {
        return NextResponse.json(
          { error: "Authentication required", code: "AUTH_REQUIRED" },
          { status: 401 }
        );
      }
    } else {
      userId = user.id;
    }

    // Check if user already has a character
    const { data: existingChar } = await supabase
      .from("waypoint_characters")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingChar) {
      return NextResponse.json(
        { error: "User already has a character", code: "CHARACTER_EXISTS" },
        { status: 409 }
      );
    }

    // Prepare character data for insertion
    const charData: Partial<Character> = {
      name: body.name,
      gender: body.gender || undefined,
      portraitUrl: body.portraitUrl || undefined,
    };

    const dbCharData = characterToDb(charData, userId);

    // Insert character
    const { data: newChar, error: charError } = await supabase
      .from("waypoint_characters")
      .insert(dbCharData)
      .select()
      .single();

    if (charError || !newChar) {
      console.error("Error creating character:", charError);
      return NextResponse.json(
        { error: "Failed to create character", code: "DB_ERROR" },
        { status: 500 }
      );
    }

    // Create initial world state for the character
    const worldData = worldToDb({}, newChar.id);

    const { data: newWorld, error: worldError } = await supabase
      .from("waypoint_world_state")
      .insert(worldData)
      .select()
      .single();

    if (worldError || !newWorld) {
      console.error("Error creating world state:", worldError);
      // Character was created but world state failed - still return character
      // but log the error for debugging
      return NextResponse.json({
        character: dbToCharacter(newChar),
        world: null,
        warning: "World state creation failed",
      });
    }

    // Create opening turn with narration
    const { error: turnError } = await supabase
      .from("waypoint_turns")
      .insert({
        character_id: newChar.id,
        player_action: "Awaken",
        narration: OPENING_NARRATION,
        diffs: [{ type: "world", text: "Arrived at The Waystone", value: "Windhollow Vale" }],
        suggested_actions: OPENING_SUGGESTED_ACTIONS,
        mechanics: null,
      });

    if (turnError) {
      console.error("Error creating opening turn:", turnError);
      // Non-fatal - character and world were created
    }

    // Unlock Lenna NPC (she's in the opening narration)
    const { data: lennaNpc } = await supabase
      .from("waypoint_npcs")
      .select("id")
      .eq("name", "Lenna")
      .maybeSingle();

    if (lennaNpc) {
      const { error: npcError } = await supabase
        .from("waypoint_character_npcs")
        .insert({
          character_id: newChar.id,
          npc_id: lennaNpc.id,
          relationship: 0,
        });

      if (npcError) {
        console.error("Error unlocking Lenna NPC:", npcError);
        // Non-fatal
      }
    }

    return NextResponse.json({
      character: dbToCharacter(newChar),
      world: dbToWorld(newWorld),
    });
  } catch (err) {
    console.error("Unexpected error in POST /api/character:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/character
 * Update an existing character
 * Body: { id, ...updates }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.id || typeof body.id !== "string") {
      return NextResponse.json(
        { error: "Character id is required", code: "MISSING_ID" },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      if (!USE_MOCK_USER) {
        return NextResponse.json(
          { error: "Authentication required", code: "AUTH_REQUIRED" },
          { status: 401 }
        );
      }
    }

    // Build update object from allowed fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Map frontend field names to database column names
    const fieldMappings: Record<string, string> = {
      name: "name",
      gender: "gender",
      portraitUrl: "portrait_url",
      hp: "hp",
      maxHp: "max_hp",
      gold: "gold",
      inventory: "inventory",
      equipment: "equipment",
      skills: "skills",
      conditions: "conditions",
      isMagicUnlocked: "is_magic_unlocked",
    };

    // Only include fields that are present in the request body
    for (const [frontendKey, dbKey] of Object.entries(fieldMappings)) {
      if (body[frontendKey] !== undefined) {
        updateData[dbKey] = body[frontendKey];
      }
    }

    // Perform the update
    const { data: updatedChar, error } = await supabase
      .from("waypoint_characters")
      .update(updateData)
      .eq("id", body.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating character:", error);
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Character not found", code: "NOT_FOUND" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Failed to update character", code: "DB_ERROR" },
        { status: 500 }
      );
    }

    if (!updatedChar) {
      return NextResponse.json(
        { error: "Character not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({ character: dbToCharacter(updatedChar) });
  } catch (err) {
    console.error("Unexpected error in PATCH /api/character:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
