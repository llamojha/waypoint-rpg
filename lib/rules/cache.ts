/**
 * Rules Cache
 * Caches rule definitions from database with TTL to avoid repeated queries
 */

import { createAdminClient } from "@/lib/supabase/server";
import type {
  QuestGoalRule,
  SkillCheckRule,
  NoRollActionRule,
  RelationshipRule,
  LocationConnection,
  LootTable,
} from "./types";

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// In-memory cache
const cache: {
  questGoals?: CacheEntry<QuestGoalRule[]>;
  skillChecks?: CacheEntry<SkillCheckRule[]>;
  noRollActions?: CacheEntry<NoRollActionRule[]>;
  relationships?: CacheEntry<RelationshipRule[]>;
  locationConnections?: CacheEntry<LocationConnection[]>;
  lootTables?: CacheEntry<LootTable[]>;
} = {};

function isExpired<T>(entry: CacheEntry<T> | undefined): boolean {
  if (!entry) return true;
  return Date.now() - entry.timestamp > CACHE_TTL;
}

/**
 * Get quest goal rules (cached)
 */
export async function getQuestGoalRules(): Promise<QuestGoalRule[]> {
  if (!isExpired(cache.questGoals)) {
    return cache.questGoals!.data;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("waypoint_rules_quest_goals")
    .select("*");

  if (error) {
    console.error("Failed to load quest goal rules:", error);
    return [];
  }

  const rules: QuestGoalRule[] = (data || []).map((row) => ({
    id: row.id,
    goalType: row.goal_type,
    requiredEventType: row.required_event_type,
    validationPattern: row.validation_pattern,
  }));

  cache.questGoals = { data: rules, timestamp: Date.now() };
  return rules;
}

/**
 * Get skill check rules (cached)
 */
export async function getSkillCheckRules(): Promise<SkillCheckRule[]> {
  if (!isExpired(cache.skillChecks)) {
    return cache.skillChecks!.data;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("waypoint_rules_skill_checks")
    .select("*");

  if (error) {
    console.error("Failed to load skill check rules:", error);
    return [];
  }

  const rules: SkillCheckRule[] = (data || []).map((row) => ({
    id: row.id,
    pattern: row.pattern,
    skill: row.skill,
    dcMin: row.dc_min,
    dcMax: row.dc_max,
    requiresRoll: row.requires_roll,
    contextModifiers: row.context_modifiers,
  }));

  cache.skillChecks = { data: rules, timestamp: Date.now() };
  return rules;
}

/**
 * Get no-roll action rules (cached)
 */
export async function getNoRollActionRules(): Promise<NoRollActionRule[]> {
  if (!isExpired(cache.noRollActions)) {
    return cache.noRollActions!.data;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("waypoint_rules_no_roll_actions")
    .select("*");

  if (error) {
    console.error("Failed to load no-roll action rules:", error);
    return [];
  }

  const rules: NoRollActionRule[] = (data || []).map((row) => ({
    id: row.id,
    pattern: row.pattern,
    reason: row.reason,
  }));

  cache.noRollActions = { data: rules, timestamp: Date.now() };
  return rules;
}

/**
 * Get relationship rules (cached)
 */
export async function getRelationshipRules(): Promise<RelationshipRule[]> {
  if (!isExpired(cache.relationships)) {
    return cache.relationships!.data;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("waypoint_rules_relationships")
    .select("*");

  if (error) {
    console.error("Failed to load relationship rules:", error);
    return [];
  }

  const rules: RelationshipRule[] = (data || []).map((row) => ({
    id: row.id,
    interactionType: row.interaction_type,
    deltaMin: row.delta_min,
    deltaMax: row.delta_max,
    keywords: row.keywords || [],
  }));

  cache.relationships = { data: rules, timestamp: Date.now() };
  return rules;
}

/**
 * Get location connection rules (cached)
 */
export async function getLocationConnectionRules(): Promise<LocationConnection[]> {
  if (!isExpired(cache.locationConnections)) {
    return cache.locationConnections!.data;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("waypoint_rules_location_connections")
    .select("*");

  if (error) {
    console.error("Failed to load location connection rules:", error);
    return [];
  }

  const rules: LocationConnection[] = (data || []).map((row) => ({
    id: row.id,
    fromLocation: row.from_location,
    toLocation: row.to_location,
    requirements: row.requirements,
    travelTime: row.travel_time,
  }));

  cache.locationConnections = { data: rules, timestamp: Date.now() };
  return rules;
}

/**
 * Get loot table rules (cached)
 */
export async function getLootTableRules(): Promise<LootTable[]> {
  if (!isExpired(cache.lootTables)) {
    return cache.lootTables!.data;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("waypoint_rules_loot_tables")
    .select("*");

  if (error) {
    console.error("Failed to load loot table rules:", error);
    return [];
  }

  const rules: LootTable[] = (data || []).map((row) => ({
    id: row.id,
    locationType: row.location_type,
    itemPool: row.item_pool || [],
    rarityWeights: row.rarity_weights || { common: 0.7, uncommon: 0.25, rare: 0.05, legendary: 0 },
    actionWhitelist: row.action_whitelist || [],
  }));

  cache.lootTables = { data: rules, timestamp: Date.now() };
  return rules;
}

/**
 * Clear all caches (useful for testing or after rule updates)
 */
export function clearRulesCache(): void {
  cache.questGoals = undefined;
  cache.skillChecks = undefined;
  cache.noRollActions = undefined;
  cache.relationships = undefined;
  cache.locationConnections = undefined;
  cache.lootTables = undefined;
}

/**
 * Preload all rules into cache
 */
export async function preloadRulesCache(): Promise<void> {
  await Promise.all([
    getQuestGoalRules(),
    getSkillCheckRules(),
    getNoRollActionRules(),
    getRelationshipRules(),
    getLocationConnectionRules(),
    getLootTableRules(),
  ]);
}
