import { generateWithTools } from "@/lib/gemini/client";
import { detectIntentTool, DetectIntentResult } from "./tools";
import { SKILL_TREE } from "@/constants";
import type { Character, WorldContext } from "@/types";

/**
 * Build the prompt for intent detection
 */
function buildIntentPrompt(
  playerAction: string,
  character: Character,
  world: WorldContext
): string {
  // Format skill tree for context
  const skillList = SKILL_TREE.map(
    (pillar) =>
      `${pillar.pillar}: ${pillar.skills
        .map(
          (s) =>
            `${s.name} (tier1: ${s.tier1.join(", ")}; tier2: ${s.tier2.join(", ")}; tier3: ${s.tier3.join(", ")})`
        )
        .join("; ")}`
  ).join("\n");

  return `Analyze this player action to determine if a skill check is needed.

PLAYER ACTION: "${playerAction}"

CONTEXT:
- Location: ${world.poi} in ${world.region}
- Scene: ${world.description}

CHARACTER SKILLS (current levels):
${Object.entries(character.skills)
  .filter(([, s]) => s.level > 0)
  .map(([name, s]) => `- ${name}: Level ${s.level}`)
  .join("\n") || "- No trained skills yet"}

SKILL TREE (for power word detection):
${skillList}

RULES:
- Detect power words from the skill tree tiers
- tier1 words give +1 bonus, tier2 give +2, tier3 give +3
- Set requires_roll=true for actions with uncertain outcomes
- Set requires_roll=false for simple actions (looking, talking casually, walking)
- DC range: 10 (easy) to 20 (very hard), max 25 (nearly impossible)
- If action is impossible in context, set denial_reason

Call the detect_intent function with your analysis.`;
}

/**
 * Detect player intent and mechanics requirements via tool calling
 */
export async function detectIntent(
  playerAction: string,
  character: Character,
  world: WorldContext
): Promise<DetectIntentResult> {
  const prompt = buildIntentPrompt(playerAction, character, world);

  const result = await generateWithTools<DetectIntentResult>(
    prompt,
    [detectIntentTool],
    0.1 // Low temperature for consistent mechanics
  );

  // Ensure defaults for optional fields
  return {
    primary_skill: result.primary_skill,
    power_words: result.power_words || [],
    tier: result.tier || 1,
    bonus: result.bonus || 0,
    requires_roll: result.requires_roll,
    dc: result.dc,
    denial_reason: result.denial_reason,
  };
}
