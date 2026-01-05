import { generateWithTools } from "@/lib/gemini/client";
import { detectIntentTool, DetectIntentResult } from "./tools";
import { SKILL_TREE } from "@/constants";
import { buildIntentPrompt } from "@/lib/prompts/intent";
import type { Character, WorldContext } from "@/types";

/**
 * Format skill tree for prompt
 */
function formatSkillTree(): string {
  return SKILL_TREE.map(
    (pillar) =>
      `${pillar.pillar}: ${pillar.skills
        .map(
          (s) =>
            `${s.name} (tier1: ${s.tier1.join(", ")}; tier2: ${s.tier2.join(", ")}; tier3: ${s.tier3.join(", ")})`
        )
        .join("; ")}`
  ).join("\n");
}

/**
 * Format character skills for prompt
 */
function formatCharacterSkills(character: Character): string {
  const trained = Object.entries(character.skills)
    .filter(([, s]) => s.level > 0)
    .map(([name, s]) => `- ${name}: Level ${s.level}`)
    .join("\n");
  return trained || "- No trained skills yet";
}

/**
 * Detect player intent and mechanics requirements via tool calling
 */
export async function detectIntent(
  playerAction: string,
  character: Character,
  world: WorldContext
): Promise<DetectIntentResult> {
  const prompt = buildIntentPrompt(
    playerAction,
    world.poi,
    world.region,
    world.description,
    formatCharacterSkills(character),
    formatSkillTree()
  );

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
