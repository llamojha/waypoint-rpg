/**
 * Lorekeeper database handlers
 * Fetches NPCs, locations, and codex entries
 * 
 * Uses region cache when available for faster lookups.
 */

import { createAdminClient } from "@/lib/supabase/server";
import type { CodexEntry } from "@/types";
import { initCache, isCacheLoaded, getAllEntries } from "./cache";
import {
  isCacheLoadedForRegion,
  getCachedNpcsAtLocation,
  getCachedLocation,
  getCachedNpc,
  getCachedCodexByKeywords,
} from "@/lib/cache/region";

export interface NPCPresent {
  id: string;
  name: string;
  role: string;
  personality: string[];
  dialogueHints: string[];
}

export interface LocationDetails {
  name: string;
  type: string;
  region: string;
  description: string;
}

export interface NpcVoice {
  name: string;
  personality: string[];
  dialogueHints: string[];
  speechPattern?: string;
}

export interface Atmosphere {
  mood: string;
  descriptors: string[];
  ambiance: string;
}

/**
 * Load codex entries into cache (called once on first request)
 */
export async function loadCodexCache(): Promise<void> {
  if (isCacheLoaded()) return;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("waypoint_codex_entries")
    .select("id, title, category, text, status, tags, image_url");

  if (error) {
    console.error("Failed to load codex cache:", error);
    return;
  }

  const entries: CodexEntry[] = (data || []).map(row => ({
    id: row.id,
    title: row.title,
    category: row.category as CodexEntry["category"],
    text: row.text || "",
    status: (row.status || "canon") as "canon" | "rumor",
    tags: (row.tags as string[]) || [],
    imageUrl: row.image_url || undefined,
  }));

  initCache(entries);
}

/**
 * Get all codex entries (ensures cache is loaded)
 */
export async function getCodexEntries(): Promise<CodexEntry[]> {
  await loadCodexCache();
  return getAllEntries();
}

/**
 * Get NPCs present at a location
 * Uses region cache if available, falls back to DB query
 */
export async function getNpcsAtLocation(location: string, region?: string): Promise<NPCPresent[]> {
  // Try region cache first
  if (region && isCacheLoadedForRegion(region)) {
    const cached = getCachedNpcsAtLocation(location);
    return cached.map(npc => ({
      id: npc.id,
      name: npc.name,
      role: npc.role,
      personality: npc.personality,
      dialogueHints: npc.dialogueHints,
    }));
  }

  // Fallback to DB query
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from("waypoint_npcs")
    .select("id, name, role, personality, dialogue_hints")
    .ilike("location", location);

  if (error) {
    console.error("Failed to fetch NPCs at location:", error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    role: row.role || "",
    personality: (row.personality as string[]) || [],
    dialogueHints: (row.dialogue_hints as string[]) || [],
  }));
}

/**
 * Get location details
 * Uses region cache if available, falls back to DB query
 */
export async function getLocationDetails(locationName: string, region?: string): Promise<LocationDetails | null> {
  // Try region cache first
  if (region && isCacheLoadedForRegion(region)) {
    const cached = getCachedLocation(locationName);
    if (cached) {
      return {
        name: cached.name,
        type: cached.type,
        region: cached.region,
        description: cached.description,
      };
    }
  }

  // Fallback to DB query
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("waypoint_locations")
    .select("name, type, region, description")
    .ilike("name", locationName)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    name: data.name,
    type: data.type || "",
    region: data.region || "",
    description: data.description || "",
  };
}


/**
 * Get NPC voice data for narration
 * Uses region cache if available, falls back to DB query
 */
export async function getNpcVoice(npcName: string, region?: string): Promise<NpcVoice | null> {
  let personality: string[] = [];
  let dialogueHints: string[] = [];
  let name = npcName;

  // Try region cache first
  if (region && isCacheLoadedForRegion(region)) {
    const cached = getCachedNpc(npcName);
    if (cached) {
      name = cached.name;
      personality = cached.personality;
      dialogueHints = cached.dialogueHints;
    }
  } else {
    // Fallback to DB query
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("waypoint_npcs")
      .select("name, personality, dialogue_hints")
      .ilike("name", npcName)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    name = data.name;
    personality = (data.personality as string[]) || [];
    dialogueHints = (data.dialogue_hints as string[]) || [];
  }

  // Derive speech pattern from personality
  let speechPattern: string | undefined;
  if (personality.includes("formal")) speechPattern = "speaks formally";
  else if (personality.includes("gruff")) speechPattern = "speaks curtly";
  else if (personality.includes("cunning")) speechPattern = "speaks in riddles";
  else if (personality.includes("friendly")) speechPattern = "speaks warmly";

  return {
    name,
    personality,
    dialogueHints,
    speechPattern,
  };
}

/**
 * Get atmosphere for a location based on time and weather
 */
export function getAtmosphere(
  locationType: string,
  timePhase: string,
  weather: string
): Atmosphere {
  // Mood based on time
  const timeMoods: Record<string, string> = {
    Morning: "fresh",
    Afternoon: "bustling",
    Evening: "winding down",
    Night: "quiet",
  };

  // Descriptors based on location type
  const locationDescriptors: Record<string, string[]> = {
    tavern: ["smoky", "warm", "crowded"],
    market: ["noisy", "colorful", "busy"],
    temple: ["serene", "echoing", "sacred"],
    forest: ["rustling", "dappled light", "earthy"],
    dock: ["salty air", "creaking wood", "seagulls"],
    castle: ["imposing", "stone walls", "torchlit"],
    street: ["cobblestone", "passersby", "urban"],
  };

  // Weather effects
  const weatherEffects: Record<string, string> = {
    Clear: "clear skies",
    Cloudy: "overcast",
    Rainy: "rain pattering",
    Stormy: "thunder rumbling",
    Foggy: "mist swirling",
  };

  const mood = timeMoods[timePhase] || "calm";
  const descriptors = locationDescriptors[locationType.toLowerCase()] || ["atmospheric"];
  const ambiance = weatherEffects[weather] || "mild weather";

  return { mood, descriptors, ambiance };
}
