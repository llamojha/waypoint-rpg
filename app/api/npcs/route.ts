import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { NPC } from "@/types";

interface CharacterNpcRow {
  id: string;
  relationship: number;
  notes: string[] | null;
  history: string[] | null;
  npc: {
    id: string;
    name: string;
    role: string | null;
    location: string | null;
    portrait_url: string | null;
  } | null;
}

/**
 * GET /api/npcs?character_id=xxx
 * Load NPCs with relationships for a character
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const characterId = searchParams.get("character_id");

    if (!characterId) {
      return NextResponse.json(
        { error: "character_id is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Load character's NPC relationships with NPC details
    const { data: characterNpcs, error } = await supabase
      .from("waypoint_character_npcs")
      .select(`
        id,
        relationship,
        notes,
        history,
        npc:waypoint_npcs (
          id,
          name,
          role,
          location,
          portrait_url
        )
      `)
      .eq("character_id", characterId);

    if (error) {
      console.error("Error loading NPCs:", error);
      return NextResponse.json(
        { error: "Failed to load NPCs" },
        { status: 500 }
      );
    }

    // Transform to NPC type
    const npcs: NPC[] = ((characterNpcs || []) as unknown as CharacterNpcRow[])
      .filter((cn) => cn.npc !== null)
      .map((cn) => ({
        id: cn.npc!.id,
        name: cn.npc!.name,
        role: cn.npc!.role || "",
        relationship: cn.relationship,
        location: cn.npc!.location || "",
        notes: cn.notes || [],
        history: cn.history || [],
        portraitUrl: cn.npc!.portrait_url || undefined,
      }));

    return NextResponse.json({ npcs });
  } catch (error) {
    console.error("NPC loading error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
