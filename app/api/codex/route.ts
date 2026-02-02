import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/codex
 * Load all codex entries and NPCs (global, shared across all players)
 * Enriches faction entries with related NPCs
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: entries, error } = await supabase
      .from("waypoint_codex_entries")
      .select("*")
      .order("category")
      .order("title");

    if (error) {
      console.error("Error loading codex:", error);
      return NextResponse.json(
        { error: "Failed to load codex" },
        { status: 500 }
      );
    }

    // Fetch all NPCs for People tab and faction enrichment
    const { data: allNpcs } = await supabase
      .from("waypoint_npcs")
      .select("id, name, role, location, faction, portrait_url, personality")
      .order("name");

    // Group NPCs by faction for enrichment
    const npcsByFaction = new Map<string, Array<{ name: string; role: string; portraitUrl: string | null }>>();
    for (const npc of allNpcs || []) {
      if (!npc.faction) continue;
      if (!npcsByFaction.has(npc.faction)) {
        npcsByFaction.set(npc.faction, []);
      }
      npcsByFaction.get(npc.faction)!.push({
        name: npc.name,
        role: npc.role,
        portraitUrl: npc.portrait_url,
      });
    }

    // Transform to match CodexEntry type, enriching factions with NPCs
    const codexEntries = (entries || []).map((e) => ({
      id: e.id,
      title: e.title,
      category: e.category,
      text: e.text,
      status: e.status,
      tags: e.tags || [],
      imageUrl: e.image_url,
      relatedNpcs: e.category === "Factions" ? npcsByFaction.get(e.title) || [] : undefined,
    }));

    // Transform NPCs for People tab
    const npcs = (allNpcs || []).map((npc) => ({
      id: npc.id,
      name: npc.name,
      role: npc.role,
      location: npc.location,
      portraitUrl: npc.portrait_url,
      personality: npc.personality || [],
    }));

    return NextResponse.json({ entries: codexEntries, npcs });
  } catch (error) {
    console.error("Codex loading error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
