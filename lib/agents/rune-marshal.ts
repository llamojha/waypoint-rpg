import { GoogleGenAI, FunctionCallingConfigMode, Type } from "@google/genai";
import { SKILL_TREE, SKILL_NAMES } from "@/constants";
import type { Character, WorldContext } from "@/types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

/** Magic skill names for denial detection */
const MAGIC_SKILLS = ["Spellcasting", "Rituals", "Wards", "Summoning"];

export interface RuneMarshalOutput {
  intent: string;  // What the player is trying to do
  primary_skill: string;
  power_words: string[];
  tier: number;
  bonus: number;
  requires_roll: boolean;
  dc?: number;
  denial_reason?: string;
}

const DETECT_INTENT_TOOL = {
  name: "detect_intent",
  description: "Analyze player action to determine intent, skill, and if roll is needed",
  parameters: {
    type: Type.OBJECT,
    properties: {
      intent: {
        type: Type.STRING,
        description: "Brief description of what the player is trying to do (e.g., 'travel to captain hall', 'sneak past guards', 'attack the goblin')",
      },
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
        description: "Highest tier of power word used (1-3)",
      },
      bonus: {
        type: Type.NUMBER,
        description: "Total bonus from power words",
      },
      requires_roll: {
        type: Type.BOOLEAN,
        description: "Whether this action needs a skill check",
      },
      dc: {
        type: Type.NUMBER,
        description: "Difficulty class if roll required",
      },
      denial_reason: {
        type: Type.STRING,
        description: "If action should be denied, explain why",
      },
    },
    required: ["intent", "primary_skill", "requires_roll"],
  },
};

function buildPrompt(character: Character, world: WorldContext): string {
  return `You are the Rune Marshal for Waypoint RPG. Analyze player actions to detect intent.

## SKILL_TREE (for power word detection)
${JSON.stringify(SKILL_TREE, null, 2)}

## Character
- Magic unlocked: ${character.isMagicUnlocked}
- Skills: ${Object.entries(character.skills).map(([k, v]) => `${k}:${v.level}`).join(", ") || "none"}

## Location
- ${world.poi} in ${world.region}

## Rules for requires_roll

SET requires_roll=true ONLY for:
- Combat attacks against enemies
- Stealth/sneaking past guards or enemies
- Picking locks, disarming traps
- Persuading hostile or reluctant NPCs
- Climbing dangerous surfaces
- Searching for well-hidden things
- Athletic feats with risk of failure

SET requires_roll=false for:
- Walking/traveling to a location
- Talking to friendly NPCs
- Looking around casually
- Buying/selling items at shops
- Resting or waiting
- Simple movement without obstacles
- Entering buildings or rooms
- Asking questions

## DC Guidelines (only if requires_roll=true)
- 8: trivial (climb a ladder)
- 10: easy (pick a simple lock)
- 12: moderate (sneak past a guard)
- 15: hard (persuade a hostile NPC)
- 18: very hard (pick a complex lock)

## Magic Denial
${character.isMagicUnlocked ? "Magic is unlocked - allow magic actions" : "Magic is NOT unlocked. If player attempts magic (spells, rituals, summoning), set denial_reason explaining magic must be unlocked first."}

## NPC Travel Denial
If player asks an NPC to travel, follow, or come with them, set denial_reason with an in-character response where the NPC (use their name from the action) politely declines, explaining they have duties or reasons to stay at their current location.

Call detect_intent with your analysis.`;
}

export async function runRuneMarshal(
  playerAction: string,
  character: Character,
  world: WorldContext
): Promise<RuneMarshalOutput> {
  const prompt = buildPrompt(character, world);

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: `${prompt}\n\nPlayer action: "${playerAction}"` }] }],
      config: {
        temperature: 0.1,
        tools: [{ functionDeclarations: [DETECT_INTENT_TOOL] }],
        toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY } },
      },
    });

    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    for (const part of parts) {
      if (part.functionCall?.name === "detect_intent") {
        const args = part.functionCall.args as Record<string, unknown>;
        
        // Check for magic denial
        const skill = args.primary_skill as string;
        const intent = (args.intent as string) || playerAction;
        if (!character.isMagicUnlocked && MAGIC_SKILLS.includes(skill)) {
          return {
            intent,
            primary_skill: skill,
            power_words: [],
            tier: 0,
            bonus: 0,
            requires_roll: false,
            denial_reason: "You reach for magical power, but feel nothing. Magic remains locked within you. Perhaps someone in this world could help awaken it...",
          };
        }

        return {
          intent: (args.intent as string) || playerAction,
          primary_skill: skill,
          power_words: (args.power_words as string[]) || [],
          tier: (args.tier as number) || 0,
          bonus: (args.bonus as number) || 0,
          requires_roll: args.requires_roll as boolean,
          dc: args.dc as number | undefined,
          denial_reason: args.denial_reason as string | undefined,
        };
      }
    }
  } catch (error) {
    console.error("Rune Marshal LLM error:", error);
  }

  // Fallback - no roll needed
  return {
    intent: playerAction,
    primary_skill: "Perception",
    power_words: [],
    tier: 0,
    bonus: 0,
    requires_roll: false,
  };
}
