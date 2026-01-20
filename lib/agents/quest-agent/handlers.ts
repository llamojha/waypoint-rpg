/**
 * Quest Agent Handlers
 * Database queries for quest state, active quests, and NPC quests
 */

import { createAdminClient } from "@/lib/supabase/server";

export interface QuestStep {
  step: number;
  goal: string;
  type: "dialogue" | "exploration" | "combat" | "fetch" | "deliver" | "discover";
}

export interface QuestRewards {
  gold?: number;
  xp?: Record<string, number>;
  items?: string[];
  reputation?: Array<{ npc: string; delta: number }>;
}

export interface ActiveQuest {
  id: string;
  title: string;
  description: string;
  progress: number;
  totalProgress: number;
  currentStep: number;
  currentGoal: string | null;
  /** Goal type for the current step (exploration, dialogue, fetch, combat, discover) */
  goalType: "dialogue" | "exploration" | "combat" | "fetch" | "deliver" | "discover";
  steps: QuestStep[];
  rewards: QuestRewards;
  giverNpc: string | null;
}

export interface QuestState {
  questId: string;
  title: string;
  progress: number;
  totalProgress: number;
  currentStep: number;
  currentGoal: string | null;
  nextGoal: string | null;
  steps: QuestStep[];
  rewards: QuestRewards;
  status: "active" | "completed" | "failed";
}

export interface NpcQuest {
  id: string;
  title: string;
  description: string;
  steps: QuestStep[];
  rewards: QuestRewards;
  totalProgress: number;
}

/**
 * Get all active quests for a character
 */
export async function getActiveQuests(characterId: string): Promise<ActiveQuest[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("waypoint_character_quests")
    .select(`
      progress,
      quest:waypoint_quests (
        id,
        title,
        description,
        total_progress,
        steps,
        rewards,
        giver_npc
      )
    `)
    .eq("character_id", characterId)
    .eq("status", "active");

  if (error || !data) {
    console.error("Failed to fetch active quests:", error);
    return [];
  }

  return data
    .filter((row) => row.quest)
    .map((row) => {
      const quest = row.quest as unknown as {
        id: string;
        title: string;
        description: string;
        total_progress: number;
        steps: QuestStep[];
        rewards: QuestRewards;
        giver_npc: string | null;
      };
      const steps = quest.steps || [];
      const currentStep = row.progress + 1;
      const currentStepData = steps.find((s) => s.step === currentStep);
      const currentGoal = currentStepData?.goal || null;
      const goalType = currentStepData?.type || "dialogue";

      return {
        id: quest.id,
        title: quest.title,
        description: quest.description,
        progress: row.progress,
        totalProgress: quest.total_progress,
        currentStep,
        currentGoal,
        goalType,
        steps,
        rewards: quest.rewards || {},
        giverNpc: quest.giver_npc,
      };
    });
}

/**
 * Get state for a specific quest
 */
export async function getQuestState(
  characterId: string,
  questIdOrTitle: string
): Promise<QuestState | null> {
  const supabase = createAdminClient();

  // Try to find by ID first, then by title
  let questQuery = supabase
    .from("waypoint_quests")
    .select("id, title, total_progress, steps, rewards")
    .or(`id.eq.${questIdOrTitle},title.ilike.%${questIdOrTitle}%`)
    .limit(1)
    .maybeSingle();

  const { data: quest, error: questError } = await questQuery;

  if (questError || !quest) {
    return null;
  }

  // Get character's progress
  const { data: charQuest } = await supabase
    .from("waypoint_character_quests")
    .select("progress, status")
    .eq("character_id", characterId)
    .eq("quest_id", quest.id)
    .maybeSingle();

  const progress = charQuest?.progress ?? 0;
  const status = (charQuest?.status as "active" | "completed" | "failed") ?? "active";
  const steps = (quest.steps as QuestStep[]) || [];
  const currentStep = progress + 1;
  const currentGoal = steps.find((s) => s.step === currentStep)?.goal || null;
  const nextGoal = steps.find((s) => s.step === currentStep + 1)?.goal || null;

  return {
    questId: quest.id,
    title: quest.title,
    progress,
    totalProgress: quest.total_progress,
    currentStep,
    currentGoal,
    nextGoal,
    steps,
    rewards: (quest.rewards as QuestRewards) || {},
    status,
  };
}

/**
 * Get quests offered by a specific NPC (not yet started by character)
 */
export async function checkNpcQuests(
  npcName: string,
  characterId: string
): Promise<NpcQuest[]> {
  const supabase = createAdminClient();

  // Get all quests from this NPC
  const { data: quests, error } = await supabase
    .from("waypoint_quests")
    .select("id, title, description, total_progress, steps, rewards")
    .ilike("giver_npc", npcName);

  if (error || !quests) {
    return [];
  }

  // Get quests already started by character
  const { data: startedQuests } = await supabase
    .from("waypoint_character_quests")
    .select("quest_id")
    .eq("character_id", characterId);

  const startedIds = new Set((startedQuests || []).map((q) => q.quest_id));

  // Filter to quests not yet started
  return quests
    .filter((q) => !startedIds.has(q.id))
    .map((q) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      steps: (q.steps as QuestStep[]) || [],
      rewards: (q.rewards as QuestRewards) || {},
      totalProgress: q.total_progress,
    }));
}
