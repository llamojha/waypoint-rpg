import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createAdminClient } from "@/lib/supabase/server";
import { dbToCharacter, dbToWorld } from "@/lib/supabase/transforms";
import { buildDmChatPrompt, type DmChatContext } from "@/lib/prompts/dm-chat";
import { SKILL_TREE } from "@/constants";
import type { Turn, Quest, NPC } from "@/types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

interface DmChatRequest {
  characterId: string;
  question: string;
}

interface CharacterQuestRow {
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

interface CharacterNpcRow {
  relationship: number;
  notes: string[] | null;
  history: string[] | null;
  npc: {
    id: string;
    name: string;
    role: string | null;
    location: string | null;
  } | null;
}

/**
 * POST /api/dm-chat
 * Answer player questions without consuming a turn
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DmChatRequest;
    const { characterId, question } = body;

    if (!characterId || !question?.trim()) {
      return NextResponse.json(
        { error: "characterId and question are required" },
        { status: 400 }
      );
    }

    // Validate question length
    if (question.length > 500) {
      return NextResponse.json(
        { error: "Question too long (max 500 characters)" },
        { status: 400 }
      );
    }

    // Use admin client for data queries (read-only, auth handled at frontend)
    const supabase = createAdminClient();

    // Load character
    const { data: characterRow, error: charError } = await supabase
      .from("waypoint_characters")
      .select("*")
      .eq("id", characterId)
      .single();

    if (charError || !characterRow) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    const character = dbToCharacter(characterRow);

    // Load world state
    const { data: worldRow } = await supabase
      .from("waypoint_world_state")
      .select("*")
      .eq("character_id", characterId)
      .single();

    const world = worldRow ? dbToWorld(worldRow) : null;

    // Load all turns (full history)
    const { data: turnRows } = await supabase
      .from("waypoint_turns")
      .select("id, player_action, narration, created_at")
      .eq("character_id", characterId)
      .not("narration", "is", null)
      .order("created_at", { ascending: true });

    const turns: Turn[] = (turnRows || []).map((t) => ({
      id: t.id,
      timestamp: t.created_at ? new Date(t.created_at).getTime() : Date.now(),
      playerAction: t.player_action,
      narration: t.narration || "",
      isStreaming: false,
      suggestedActions: [],
      diffs: [],
    }));

    // Load quests
    const { data: questRows } = await supabase
      .from("waypoint_character_quests")
      .select(`
        status, progress,
        quest:waypoint_quests (id, title, description, total_progress, leads)
      `)
      .eq("character_id", characterId);

    const quests: Quest[] = ((questRows || []) as unknown as CharacterQuestRow[])
      .filter((q) => q.quest !== null)
      .map((q) => ({
        id: q.quest!.id,
        title: q.quest!.title,
        description: q.quest!.description,
        status: q.status as Quest["status"],
        progress: q.progress,
        totalProgress: q.quest!.total_progress,
        leads: q.quest!.leads || [],
      }));

    // Load NPCs
    const { data: npcRows } = await supabase
      .from("waypoint_character_npcs")
      .select(`
        relationship, notes, history,
        npc:waypoint_npcs (id, name, role, location)
      `)
      .eq("character_id", characterId);

    const npcs: NPC[] = ((npcRows || []) as unknown as CharacterNpcRow[])
      .filter((n) => n.npc !== null)
      .map((n) => ({
        id: n.npc!.id,
        name: n.npc!.name,
        role: n.npc!.role || "",
        relationship: n.relationship,
        location: n.npc!.location || "",
        notes: n.notes || [],
        history: n.history || [],
      }));

    // Load codex entries
    const { data: codexRows } = await supabase
      .from("waypoint_codex_entries")
      .select("title, category, text");

    const codexEntries = (codexRows || []).map((c) => ({
      title: c.title,
      category: c.category,
      text: c.text || "",
    }));

    // Load locations
    const { data: locationRows } = await supabase
      .from("waypoint_locations")
      .select("name, type, region, description");

    const locations = (locationRows || []).map((l) => ({
      name: l.name,
      type: l.type || "",
      region: l.region || "",
      description: l.description || "",
    }));

    // Build context
    const context: DmChatContext = {
      character,
      world: world || {
        name: "Unknown",
        region: "Unknown",
        poi: "Unknown",
        time: { day: 1, phase: "Morning" },
        weather: "Clear",
        description: "",
        tags: [],
        nearbyPoi: [],
        entities: [],
        memory: [],
        activeCombat: null,
      },
      turns,
      quests,
      npcs,
      codexEntries,
      locations,
      skillTree: SKILL_TREE as unknown as Record<string, unknown>,
    };

    // Build prompt and call Gemini
    const prompt = buildDmChatPrompt(context) + `\n\n## PLAYER'S QUESTION\n${question}`;

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    });

    const answer = response.text?.trim() || "I'm not sure how to answer that. Could you rephrase your question?";

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("DM Chat error:", error);
    return NextResponse.json(
      { error: "Failed to process question" },
      { status: 500 }
    );
  }
}
