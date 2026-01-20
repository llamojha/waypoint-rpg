import { GoogleGenAI, FunctionCallingConfigMode, Type } from "@google/genai";
import { SKILL_TREE, SKILL_NAMES } from "@/constants";
import type { Character, WorldContext } from "@/types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

/** Magic skill names for denial detection */
const MAGIC_SKILLS = ["Spellcasting", "Rituals", "Wards", "Summoning"];

/** Action types for proposal constraints */
export type ActionType = "passive" | "travel" | "social" | "combat" | "object";

export interface RuneMarshalOutput {
  intent: string;  // What the player is trying to do
  action_type: ActionType;  // Classification for proposal constraints
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
  description: "Analyze player action to determine intent, skill, action type, and if roll is needed",
  parameters: {
    type: Type.OBJECT,
    properties: {
      intent: {
        type: Type.STRING,
        description: "Brief description of what the player is trying to do (e.g., 'travel to captain hall', 'sneak past guards', 'attack the goblin')",
      },
      action_type: {
        type: Type.STRING,
        enum: ["passive", "travel", "social", "combat", "object"],
        description: "Classification of action: passive (observation/conversation), travel (moving locations), social (NPC interaction), combat (fighting), object (using/manipulating items)",
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
    required: ["intent", "action_type", "primary_skill", "requires_roll"],
  },
};

function buildPrompt(character: Character, world: WorldContext): string {
  return `You are the Rune Marshal for Waypoint RPG. Analyze player actions to detect intent and classify action type.

## SKILL_TREE (for power word detection)
${JSON.stringify(SKILL_TREE, null, 2)}

## Character
- Magic unlocked: ${character.isMagicUnlocked}
- Skills: ${Object.entries(character.skills).map(([k, v]) => `${k}:${v.level}`).join(", ") || "none"}

## Location
- ${world.poi} in ${world.region}
- NPCs present: ${world.entities?.join(", ") || "none"}

## Action Type Classification (REQUIRED)

Classify every action into ONE of these types:

| Type | Description | Examples |
|------|-------------|----------|
| passive | Observation, conversation, questions, looking around | "What should we do?", "Look around", "Hello", "Tell me about..." |
| travel | Moving to a different location | "I go to X", "Travel to X", "Head to the market" |
| social | Meaningful NPC interaction (helping, thanking, insulting) | "I thank Lenna", "I help the merchant", "I insult him" |
| combat | Fighting, attacking, defending | "I attack", "I strike the goblin", "I defend myself" |
| object | Using/manipulating items, buying, selling, opening things | "I open the chest", "I buy the sword", "I pull the lever" |

## Rules for requires_roll

SET requires_roll=true ONLY for actions with REAL RISK or OPPOSITION:
- Combat attacks against enemies or hostile NPCs
- Stealth/sneaking past guards or enemies who are ACTIVELY watching
- Picking locks, disarming traps
- Persuading HOSTILE or RELUCTANT NPCs (not friendly ones)
- Climbing dangerous surfaces with risk of falling
- Searching for well-hidden or concealed things
- Athletic feats with meaningful risk of failure

SET requires_roll=false for ALL of these (NO EXCEPTIONS):
- Walking/traveling to a location
- Talking to friendly NPCs
- Looking around casually
- Buying/selling items at shops
- Resting or waiting
- Simple movement without obstacles
- Entering buildings or rooms
- Asking questions
- Simple social gestures with willing participants (holding hands, hugging, waving, shaking hands)
- Giving or receiving items from willing NPCs
- Friendly conversations
- Sitting, standing, or changing posture
- Picking up unguarded items
- Opening unlocked doors

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

Call detect_intent with your analysis.

## Success Examples

### Example 1: Combat action
Player: "I strike at the bandit with my sword"
Good output:
- intent: "attack bandit with sword"
- action_type: "combat"
- primary_skill: "Melee"
- requires_roll: true
- dc: 12

### Example 2: Travel action
Player: "I walk to the market square"
Good output:
- intent: "travel to market square"
- action_type: "travel"
- primary_skill: "Navigation"
- requires_roll: false

### Example 3: Social interaction
Player: "I thank Lenna for her help"
Good output:
- intent: "thank Lenna"
- action_type: "social"
- primary_skill: "Persuasion"
- requires_roll: false

### Example 4: Passive observation
Player: "I look around the tavern"
Good output:
- intent: "observe tavern"
- action_type: "passive"
- primary_skill: "Perception"
- requires_roll: false

### Example 5: Passive conversation
Player: "What should we do next?"
Good output:
- intent: "ask for suggestions"
- action_type: "passive"
- primary_skill: "Persuasion"
- requires_roll: false

### Example 6: Object manipulation
Player: "I open the chest"
Good output:
- intent: "open chest"
- action_type: "object"
- primary_skill: "Perception"
- requires_roll: false`;
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
        const actionType = (args.action_type as ActionType) || "passive";
        
        if (!character.isMagicUnlocked && MAGIC_SKILLS.includes(skill)) {
          return {
            intent,
            action_type: actionType,
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
          action_type: actionType,
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

  // Fallback - default to passive (safest, no proposals allowed)
  return {
    intent: playerAction,
    action_type: "passive",
    primary_skill: "Perception",
    power_words: [],
    tier: 0,
    bonus: 0,
    requires_roll: false,
  };
}
