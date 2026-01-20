/**
 * Region Cache
 * 
 * Caches all region-scoped data (locations, NPCs, codex, connections, loot tables)
 * to avoid repeated DB queries during gameplay within a region.
 * 
 * Cache is loaded on region entry and cleared on region change.
 */

import { createAdminClient } from "@/lib/supabase/server";

// === TYPES ===

export interface CachedLocation {
  id: string;
  name: string;
  type: string;
  region: string;
  description: string;
  artUrl?: string;
}

export interface CachedNpc {
  id: string;
  name: string;
  role: string;
  location: string;
  personality: string[];
  dialogueHints: string[];
  portraitUrl?: string;
}

export interface CachedCodexEntry {
  id: string;
  title: string;
  category: string;
  text: string;
  status: "canon" | "rumor";
  tags: string[];
}

export interface CachedLocationConnection {
  fromLocation: string;
  toLocation: string;
  travelTime?: number;
  requirements?: string;
}

export interface CachedLootTable {
  id: string;
  locationType: string;
  itemName: string;
  itemType: string;
  rarity: string;
  dropChance: number;
}

export interface RegionCacheData {
  region: string;
  locations: CachedLocation[];
  npcs: CachedNpc[];
  codexEntries: CachedCodexEntry[];
  locationConnections: CachedLocationConnection[];
  lootTables: CachedLootTable[];
  loadedAt: number;
}

// === CACHE STATE ===

let currentCache: RegionCacheData | null = null;

// === PUBLIC API ===

/**
 * Get the current cached region (or null if not loaded)
 */
export function getCachedRegion(): string | null {
  return currentCache?.region || null;
}

/**
 * Check if cache is loaded for a specific region
 */
export function isCacheLoadedForRegion(region: string): boolean {
  return currentCache?.region === region;
}

/**
 * Load cache for a region (clears previous cache)
 */
export async function loadRegionCache(region: string): Promise<RegionCacheData> {
  // Clear existing cache
  currentCache = null;

  const supabase = createAdminClient();

  // Load all data in parallel
  const [
    locationsResult,
    npcsResult,
    codexResult,
    connectionsResult,
    lootResult,
  ] = await Promise.all([
    // Locations in this region
    supabase
      .from("waypoint_locations")
      .select("id, name, type, region, description, art_url")
      .eq("region", region),

    // NPCs in locations within this region
    supabase
      .from("waypoint_npcs")
      .select("id, name, role, location, personality, dialogue_hints, portrait_url")
      .in("location", 
        // Subquery: get location names in this region
        (await supabase
          .from("waypoint_locations")
          .select("name")
          .eq("region", region)
        ).data?.map(l => l.name) || []
      ),

    // Codex entries tagged with this region
    supabase
      .from("waypoint_codex_entries")
      .select("id, title, category, text, status, tags")
      .contains("tags", [region.toLowerCase()]),

    // Location connections within this region
    supabase
      .from("waypoint_rules_location_connections")
      .select("from_location, to_location, travel_time, requirements")
      .or(`from_location.in.(${await getLocationNamesForRegion(region)}),to_location.in.(${await getLocationNamesForRegion(region)})`),

    // Loot tables (by location type, not region-specific but useful)
    supabase
      .from("waypoint_rules_loot_tables")
      .select("id, location_type, item_name, item_type, rarity, drop_chance"),
  ]);

  // Transform results
  const locations: CachedLocation[] = (locationsResult.data || []).map(row => ({
    id: row.id,
    name: row.name,
    type: row.type || "unknown",
    region: row.region || region,
    description: row.description || "",
    artUrl: row.art_url || undefined,
  }));

  const npcs: CachedNpc[] = (npcsResult.data || []).map(row => ({
    id: row.id,
    name: row.name,
    role: row.role || "",
    location: row.location || "",
    personality: Array.isArray(row.personality) ? row.personality : [],
    dialogueHints: Array.isArray(row.dialogue_hints) ? row.dialogue_hints : [],
    portraitUrl: row.portrait_url || undefined,
  }));

  const codexEntries: CachedCodexEntry[] = (codexResult.data || []).map(row => ({
    id: row.id,
    title: row.title,
    category: row.category,
    text: row.text || "",
    status: row.status as "canon" | "rumor",
    tags: Array.isArray(row.tags) ? row.tags : [],
  }));

  const locationConnections: CachedLocationConnection[] = (connectionsResult.data || []).map(row => ({
    fromLocation: row.from_location,
    toLocation: row.to_location,
    travelTime: row.travel_time || undefined,
    requirements: row.requirements || undefined,
  }));

  const lootTables: CachedLootTable[] = (lootResult.data || []).map(row => ({
    id: row.id,
    locationType: row.location_type,
    itemName: row.item_name,
    itemType: row.item_type,
    rarity: row.rarity,
    dropChance: row.drop_chance,
  }));

  // Store in cache
  currentCache = {
    region,
    locations,
    npcs,
    codexEntries,
    locationConnections,
    lootTables,
    loadedAt: Date.now(),
  };

  return currentCache;
}

/**
 * Clear the cache
 */
export function clearRegionCache(): void {
  currentCache = null;
}

// === CACHE ACCESSORS ===

/**
 * Get all locations in the cached region
 */
export function getCachedLocations(): CachedLocation[] {
  return currentCache?.locations || [];
}

/**
 * Get a specific location by name
 */
export function getCachedLocation(name: string): CachedLocation | undefined {
  return currentCache?.locations.find(
    l => l.name.toLowerCase() === name.toLowerCase()
  );
}

/**
 * Get all NPCs at a specific location
 */
export function getCachedNpcsAtLocation(location: string): CachedNpc[] {
  return (currentCache?.npcs || []).filter(
    npc => npc.location.toLowerCase() === location.toLowerCase()
  );
}

/**
 * Get a specific NPC by name
 */
export function getCachedNpc(name: string): CachedNpc | undefined {
  return currentCache?.npcs.find(
    npc => npc.name.toLowerCase() === name.toLowerCase()
  );
}

/**
 * Get all NPCs in the cached region
 */
export function getCachedNpcs(): CachedNpc[] {
  return currentCache?.npcs || [];
}

/**
 * Get codex entries matching keywords
 */
export function getCachedCodexByKeywords(keywords: string[], limit: number = 5): CachedCodexEntry[] {
  if (!currentCache) return [];

  const keywordsLower = keywords.map(k => k.toLowerCase());

  return currentCache.codexEntries
    .filter(entry => {
      const titleLower = entry.title.toLowerCase();
      const textLower = entry.text.toLowerCase();
      const tagsLower = entry.tags.map(t => t.toLowerCase());

      return keywordsLower.some(
        kw => titleLower.includes(kw) || textLower.includes(kw) || tagsLower.some(t => t.includes(kw))
      );
    })
    .slice(0, limit);
}

/**
 * Get valid travel destinations from a location
 */
export function getCachedConnections(fromLocation: string): string[] {
  if (!currentCache) return [];

  return currentCache.locationConnections
    .filter(c => c.fromLocation.toLowerCase() === fromLocation.toLowerCase())
    .map(c => c.toLocation);
}

/**
 * Check if travel between two locations is valid
 */
export function isValidTravel(from: string, to: string): boolean {
  if (!currentCache) return false;

  return currentCache.locationConnections.some(
    c => c.fromLocation.toLowerCase() === from.toLowerCase() &&
         c.toLocation.toLowerCase() === to.toLowerCase()
  );
}

/**
 * Get loot table for a location type
 */
export function getCachedLootTable(locationType: string): CachedLootTable[] {
  return (currentCache?.lootTables || []).filter(
    lt => lt.locationType.toLowerCase() === locationType.toLowerCase()
  );
}

/**
 * Get all location names in the cached region
 */
export function getCachedLocationNames(): string[] {
  return (currentCache?.locations || []).map(l => l.name);
}

// === HELPERS ===

async function getLocationNamesForRegion(region: string): Promise<string> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("waypoint_locations")
    .select("name")
    .eq("region", region);

  const names = (data || []).map(l => `'${l.name}'`);
  return names.join(",") || "''";
}
