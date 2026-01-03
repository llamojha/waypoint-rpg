import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { dbToWorld } from "@/lib/supabase/transforms";

/**
 * GET /api/world
 * Retrieve world state for a character
 * Query params: character_id (required)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const characterId = searchParams.get("character_id");

    if (!characterId) {
      return NextResponse.json(
        {
          error: "character_id query parameter is required",
          code: "MISSING_CHARACTER_ID",
        },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS (for TEST_USER_ID operations)
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("waypoint_world_state")
      .select("*")
      .eq("character_id", characterId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching world state:", error);
      return NextResponse.json(
        { error: "Failed to fetch world state", code: "DB_ERROR" },
        { status: 500 }
      );
    }

    // Return null if no world state exists (not an error)
    if (!data) {
      return NextResponse.json({ world: null });
    }

    const world = dbToWorld(data);
    return NextResponse.json({ world });
  } catch (err) {
    console.error("Unexpected error in GET /api/world:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/world
 * Update world state for a character
 * Body: { character_id, ...updates }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.character_id || typeof body.character_id !== "string") {
      return NextResponse.json(
        { error: "character_id is required", code: "MISSING_CHARACTER_ID" },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS (for TEST_USER_ID operations)
    const supabase = createAdminClient();

    // Build update object from allowed fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Map frontend field names to database column names
    const fieldMappings: Record<string, string> = {
      region: "region",
      poi: "poi",
      weather: "weather",
      description: "description",
      tags: "tags",
      nearbyPoi: "nearby_poi",
      entities: "entities",
      memory: "memories",
    };

    // Handle nested time object
    if (body.time) {
      if (body.time.day !== undefined) {
        updateData["time_day"] = body.time.day;
      }
      if (body.time.phase !== undefined) {
        updateData["time_phase"] = body.time.phase;
      }
    }

    // Only include fields that are present in the request body
    for (const [frontendKey, dbKey] of Object.entries(fieldMappings)) {
      if (body[frontendKey] !== undefined) {
        updateData[dbKey] = body[frontendKey];
      }
    }

    // Perform the update
    const { data: updatedWorld, error } = await supabase
      .from("waypoint_world_state")
      .update(updateData)
      .eq("character_id", body.character_id)
      .select()
      .single();

    if (error) {
      console.error("Error updating world state:", error);
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "World state not found", code: "NOT_FOUND" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Failed to update world state", code: "DB_ERROR" },
        { status: 500 }
      );
    }

    if (!updatedWorld) {
      return NextResponse.json(
        { error: "World state not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({ world: dbToWorld(updatedWorld) });
  } catch (err) {
    console.error("Unexpected error in PATCH /api/world:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
