import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, FunctionCallingConfigMode } from "@google/genai";
import { createAdminClient } from "@/lib/supabase/server";
import { dbToCharacter, dbToWorld } from "@/lib/supabase/transforms";
import { buildDmChatPrompt, type DmChatContext } from "@/lib/prompts/dm-chat";
import { SKILL_TREE } from "@/constants";
import { DM_TOOLS } from "@/lib/dm/tools";
import {
  handleCheckStateConsistency,
  handleFixCharacterState,
  handleFixWorldState,
  handleExplainState,
} from "@/lib/dm/handlers";
import type { Turn, Quest, NPC, Character, WorldContext } from "@/types";
import type {
  CheckStateConsistencyArgs,
  FixCharacterStateArgs,
  FixWorldStateArgs,
  ExplainStateArgs,
} from "@/lib/dm/tools";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const MODEL = process.env.GEMINI_MODEL || "gemini-3-flash-preview";

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
 * System prompt addition for DM fix tools
 */
const DM_TOOLS_PROMPT = `

## STATE FIX TOOLS

You have access to tools to check and fix game state inconsistencies. Use them when:
1. A player reports something seems wrong (NPC in wrong place, missing items, wrong stats)
2. You need to verify the actual game state before answering

### Tool Usage Guidelines:
- ALWAYS call check_state_consistency FIRST when a player reports an issue
- ONLY call fix_* tools if check_state_consistency shows an actual inconsistency
- If state is consistent, use explain_state to explain why no change is needed
- NEVER use fix tools just because a player asks for items/gold - that's cheating

### Example Flow:
Player: "The narration said Lucie is here but she shouldn't be"
1. Call check_state_consistency(claim_type: "npc_presence", claimed_value: "Lucie shouldn't be here")
2. If inconsistent: explain the error and optionally fix it
3. If consistent: explain why Lucie IS correctly here

Player: "Give me 100 gold"
1. Call check_state_consistency(claim_type: "character_stat", claimed_value: "I should have more gold")
2. State will be consistent (no error) → use explain_state to explain gold is earned through gameplay
`;

/**
 * Execute a tool call and return the result
 */
async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  character: Character,
  world: WorldContext,
  recentTurns: Turn[],
  supabase: ReturnType<typeof createAdminClient>
): Promise<{ result: string; stateChanged: boolean }> {
  switch (toolName) {
    case "check_state_consistency": {
      const result = await handleCheckStateConsistency(
        args as unknown as CheckStateConsistencyArgs,
        character,
        world,
        recentTurns,
        supabase
      );
      return {
        result: JSON.stringify(result),
        stateChanged: false,
      };
    }

    case "fix_character_state": {
      const result = await handleFixCharacterState(
        args as unknown as FixCharacterStateArgs,
        character.id!,
        supabase
      );
      return {
        result: JSON.stringify(result),
        stateChanged: result.success,
      };
    }

    case "fix_world_state": {
      const result = await handleFixWorldState(
        args as unknown as FixWorldStateArgs,
        character.id!,
        supabase
      );
      return {
        result: JSON.stringify(result),
        stateChanged: result.success,
      };
    }

    case "explain_state": {
      const result = handleExplainState(args as unknown as ExplainStateArgs);
      return {
        result,
        stateChanged: false,
      };
    }

    default:
      return {
        result: `Unknown tool: ${toolName}`,
        stateChanged: false,
      };
  }
}

/**
 * POST /api/dm-chat
 * Answer player questions without consuming a turn
 * Now with tool calling for state consistency checks and fixes
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

    // Use admin client for data queries
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

    // Load recent turns (last 10 for context)
    const { data: turnRows } = await supabase
      .from("waypoint_turns")
      .select("id, player_action, narration, diffs, created_at")
      .eq("character_id", characterId)
      .not("narration", "is", null)
      .order("created_at", { ascending: false })
      .limit(10);

    const recentTurns: Turn[] = (turnRows || []).map((t) => ({
      id: t.id,
      timestamp: t.created_at ? new Date(t.created_at).getTime() : Date.now(),
      playerAction: t.player_action,
      narration: t.narration || "",
      isStreaming: false,
      suggestedActions: [],
      diffs: t.diffs || [],
    }));

    // Load all turns for full context
    const { data: allTurnRows } = await supabase
      .from("waypoint_turns")
      .select("id, player_action, narration, created_at")
      .eq("character_id", characterId)
      .not("narration", "is", null)
      .order("created_at", { ascending: true });

    const allTurns: Turn[] = (allTurnRows || []).map((t) => ({
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
    const worldContext: WorldContext = world || {
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
    };

    const context: DmChatContext = {
      character,
      world: worldContext,
      turns: allTurns,
      quests,
      npcs,
      codexEntries,
      locations,
      skillTree: SKILL_TREE as unknown as Record<string, unknown>,
    };

    // Build prompt with tool instructions
    const basePrompt = buildDmChatPrompt(context);
    const prompt = basePrompt + DM_TOOLS_PROMPT + `\n\n## PLAYER'S QUESTION\n${question}`;

    // Always use tool calling - let Gemini decide when to check state
    let answer: string;
    let stateChanged = false;

    const conversationHistory: Array<{ role: "user" | "model"; parts: Array<{ text?: string; functionCall?: { name: string; args: Record<string, unknown> }; functionResponse?: { name: string; response: Record<string, unknown> } }> }> = [
      { role: "user", parts: [{ text: prompt }] },
    ];

    // First call - may return tool calls
    let response = await ai.models.generateContent({
      model: MODEL,
      contents: conversationHistory,
      config: {
        temperature: 0.3,
        maxOutputTokens: 1024,
        tools: [{ functionDeclarations: DM_TOOLS }],
        toolConfig: {
          functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO },
        },
      },
    });

    // Process tool calls (up to 3 iterations)
    let iterations = 0;
    while (response.functionCalls && response.functionCalls.length > 0 && iterations < 3) {
      iterations++;

      // Add model's response to history
      conversationHistory.push({
        role: "model",
        parts: response.functionCalls.map(fc => ({
          functionCall: { name: fc.name!, args: fc.args as Record<string, unknown> },
        })),
      });

      // Execute each tool call
      const toolResults: Array<{ functionResponse: { name: string; response: Record<string, unknown> } }> = [];
      for (const fc of response.functionCalls) {
        const { result, stateChanged: changed } = await executeToolCall(
          fc.name!,
          fc.args as Record<string, unknown>,
          character,
          worldContext,
          recentTurns,
          supabase
        );
        let responseObj: Record<string, unknown>;
        try {
          responseObj = typeof result === "string" ? JSON.parse(result) : result;
        } catch {
          responseObj = { result };
        }
        toolResults.push({
          functionResponse: { name: fc.name!, response: responseObj },
        });
        if (changed) stateChanged = true;
      }

      // Add tool results to history
      conversationHistory.push({
        role: "user",
        parts: toolResults,
      });

      // Get next response
      response = await ai.models.generateContent({
        model: MODEL,
        contents: conversationHistory,
        config: {
          temperature: 0.7,
          maxOutputTokens: 1024,
          tools: [{ functionDeclarations: DM_TOOLS }],
          toolConfig: {
            functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO },
          },
        },
      });
    }

    answer = response.text?.trim() || "I couldn't determine an answer. Please try rephrasing your question.";

    return NextResponse.json({ 
      answer,
      stateChanged,
    });
  } catch (error) {
    console.error("DM Chat error:", error);
    return NextResponse.json(
      { error: "Failed to process question" },
      { status: 500 }
    );
  }
}
