import { createTool, Type } from "@/lib/gemini/tools";
import { SKILL_NAMES } from "@/constants";

/**
 * Read tool: Look up power word tier and bonus from SKILL_TREE
 */
export const getPowerWordTierTool = createTool(
  "get_power_word_tier",
  "Look up the tier and bonus for a power word in a skill",
  {
    type: Type.OBJECT,
    properties: {
      word: { type: Type.STRING, description: "The power word to look up" },
      skill: { type: Type.STRING, enum: SKILL_NAMES, description: "The skill to search in" },
    },
    required: ["word", "skill"],
  }
);

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
export const READ_TOOLS = [getPowerWordTierTool, getSkillLevelTool];
