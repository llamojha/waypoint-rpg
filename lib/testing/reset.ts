/**
 * Journey Reset
 * 
 * Functions to reset a test character's journey to starting state.
 */

import { createAdminClient } from "@/lib/supabase/server";
import { characterToDb, worldToDb, dbToCharacter, dbToWorld } from "@/lib/supabase/transforms";
import { TEST_CONFIG } from "./config";
import type { Character, WorldContext } from "@/types";

interface ResetResult {
  characterId: string;
  character: Character;
  world: WorldContext;
}

/**
 * Reset a user's journey by deleting existing character and creating fresh one.
 * Returns the new character ID and starting state.
 */
export async function resetJourney(userId: string): Promise<ResetResult> {
  const supabase = createAdminClient();

  // 1. Find existing character for this user
  const { data: existingChar } = await supabase
    .from("waypoint_characters")
    .select("id")
    .eq("user_id", userId)
    .single();

  // 2. Delete existing data if character exists
  if (existingChar) {
    const charId = existingChar.id;

    // Delete in order (foreign key constraints)
    await supabase.from("waypoint_turns").delete().eq("character_id", charId);
    await supabase.from("waypoint_character_npcs").delete().eq("character_id", charId);
    await supabase.from("waypoint_character_quests").delete().eq("character_id", charId);
    await supabase.from("waypoint_character_locations").delete().eq("character_id", charId);
    await supabase.from("waypoint_character_news_read").delete().eq("character_id", charId);
    await supabase.from("waypoint_world_state").delete().eq("character_id", charId);
    await supabase.from("waypoint_characters").delete().eq("id", charId);
  }

  // 3. Create fresh character
  const charInsert = characterToDb(
    { name: TEST_CONFIG.characterName, gender: TEST_CONFIG.characterGender },
    userId
  );

  const { data: newChar, error: charError } = await supabase
    .from("waypoint_characters")
    .insert(charInsert)
    .select()
    .single();

  if (charError || !newChar) {
    throw new Error(`Failed to create test character: ${charError?.message}`);
  }

  // 4. Create fresh world state
  const worldInsert = worldToDb({}, newChar.id);

  const { data: newWorld, error: worldError } = await supabase
    .from("waypoint_world_state")
    .insert(worldInsert)
    .select()
    .single();

  if (worldError || !newWorld) {
    throw new Error(`Failed to create world state: ${worldError?.message}`);
  }

  return {
    characterId: newChar.id,
    character: dbToCharacter(newChar),
    world: dbToWorld(newWorld),
  };
}
