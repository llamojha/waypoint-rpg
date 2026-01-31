/**
 * Compression queue management
 * Handles synchronous compression on location change
 */

import { createAdminClient } from "@/lib/supabase/server";
import { generateLocationSummary } from "./summarize";
import type { Turn } from "@/types";

/**
 * Process compression synchronously for a location's turns
 * Called when player changes location
 */
export async function compressLocationTurns(
  characterId: string,
  location: string,
  turns: Turn[]
): Promise<void> {
  if (turns.length === 0) return;

  const supabase = createAdminClient();

  try {
    // Get visit number (count existing summaries for this location)
    const { count } = await supabase
      .from("waypoint_location_summaries")
      .select("*", { count: "exact", head: true })
      .eq("character_id", characterId)
      .eq("location", location);

    const visitNumber = (count || 0) + 1;

    // Generate summary
    const summary = await generateLocationSummary(turns, location, visitNumber);

    // Store summary
    await supabase.from("waypoint_location_summaries").insert({
      character_id: characterId,
      location,
      visit_number: visitNumber,
      turn_range_start: summary.turnRange.start,
      turn_range_end: summary.turnRange.end,
      summary: summary.summary,
      key_events: summary.keyEvents,
      npcs_encountered: summary.npcsEncountered,
      items_gained: summary.itemsGained,
      items_lost: summary.itemsLost,
      quest_progress: summary.questProgress,
    });
  } catch (error) {
    // Log but don't fail the turn - compression is best-effort
    console.error(`Failed to compress turns for ${location}:`, error);
  }
}

/**
 * Fetch location summaries for a character
 * Used when building prompts
 */
export async function getLocationSummaries(
  characterId: string
): Promise<Array<{
  location: string;
  visitNumber: number;
  summary: string;
  keyEvents: string[];
  npcsEncountered: string[];
}>> {
  try {
    const supabase = createAdminClient();
    
    const { data } = await supabase
      .from("waypoint_location_summaries")
      .select("location, visit_number, summary, key_events, npcs_encountered")
      .eq("character_id", characterId)
      .order("created_at", { ascending: true });

    return (data || []).map((s) => ({
      location: s.location,
      visitNumber: s.visit_number,
      summary: s.summary,
      keyEvents: (s.key_events as string[]) || [],
      npcsEncountered: (s.npcs_encountered as string[]) || [],
    }));
  } catch (error) {
    console.error("Failed to fetch location summaries:", error);
    return [];
  }
}
