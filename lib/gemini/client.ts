import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Gemini API client for turn generation
 * Uses gemini-2.5-flash-lite model with JSON response format (configurable via GEMINI_MODEL env var)
 */

// Initialize the Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Response types from Gemini
export interface ProposedEvent {
  type:
    | "stat_change"
    | "inventory_add"
    | "inventory_remove"
    | "world_update"
    | "relationship_change";
  stat?: string;
  delta?: number;
  item?: {
    name: string;
    type: "weapon" | "armor" | "consumable" | "quest" | "trinket" | "misc";
    description?: string;
  };
  itemName?: string;
  field?: string;
  value?: unknown;
  npc?: string;
  reason?: string;
}

export interface GeminiTurnResponse {
  narration: string;
  proposed_events: ProposedEvent[];
  suggested_actions: string[];
}

// Default fallback response when Gemini fails
const FALLBACK_RESPONSE: GeminiTurnResponse = {
  narration:
    "The world seems to shimmer for a moment, then settles. Nothing happens.",
  proposed_events: [],
  suggested_actions: ["Try again", "Look around", "Wait"],
};

// Default model if not specified in environment
const DEFAULT_MODEL = "gemini-2.5-flash-lite";

/**
 * Generate a turn response from Gemini
 * @param prompt - The full prompt including system instructions and context
 * @param temperature - Generation temperature (default 0.7)
 * @returns Parsed GeminiTurnResponse or fallback on error
 */
export async function generateTurn(
  prompt: string,
  temperature: number = 0.7
): Promise<GeminiTurnResponse> {
  const modelName = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature,
      responseMimeType: "application/json",
    },
  });

  let lastError: Error | null = null;

  // Try up to 2 times (initial + 1 retry)
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      // Parse and validate the response
      const parsed = parseGeminiResponse(text);
      return parsed;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(
        `Gemini API error (attempt ${attempt + 1}/2):`,
        lastError.message
      );

      // Wait briefly before retry
      if (attempt < 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  // Log final failure and return fallback
  console.error("Gemini API failed after 2 attempts:", lastError?.message);
  return FALLBACK_RESPONSE;
}

/**
 * Parse and validate Gemini response
 * Handles malformed JSON gracefully
 */
function parseGeminiResponse(text: string): GeminiTurnResponse {
  try {
    const parsed = JSON.parse(text);

    // Validate required fields
    if (!parsed.narration || typeof parsed.narration !== "string") {
      throw new Error("Missing or invalid narration field");
    }

    // Ensure arrays exist with defaults
    return {
      narration: parsed.narration,
      proposed_events: Array.isArray(parsed.proposed_events)
        ? parsed.proposed_events
        : [],
      suggested_actions: Array.isArray(parsed.suggested_actions)
        ? parsed.suggested_actions
        : [],
    };
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);

    // Try to extract narration from raw text if JSON fails
    if (text && text.length > 0) {
      return {
        narration: text.slice(0, 1000),
        proposed_events: [],
        suggested_actions: [],
      };
    }

    throw error;
  }
}
