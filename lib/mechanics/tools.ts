import { createTool, Type } from "@/lib/gemini/tools";
import { SKILL_NAMES } from "@/constants";

/**
 * Result type for detect_intent tool call
 */
export interface DetectIntentResult {
  primary_skill: string;
  power_words: string[];
  tier: 1 | 2 | 3;
  bonus: number;
  requires_roll: boolean;
  dc?: number;
  denial_reason?: string;
}

/**
 * Tool declaration for intent detection via Gemini function calling
 */
export const detectIntentTool = createTool(
  "detect_intent",
  "Analyze player action to determine skill check requirements",
  {
    type: Type.OBJECT,
    properties: {
      primary_skill: {
        type: Type.STRING,
        enum: SKILL_NAMES,
        description: "The main skill being used",
      },
      power_words: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Power words detected in the action",
      },
      tier: {
        type: Type.NUMBER,
        description: "Power word tier (1=basic, 2=advanced, 3=master)",
      },
      bonus: {
        type: Type.NUMBER,
        description: "Total bonus from power words (+1/+2/+3)",
      },
      requires_roll: {
        type: Type.BOOLEAN,
        description: "Whether this action requires a skill check",
      },
      dc: {
        type: Type.NUMBER,
        description: "Difficulty class if roll required (10-25)",
      },
      denial_reason: {
        type: Type.STRING,
        description: "If action is impossible, explain why",
      },
    },
    required: ["primary_skill", "requires_roll"],
  }
);
