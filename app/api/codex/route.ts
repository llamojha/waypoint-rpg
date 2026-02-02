import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/codex
 * Load all codex entries (global, shared across all players)
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

    // Transform to match CodexEntry type
    const codexEntries = (entries || []).map((e) => ({
      id: e.id,
      title: e.title,
      category: e.category,
      text: e.text,
      status: e.status,
      tags: e.tags || [],
      imageUrl: e.image_url,
    }));

    return NextResponse.json({ entries: codexEntries });
  } catch (error) {
    console.error("Codex loading error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
