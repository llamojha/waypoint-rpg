/**
 * Lorekeeper Agent
 * 
 * Fetches relevant canon data (NPCs, locations, codex entries) to enrich
 * the Chronicler's narration context.
 * 
 * Flow:
 * 1. CODE LAYER: Auto-fetch NPCs at location + location details
 * 2. LLM LAYER: Analyze action, extract keywords, search codex
 */

import { GoogleGenAI, FunctionCallingConfigMode } from "@google/genai";
import { createTool, Type } from "@/lib/gemini/tools";
import type { WorldContext, CodexEntry } from "@/types";
import { getNpcsAtLocation, getLocationDetails, getNpcVoice, getAtmosphere, loadCodexCache, type NPCPresent, type LocationDetails, type NpcVoice, type Atmosphere } from "./handlers";
import { searchByKeywords } from "./cache";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

// Tool for LLM to search codex
const SEARCH_CODEX_TOOL = createTool(
  "search_codex",
  "Search the codex for relevant lore entries based on keywords",
  {
    type: Type.OBJECT,
    properties: {
      keywords: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Keywords to search for in the codex (names, places, creatures, etc.)",
      },
      limit: {
        type: Type.NUMBER,
        description: "Maximum number of entries to return (1-5)",
      },
    },
    required: ["keywords"],
  }
);

export interface LorekeeperOutput {
  npcsPresent: NPCPresent[];
  locationDetails: LocationDetails | null;
  codexSnippets: CodexEntry[];
  npcVoices: NpcVoice[];
  atmosphere: Atmosphere | null;
}

/**
 * Build prompt for Lorekeeper LLM
 */
function buildLorekeeperPrompt(
  playerAction: string,
  world: WorldContext,
  npcsPresent: NPCPresent[],
  locationDetails: LocationDetails | null
): string {
  const npcNames = npcsPresent.map(n => n.name).join(", ") || "none";
  
  return `You are the Lorekeeper for Waypoint RPG. Your job is to identify what lore might be relevant to the current action.

## Current Scene
Location: ${world.poi} (${world.region})
NPCs present: ${npcNames}
${locationDetails ? `Location type: ${locationDetails.type}` : ""}

## Player Action
"${playerAction}"

## Instructions
Analyze the player's action and identify any keywords that might have relevant lore entries:
- Named entities (NPCs, places, factions)
- Creature types mentioned or implied
- Historical references
- Items or artifacts

If the action mentions or implies something that might have lore, call search_codex with relevant keywords.
If the action is mundane (walking, resting, simple conversation), you may skip the search.

Only search for what's actually relevant - don't search for everything.

## Success Examples

### Example 1: Action mentions a faction
Player: "I ask about the Shadow Guild"
Good output: search_codex({ keywords: ["Shadow Guild", "guild"], limit: 2 })

### Example 2: Creature encounter
Player: "I ready my weapon as the dire wolf approaches"
Good output: search_codex({ keywords: ["dire wolf", "wolves"], limit: 2 })

### Example 3: Location-specific lore
Player: "I examine the ancient ruins"
Good output: search_codex({ keywords: ["ruins", "ancient", world.poi], limit: 3 })

### Example 4: Mundane action (NO search needed)
Player: "I sit down and rest"
Good output: (no search_codex call - action is mundane)`;
}

/**
 * Run the Lorekeeper agent
 * 
 * @param playerAction - The player's action text
 * @param world - Current world context
 * @param characterId - Character ID (for future use)
 */
export async function runLorekeeper(
  playerAction: string,
  world: WorldContext,
  characterId: string
): Promise<LorekeeperOutput> {
  // Ensure codex cache is loaded
  await loadCodexCache();

  // Step 1: CODE LAYER - Auto-fetch NPCs and location details (uses region cache if available)
  const [npcsPresent, locationDetails] = await Promise.all([
    getNpcsAtLocation(world.poi, world.region),
    getLocationDetails(world.poi, world.region),
  ]);

  // Fetch NPC voices for all present NPCs (uses region cache if available)
  const npcVoices: NpcVoice[] = [];
  for (const npc of npcsPresent) {
    const voice = await getNpcVoice(npc.name, world.region);
    if (voice) npcVoices.push(voice);
  }

  // Get atmosphere based on location type, time, and weather
  const atmosphere = locationDetails
    ? getAtmosphere(locationDetails.type, world.time.phase, world.weather)
    : null;

  // Step 2: LLM LAYER - Decide what codex entries to fetch
  let codexSnippets: CodexEntry[] = [];

  try {
    const prompt = buildLorekeeperPrompt(playerAction, world, npcsPresent, locationDetails);

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        temperature: 0.1,
        tools: [{ functionDeclarations: [SEARCH_CODEX_TOOL] }],
        toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO } },
      },
    });

    const parts = response.candidates?.[0]?.content?.parts || [];

    for (const part of parts) {
      if (part.functionCall?.name === "search_codex") {
        const args = part.functionCall.args as { keywords: string[]; limit?: number };
        const limit = Math.min(args.limit || 3, 5); // Cap at 5
        const results = searchByKeywords(args.keywords, limit);
        codexSnippets.push(...results);
      }
    }
  } catch (error) {
    console.error("Lorekeeper LLM error:", error);
    // Continue without codex snippets on error
  }

  // Deduplicate codex snippets by ID
  const uniqueSnippets = Array.from(
    new Map(codexSnippets.map(s => [s.id, s])).values()
  );

  return {
    npcsPresent,
    locationDetails,
    codexSnippets: uniqueSnippets,
    npcVoices,
    atmosphere,
  };
}
