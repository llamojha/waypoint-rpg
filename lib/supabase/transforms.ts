/**
 * Type transformation functions for converting between database rows and frontend types.
 * These functions handle the mapping between Supabase waypoint_* tables and TypeScript types.
 */

import type { Database } from "./database.types";
import type { Json } from "./types/json";
import type {
  Character,
  WorldContext,
  Item,
  Equipment,
  SkillProgression,
  Condition,
  WorldTag,
  WorldMemory,
  ActiveCombat,
} from "@/types";
import { INITIAL_SKILLS, DEMO_WORLD, DEMO_CHARACTER } from "@/constants";

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

function coerceArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function coerceObject<T extends object>(value: unknown, fallback: T): T {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }

  return value as T;
}

function toJson(value: unknown): Json {
  return value as Json;
}

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
    inventory: coerceArray<Item>(row.inventory),
    equipment: coerceObject<Equipment>(row.equipment, DEFAULT_EQUIPMENT),
    skills: coerceObject<Record<string, SkillProgression>>(
      row.skills,
      INITIAL_SKILLS
    ),
    conditions: coerceArray<Condition>(row.conditions),
    isMagicUnlocked: row.is_magic_unlocked ?? false,
  };
}

/**
 * Transform a partial Character to database insert format
 * Uses demo starting state: cloth armor only, 0 gold, empty inventory
 */
export function characterToDb(
  char: Partial<Character>,
  userId: string
): DbCharacterInsert {
  // Use demo character defaults (cloth armor, 0 gold, empty inventory)
  const demoEquipment = DEMO_CHARACTER.equipment || DEFAULT_EQUIPMENT;
  
  return {
    user_id: userId,
    name: char.name || "Unnamed Hero",
    gender: char.gender || null,
    portrait_url: char.portraitUrl || null,
    hp: char.hp ?? 20,
    max_hp: char.maxHp ?? 20,
    gold: char.gold ?? 0, // Demo: start with 0 gold
    inventory: toJson(char.inventory || []), // Demo: empty inventory
    equipment: toJson(char.equipment || demoEquipment), // Demo: cloth armor only
    skills: toJson(char.skills || INITIAL_SKILLS),
    conditions: toJson(char.conditions || []),
    is_magic_unlocked: char.isMagicUnlocked ?? false,
  };
}

/**
 * Transform a database world state row to the frontend WorldContext type
 */
export function dbToWorld(row: DbWorldState): WorldContext {
  return {
    name: "Eldoria",
    region: row.region || DEMO_WORLD.region,
    poi: row.poi || DEMO_WORLD.poi,
    time: {
      day: row.time_day ?? 1,
      phase: row.time_phase || "Morning",
    },
    weather: row.weather || "Clear",
    description: row.description || DEMO_WORLD.description,
    tags: coerceArray<WorldTag>(row.tags),
    nearbyPoi: coerceArray<string>(row.nearby_poi),
    entities: coerceArray<string>(row.entities),
    memory: coerceArray<WorldMemory>(row.memories),
    activeCombat: coerceActiveCombat(row.active_combat),
  };
}

/**
 * Coerce active_combat JSON to ActiveCombat type
 */
function coerceActiveCombat(value: unknown): ActiveCombat | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const obj = value as Record<string, unknown>;
  if (!Array.isArray(obj.enemies)) {
    return null;
  }
  return {
    enemies: obj.enemies as ActiveCombat["enemies"],
    round: typeof obj.round === "number" ? obj.round : 1,
  };
}

/**
 * Transform a partial WorldContext to database insert format
 * Uses demo world defaults: Windhollow Vale, The Waystone, Lenna present
 */
export function worldToDb(
  world: Partial<WorldContext>,
  characterId: string
): DbWorldStateInsert {
  return {
    character_id: characterId,
    region: world.region || DEMO_WORLD.region,
    poi: world.poi || DEMO_WORLD.poi,
    time_day: world.time?.day ?? 1,
    time_phase: world.time?.phase || "Morning",
    weather: world.weather || "Clear",
    description: world.description || DEMO_WORLD.description,
    tags: toJson(world.tags || DEMO_WORLD.tags),
    nearby_poi: toJson(world.nearbyPoi || DEMO_WORLD.nearbyPoi),
    entities: toJson(world.entities || DEMO_WORLD.entities), // Lenna present
    memories: toJson(world.memory || []),
    active_combat: toJson(world.activeCombat || null),
  };
}
