import { generateWithTools } from "@/lib/gemini/client";
import { detectIntentTool, DetectIntentResult } from "./tools";
import { SKILL_TREE } from "@/constants";
import { buildIntentPrompt } from "@/lib/prompts/intent";
import type { Character, WorldContext } from "@/types";

/** Magic skill names for denial detection */
const MAGIC_SKILLS = ["Spellcasting", "Rituals", "Wards", "Summoning"];

/**
 * Format skill tree for prompt, filtering Magic pillar if locked
 */
function formatSkillTree(isMagicUnlocked: boolean): string {
  const pillars = isMagicUnlocked
    ? SKILL_TREE
    : SKILL_TREE.filter((p) => p.pillar !== "Magic");

  return pillars
    .map(
      (pillar) =>
        `${pillar.pillar}: ${pillar.skills
          .map(
            (s) =>
              `${s.name} (tier1: ${s.tier1.join(", ")}; tier2: ${s.tier2.join(", ")}; tier3: ${s.tier3.join(", ")})`
          )
          .join("; ")}`
    )
    .join("\n");
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
    formatSkillTree(character.isMagicUnlocked),
    character.isMagicUnlocked
  );

  const result = await generateWithTools<DetectIntentResult>(
    prompt,
    [detectIntentTool],
    0.1 // Low temperature for consistent mechanics
  );

  // Gate magic skills if not unlocked
  if (!character.isMagicUnlocked && MAGIC_SKILLS.includes(result.primary_skill)) {
    return {
      primary_skill: result.primary_skill,
      power_words: result.power_words || [],
      tier: 1,
      bonus: 0,
      requires_roll: false,
      denial_reason:
        "You have no knowledge of magic. Perhaps you could find someone to teach you, or discover an ancient tome...",
    };
  }

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
