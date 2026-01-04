import { GoogleGenAI } from "@google/genai";
import type { ProposedEvent } from "@/lib/turn/validate";

/**
 * Streaming Gemini client for turn generation
 * Yields text chunks as they're generated, then returns metadata
 */

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const DEFAULT_MODEL = "gemini-2.5-flash-lite";

export interface StreamMetadata {
  proposed_events: ProposedEvent[];
  suggested_actions: string[];
}

const FALLBACK_METADATA: StreamMetadata = {
  proposed_events: [],
  suggested_actions: ["Look around", "Wait"],
};

/**
 * Stream turn generation from Gemini
 * Yields narration text chunks, returns metadata at end
 */
export async function* generateTurnStream(
  prompt: string,
  temperature: number = 0.7
): AsyncGenerator<string, StreamMetadata> {
  const modelName = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  // Track yielded length per-call (closure, not module-level)
  let lastYieldedLength = 0;

  /**
   * Extract new narration text from partial JSON
   */
  function extractNarrationChunk(partialJson: string): string | null {
    // Look for narration field in partial JSON
    const narrationMatch = partialJson.match(/"narration"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (narrationMatch) {
      const fullNarration = narrationMatch[1]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");

      if (fullNarration.length > lastYieldedLength) {
        const newChunk = fullNarration.slice(lastYieldedLength);
        lastYieldedLength = fullNarration.length;
        return newChunk;
      }
    }

    // Try partial match for incomplete narration
    const partialMatch = partialJson.match(/"narration"\s*:\s*"((?:[^"\\]|\\.)*)/);
    if (partialMatch && !narrationMatch) {
      const partialNarration = partialMatch[1]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");

      if (partialNarration.length > lastYieldedLength) {
        const newChunk = partialNarration.slice(lastYieldedLength);
        lastYieldedLength = partialNarration.length;
        return newChunk;
      }
    }

    return null;
  }

  try {
    const response = await ai.models.generateContentStream({
      model: modelName,
      contents: prompt,
      config: {
        temperature,
        responseMimeType: "application/json",
      },
    });

    let fullText = "";
    let yieldedAny = false;

    for await (const chunk of response) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        const narrationChunk = extractNarrationChunk(fullText);
        if (narrationChunk) {
          yieldedAny = true;
          yield narrationChunk;
        }
      }
    }

    // If nothing was yielded, provide fallback narration
    if (!yieldedAny) {
      yield "The moment passes without incident. Perhaps a different approach would serve you better.";
    }

    // Parse final response for metadata
    return parseStreamResponse(fullText);
  } catch (error) {
    console.error("Gemini streaming error:", error);
    yield "The world shimmers for a moment...";
    return FALLBACK_METADATA;
  }
}

/**
 * Parse complete response for metadata
 */
function parseStreamResponse(text: string): StreamMetadata {
  try {
    const parsed = JSON.parse(text);
    return {
      proposed_events: Array.isArray(parsed.proposed_events)
        ? parsed.proposed_events
        : [],
      suggested_actions: Array.isArray(parsed.suggested_actions)
        ? parsed.suggested_actions
        : [],
    };
  } catch {
    console.error("Failed to parse stream response");
    return FALLBACK_METADATA;
  }
}
