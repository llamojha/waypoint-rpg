import { createTool, Type } from "@/lib/gemini/tools";
import { SKILL_NAMES } from "@/constants";

/**
 * Read tool: Get character's current skill level and XP
 */
export const getSkillLevelTool = createTool(
  "get_skill_level",
  "Get character's current level and XP in a skill",
  {
    type: Type.OBJECT,
    properties: {
      skill: { type: Type.STRING, enum: SKILL_NAMES, description: "The skill to query" },
    },
    required: ["skill"],
  }
);

/** All read tools for Orchestrator */
// Note: get_power_word_tier removed - Rune Marshal already handles power word detection
export const READ_TOOLS = [getSkillLevelTool];
