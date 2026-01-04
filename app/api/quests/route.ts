import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Quest } from "@/types";

interface CharacterQuestRow {
  id: string;
  status: string;
  progress: number;
  quest: {
    id: string;
    title: string;
    description: string;
    total_progress: number;
    leads: string[];
  } | null;
}

/**
 * GET /api/quests?character_id=xxx
 * Load quests for a character
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

    // Load character's quests with quest details
    const { data: characterQuests, error } = await supabase
      .from("waypoint_character_quests")
      .select(`
        id,
        status,
        progress,
        quest:waypoint_quests (
          id,
          title,
          description,
          total_progress,
          leads
        )
      `)
      .eq("character_id", characterId);

    if (error) {
      console.error("Error loading quests:", error);
      return NextResponse.json(
        { error: "Failed to load quests" },
        { status: 500 }
      );
    }

    // Transform to Quest type
    const quests: Quest[] = ((characterQuests || []) as unknown as CharacterQuestRow[])
      .filter((cq) => cq.quest !== null)
      .map((cq) => ({
        id: cq.quest!.id,
        title: cq.quest!.title,
        description: cq.quest!.description,
        status: cq.status as Quest["status"],
        progress: cq.progress,
        totalProgress: cq.quest!.total_progress,
        leads: cq.quest!.leads || [],
      }));

    return NextResponse.json({ quests });
  } catch (error) {
    console.error("Quest loading error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
