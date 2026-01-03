/**
 * Type transformation functions for converting between database rows and frontend types.
 * These functions handle the mapping between Supabase waypoint_* tables and TypeScript types.
 */

import type { Database } from "./database.types";
import type {
  Character,
  WorldContext,
  Item,
  Equipment,
  SkillProgression,
  Condition,
  WorldTag,
  WorldMemory,
} from "@/types";
import { INITIAL_SKILLS } from "@/constants";

// Database row types
type DbCharacter = Database["public"]["Tables"]["waypoint_characters"]["Row"];
type DbCharacterInsert =
  Database["public"]["Tables"]["waypoint_characters"]["Insert"];
type DbWorldState = Database["public"]["Tables"]["waypoint_world_state"]["Row"];
type DbWorldStateInsert =
  Database["public"]["Tables"]["waypoint_world_state"]["Insert"];

// Default equipment (all slots empty)
const DEFAULT_EQUIPMENT: Equipment = {
  mainHand: null,
  offHand: null,
  head: null,
  chest: null,
  arms: null,
  legs: null,
  cloak: null,
  trinket: null,
};

/**
 * Transform a database character row to the frontend Character type
 */
export function dbToCharacter(row: DbCharacter): Character {
  return {
    id: row.id,
    name: row.name,
    gender: row.gender || undefined,
    portraitUrl: row.portrait_url || undefined,
    hp: row.hp ?? 20,
    maxHp: row.max_hp ?? 20,
    gold: row.gold ?? 10,
    inventory: (row.inventory as Item[]) || [],
    equipment: (row.equipment as Equipment) || DEFAULT_EQUIPMENT,
    skills: (row.skills as Record<string, SkillProgression>) || {
      ...INITIAL_SKILLS,
    },
    conditions: (row.conditions as Condition[]) || [],
    isMagicUnlocked: row.is_magic_unlocked ?? false,
  };
}

/**
 * Transform a partial Character to database insert format
 */
export function characterToDb(
  char: Partial<Character>,
  userId: string
): DbCharacterInsert {
  return {
    user_id: userId,
    name: char.name || "Unnamed Hero",
    gender: char.gender || null,
    portrait_url: char.portraitUrl || null,
    hp: char.hp ?? 20,
    max_hp: char.maxHp ?? 20,
    gold: char.gold ?? 10,
    inventory: char.inventory || [],
    equipment: char.equipment || DEFAULT_EQUIPMENT,
    skills: char.skills || INITIAL_SKILLS,
    conditions: char.conditions || [],
    is_magic_unlocked: char.isMagicUnlocked ?? false,
  };
}

/**
 * Transform a database world state row to the frontend WorldContext type
 */
export function dbToWorld(row: DbWorldState): WorldContext {
  return {
    name: "Test World", // World name is constant for MVP
    region: row.region || "Eldoria",
    poi: row.poi || "The Crossroads Inn",
    time: {
      day: row.time_day ?? 1,
      phase: row.time_phase || "Morning",
    },
    weather: row.weather || "Clear",
    description:
      row.description ||
      "A well-worn tavern at the intersection of trade routes.",
    tags: (row.tags as WorldTag[]) || [],
    nearbyPoi: (row.nearby_poi as string[]) || [],
    entities: (row.entities as string[]) || [],
    memory: (row.memories as WorldMemory[]) || [],
  };
}

/**
 * Transform a partial WorldContext to database insert format
 */
export function worldToDb(
  world: Partial<WorldContext>,
  characterId: string
): DbWorldStateInsert {
  return {
    character_id: characterId,
    region: world.region || "Eldoria",
    poi: world.poi || "The Crossroads Inn",
    time_day: world.time?.day ?? 1,
    time_phase: world.time?.phase || "Morning",
    weather: world.weather || "Clear",
    description:
      world.description ||
      "A well-worn tavern at the intersection of trade routes.",
    tags: world.tags || [],
    nearby_poi: world.nearbyPoi || [
      "Market Square",
      "City Gates",
      "Temple District",
    ],
    entities: world.entities || [],
    memories: world.memory || [],
  };
}
