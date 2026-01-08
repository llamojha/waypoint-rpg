import { GoogleGenAI, FunctionCallingConfigMode } from "@google/genai";
import { createTool, Type } from "@/lib/gemini/tools";
import type { ProposalResult } from "../tools/proposal-tools";
import type { Character, WorldContext } from "@/types";
import { ITEM_BOUNDS } from "@/constants";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

/**
 * Tool for Arbiter to output validation decisions
 */
export const validateEventTool = createTool(
  "validate_event",
  "Validate a proposed event against game rules and context",
  {
    type: Type.OBJECT,
    properties: {
      event_index: { type: Type.NUMBER, description: "Index of the event being validated" },
      approved: { type: Type.BOOLEAN, description: "Whether the event is approved" },
      reason: { type: Type.STRING, description: "Explanation for the decision" },
    },
    required: ["event_index", "approved", "reason"],
  }
);

export interface LLMValidationResult {
  eventIndex: number;
  approved: boolean;
  reason: string;
}

export interface LLMValidationContext {
  character: Character;
  world: WorldContext;
  playerAction: string;
  rollOutcome?: {
    skill: string;
    success: boolean;
    total: number;
    dc: number;
  };
}

/**
 * Build prompt for Arbiter LLM validation
 */
function buildArbiterPrompt(
  proposals: ProposalResult[],
  ctx: LLMValidationContext
): string {
  const proposalsStr = proposals.map((p, i) => 
    `[${i}] ${p.type}: ${JSON.stringify(p.data)}`
  ).join("\n");

  const itemBoundsStr = JSON.stringify(ITEM_BOUNDS, null, 2);

  return `You are the World Arbiter for Waypoint RPG. Validate proposed events for contextual appropriateness.

## Current Scene
Location: ${ctx.world.poi} (${ctx.world.region})
Weather: ${ctx.world.weather}
Time: Day ${ctx.world.time.day}, ${ctx.world.time.phase}
Description: ${ctx.world.description}
Nearby locations: ${ctx.world.nearbyPoi?.join(", ") || "none"}
Entities present: ${ctx.world.entities?.join(", ") || "none"}

## Character
Name: ${ctx.character.name}
HP: ${ctx.character.hp}/${ctx.character.maxHp}
Gold: ${ctx.character.gold}
Inventory: ${ctx.character.inventory.map(i => i.name).join(", ") || "empty"}

## Player Action
"${ctx.playerAction}"
${ctx.rollOutcome ? `Roll result: ${ctx.rollOutcome.success ? "SUCCESS" : "FAILURE"} (${ctx.rollOutcome.total} vs DC ${ctx.rollOutcome.dc})` : ""}

## Item Rarity Bounds
${itemBoundsStr}

## Proposed Events to Validate
${proposalsStr}

## Validation Rules
1. ITEM APPROPRIATENESS: No legendary items from trivial sources. Item rarity must match context.
2. NPC BEHAVIOR: NPCs should act according to their role and the scene context.
3. ACTION CONSISTENCY: Events should logically follow from the player's action and roll outcome.
4. SCENE COHERENCE: Events should make sense in the current location and time.
5. ROLL RESPECT: If roll failed, reject positive outcomes. If roll succeeded, allow reasonable rewards.

## Instructions
For each proposed event, call validate_event with:
- event_index: the index number
- approved: true/false
- reason: brief explanation

Skip detect_intent events (always approve them).
Be strict but fair - reject only what clearly violates the rules.`;
}

/**
 * Run LLM contextual validation on proposals
 */
export async function runLLMValidation(
  proposals: ProposalResult[],
  ctx: LLMValidationContext
): Promise<LLMValidationResult[]> {
  // Filter out detect_intent - always approved
  const toValidate = proposals.filter(p => p.type !== "detect_intent");
  
  if (toValidate.length === 0) {
    return [];
  }

  const prompt = buildArbiterPrompt(toValidate, ctx);

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        tools: [{ functionDeclarations: [validateEventTool] }],
        toolConfig: {
          functionCallingConfig: { mode: FunctionCallingConfigMode.ANY },
        },
        temperature: 0.1,
      },
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    const functionCalls = parts.filter(p => p.functionCall).map(p => p.functionCall!);

    const results: LLMValidationResult[] = [];
    for (const call of functionCalls) {
      if (call.name === "validate_event") {
        const args = call.args as { event_index: number; approved: boolean; reason: string };
        results.push({
          eventIndex: args.event_index,
          approved: args.approved,
          reason: args.reason,
        });
      }
    }

    // If LLM didn't validate all events, approve the rest by default
    const validatedIndices = new Set(results.map(r => r.eventIndex));
    toValidate.forEach((_, i) => {
      if (!validatedIndices.has(i)) {
        results.push({
          eventIndex: i,
          approved: true,
          reason: "Approved by default",
        });
      }
    });

    return results;
  } catch (error) {
    console.error("Arbiter LLM validation error:", error);
    // On error, approve all events (fail open for better UX)
    return toValidate.map((_, i) => ({
      eventIndex: i,
      approved: true,
      reason: "Approved due to validation error",
    }));
  }
}
