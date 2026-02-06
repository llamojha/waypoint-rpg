/**
 * Player Agent for E2E Testing
 * 
 * Uses Gemini to simulate a player deciding what to do next.
 */

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const PLAYER_AGENT_PROMPT = `You are simulating a player in a fantasy RPG.
Given the current scene, output ONLY what the player says/does next.

Rules:
- Output a single action in first person (I do X)
- No explanations, no quotes, no formatting, no markdown
- Vary your actions: explore, talk to NPCs, use skills, travel, rest
- Use suggested actions sometimes, but not always
- Keep actions short (under 100 characters)

Current scene:
{narration}

Suggested actions:
{suggestedActions}

Player action:`;

/**
 * Ask Gemini what a player would do next given the current scene
 */
export async function getNextPlayerAction(
  narration: string,
  suggestedActions: string[] = []
): Promise<string> {
  const prompt = PLAYER_AGENT_PROMPT
    .replace("{narration}", narration)
    .replace("{suggestedActions}", suggestedActions.join("\n") || "None");

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-3-flash-preview",
    contents: prompt,
    config: {
      temperature: 0.3,
      maxOutputTokens: 100,
    },
  });

  const text = response.text?.trim() || "I look around";
  
  // Clean up any quotes or formatting that slipped through
  return text.replace(/^["']|["']$/g, "").trim();
}
