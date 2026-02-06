/**
 * Compression service for generating location summaries from turn history
 * Uses Gemini with temp 0.2 for factual, consistent summaries
 */

import { GoogleGenAI } from "@google/genai";
import type { Turn, TurnDiff } from "@/types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const MODEL = process.env.GEMINI_MODEL || "gemini-3-flash-preview";

export interface LocationSummary {
  location: string;
  visitNumber: number;
  turnRange: { start: number; end: number };
  summary: string;
  keyEvents: string[];
  npcsEncountered: string[];
  itemsGained: string[];
  itemsLost: string[];
  questProgress: string[];
}

interface GeminiSummaryResponse {
  summary: string;
  keyEvents: string[];
}

/**
 * Extract structured data from turn diffs before LLM call
 */
function extractFromDiffs(turns: Turn[]): {
  npcs: string[];
  itemsGained: string[];
  itemsLost: string[];
  questProgress: string[];
} {
  const npcs = new Set<string>();
  const itemsGained: string[] = [];
  const itemsLost: string[] = [];
  const questProgress: string[] = [];

  for (const turn of turns) {
    for (const diff of turn.diffs || []) {
      switch (diff.type) {
        case "relationship":
          // Extract NPC name from text like "Helga Thornwood +1"
          const npcMatch = diff.text.match(/^([^+-]+)/);
          if (npcMatch) npcs.add(npcMatch[1].trim());
          break;
        case "inventory":
          if (diff.text.startsWith("+")) {
            itemsGained.push(diff.text.slice(1).trim());
          } else if (diff.text.startsWith("-")) {
            itemsLost.push(diff.text.slice(1).trim());
          }
          break;
        case "quest":
          questProgress.push(diff.text);
          break;
      }
    }
  }

  return {
    npcs: Array.from(npcs),
    itemsGained,
    itemsLost,
    questProgress,
  };
}

/**
 * Generate a location summary from turns using Gemini
 */
export async function generateLocationSummary(
  turns: Turn[],
  location: string,
  visitNumber: number
): Promise<LocationSummary> {
  if (turns.length === 0) {
    return {
      location,
      visitNumber,
      turnRange: { start: 0, end: 0 },
      summary: "No events recorded.",
      keyEvents: [],
      npcsEncountered: [],
      itemsGained: [],
      itemsLost: [],
      questProgress: [],
    };
  }

  // Pre-extract structured data from diffs
  const extracted = extractFromDiffs(turns);

  // Build condensed turn data for LLM
  const turnsForPrompt = turns.map((t, i) => ({
    action: t.playerAction,
    outcome: t.mechanics?.outcome || "ok",
    narration: t.narration?.slice(0, 200), // Truncate for token efficiency
  }));

  const prompt = `Summarize this adventure segment in 2-3 sentences.
Preserve: key decisions, important events, character development.
Omit: combat blow-by-blow, routine exploration, failed checks.

Location: ${location}
Turns: ${JSON.stringify(turnsForPrompt)}

Output JSON with exactly these fields:
- summary: string (2-3 sentence narrative summary)
- keyEvents: string[] (3-5 important events that happened)`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });

    const parsed: GeminiSummaryResponse = JSON.parse(response.text || "{}");

    return {
      location,
      visitNumber,
      turnRange: { start: 1, end: turns.length },
      summary: parsed.summary || "Events occurred at this location.",
      keyEvents: parsed.keyEvents || [],
      npcsEncountered: extracted.npcs,
      itemsGained: extracted.itemsGained,
      itemsLost: extracted.itemsLost,
      questProgress: extracted.questProgress,
    };
  } catch (error) {
    console.error("Failed to generate location summary:", error);
    
    // Fallback: generate basic summary without LLM
    return {
      location,
      visitNumber,
      turnRange: { start: 1, end: turns.length },
      summary: `Spent time at ${location}. ${turns.length} actions taken.`,
      keyEvents: [],
      npcsEncountered: extracted.npcs,
      itemsGained: extracted.itemsGained,
      itemsLost: extracted.itemsLost,
      questProgress: extracted.questProgress,
    };
  }
}
