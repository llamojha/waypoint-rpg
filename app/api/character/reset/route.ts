import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { dbToCharacter, dbToWorld } from "@/lib/supabase/transforms";
import { TEST_USER_ID, USE_MOCK_USER, OPENING_NARRATION, OPENING_SUGGESTED_ACTIONS } from "@/constants";

/**
 * POST /api/character/reset
 * Reset character progress while keeping identity (name, portrait, gender)
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    let userId: string;
    if (authError || !user) {
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

    // Get character
    const { data: character, error: charError } = await supabase
      .from("waypoint_characters")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (charError || !character) {
      return NextResponse.json(
        { error: "Character not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const characterId = character.id;

    // Delete related data (use admin client to bypass RLS)
    const { error: turnsError } = await adminClient.from("waypoint_turns").delete().eq("character_id", characterId);
    if (turnsError) {
      console.error("Failed to delete turns:", turnsError);
    }
    
    const { error: npcsError } = await adminClient.from("waypoint_character_npcs").delete().eq("character_id", characterId);
    if (npcsError) {
      console.error("Failed to delete character NPCs:", npcsError);
    }
    
    const { error: questsError } = await adminClient.from("waypoint_character_quests").delete().eq("character_id", characterId);
    if (questsError) {
      console.error("Failed to delete character quests:", questsError);
    }

    const { error: locationsError } = await adminClient.from("waypoint_character_locations").delete().eq("character_id", characterId);
    if (locationsError) {
      console.error("Failed to delete character locations:", locationsError);
    }

    // Reset character stats
    const { data: updatedChar, error: updateError } = await adminClient
      .from("waypoint_characters")
      .update({
        hp: 20,
        max_hp: 20,
        gold: 0,
        skills: {},
        inventory: [],
        equipment: {
          mainHand: null,
          offHand: null,
          head: null,
          chest: {
            id: "cloth-armor",
            name: "Cloth Tunic",
            type: "armor",
            slot: "chest",
            tags: ["cloth", "basic"],
            description: "Simple cloth garments. Better than nothing.",
            stats: { ac: 0, value: 1 },
          },
          arms: null,
          legs: null,
          cloak: null,
          trinket: null,
        },
        conditions: [],
        is_magic_unlocked: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", characterId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to reset character", code: "DB_ERROR" },
        { status: 500 }
      );
    }

    // Reset world state
    const { data: updatedWorld } = await adminClient
      .from("waypoint_world_state")
      .update({
        region: "Windhollow Vale",
        poi: "The Waystone",
        time_day: 1,
        time_phase: "Morning",
        weather: "Clear",
        description: "An ancient stone marker at the crossroads, said to guide lost travelers.",
        tags: [],
        nearby_poi: ["Nomante Outpost", "Windhollow Wilderness"],
        entities: ["lenna"],
        memories: [],
        updated_at: new Date().toISOString(),
      })
      .eq("character_id", characterId)
      .select()
      .single();

    // Re-unlock Lenna NPC
    const { data: lennaNpc } = await adminClient
      .from("waypoint_npcs")
      .select("id")
      .eq("name", "Lenna")
      .maybeSingle();

    if (lennaNpc) {
      await adminClient.from("waypoint_character_npcs").insert({
        character_id: characterId,
        npc_id: lennaNpc.id,
        relationship: 0,
      });
    }

    // Mark starting location as discovered
    const { data: startingLocation } = await adminClient
      .from("waypoint_locations")
      .select("id")
      .eq("name", "The Waystone")
      .maybeSingle();

    if (startingLocation) {
      await adminClient.from("waypoint_character_locations").insert({
        character_id: characterId,
        location_id: startingLocation.id,
        status: "visited",
      });
    }

    // Create opening turn
    await adminClient.from("waypoint_turns").insert({
      character_id: characterId,
      player_action: "Awaken",
      narration: OPENING_NARRATION,
      diffs: [
        { type: "world", text: "Arrived at The Waystone", value: "Windhollow Vale" },
        { type: "relationship", text: "Met Lenna", value: "Lenna" },
      ],
      suggested_actions: OPENING_SUGGESTED_ACTIONS,
      mechanics: null,
    });

    return NextResponse.json({
      character: dbToCharacter(updatedChar),
      world: updatedWorld ? dbToWorld(updatedWorld) : null,
    });
  } catch (err) {
    console.error("Unexpected error in POST /api/character/reset:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
