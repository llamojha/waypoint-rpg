/**
 * Quest Agent
 * 
 * Spoke agent for quest state tracking, validation, and trigger detection.
 * Called by Orchestrator to get quest context before proposing changes.
 */

import { GoogleGenAI } from "@google/genai";
import {
  getActiveQuests,
  getQuestState,
  checkNpcQuests,
  type ActiveQuest,
  type QuestState,
  type NpcQuest,
  type QuestStep,
  type QuestRewards,
} from "./handlers";
import { createAdminClient } from "@/lib/supabase/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const MODEL = process.env.GEMINI_MODEL || "gemini-3-flash-preview";

export type { ActiveQuest, QuestState, NpcQuest, QuestStep, QuestRewards };

export interface GoalValidationResult {
  matches: boolean;
  reason: string;
}

export interface QuestTriggerResult {
  source: "db" | "generated" | "none";
  quest?: {
    id?: string;
    title: string;
    description: string;
    steps: QuestStep[];
  };
  matched: boolean;
}

export interface QuestAgentOutput {
  activeQuests: ActiveQuest[];
  npcQuests: NpcQuest[];
  questState?: QuestState | null;
}

/**
 * Validate if player action matches current quest step goal
 */
export async function validateStepGoal(
  playerAction: string,
  currentGoal: string
): Promise<GoalValidationResult> {
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{
        role: "user",
        parts: [{
          text: `Does this player action accomplish the quest goal?

Quest Goal: "${currentGoal}"
Player Action: "${playerAction}"

Respond with JSON only:
{"matches": true/false, "reason": "brief explanation"}

Be lenient - if the action is clearly attempting the goal, it matches.`
        }]
      }],
      config: { temperature: 0.1 },
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error("Goal validation error:", error);
  }

  return { matches: false, reason: "Could not validate" };
}

/**
 * Check if player action triggers a quest (DB first, then LLM suggestion)
 */
export async function checkQuestTrigger(
  playerAction: string,
  characterId: string
): Promise<QuestTriggerResult> {
  const supabase = createAdminClient();
  const actionLower = playerAction.toLowerCase();

  // Step 1: Check DB for matching quest leads
  const { data: quests } = await supabase
    .from("waypoint_quests")
    .select("id, title, description, leads, steps");

  if (quests) {
    for (const quest of quests) {
      const leads = (quest.leads as string[]) || [];
      for (const lead of leads) {
        // Simple keyword matching
        const leadWords = lead.toLowerCase().split(/\s+/);
        const matchCount = leadWords.filter((w) => actionLower.includes(w)).length;
        if (matchCount >= 2 || (leadWords.length <= 2 && matchCount >= 1)) {
          // Check if character already has this quest
          const { data: existing } = await supabase
            .from("waypoint_character_quests")
            .select("id")
            .eq("character_id", characterId)
            .eq("quest_id", quest.id)
            .maybeSingle();

          if (!existing) {
            return {
              source: "db",
              quest: {
                id: quest.id,
                title: quest.title,
                description: quest.description,
                steps: (quest.steps as QuestStep[]) || [],
              },
              matched: true,
            };
          }
        }
      }
    }
  }

  // Step 2: No DB match - LLM can suggest if action implies a quest
  // For now, return no match (LLM suggestion can be added later)
  return { source: "none", matched: false };
}

/**
 * Run the Quest Agent - gather quest context for Orchestrator
 */
export async function runQuestAgent(
  characterId: string,
  currentNpc?: string,
  questIdOrTitle?: string
): Promise<QuestAgentOutput> {
  const [activeQuests, npcQuests, questState] = await Promise.all([
    getActiveQuests(characterId),
    currentNpc ? checkNpcQuests(currentNpc, characterId) : Promise.resolve([]),
    questIdOrTitle ? getQuestState(characterId, questIdOrTitle) : Promise.resolve(null),
  ]);

  return {
    activeQuests,
    npcQuests,
    questState,
  };
}

// Re-export handlers for direct use
export { getActiveQuests, getQuestState, checkNpcQuests };
