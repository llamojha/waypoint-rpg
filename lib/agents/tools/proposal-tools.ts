import { createTool, Type } from "@/lib/gemini/tools";
import { SKILL_NAMES } from "@/constants";

/**
 * Proposal tool: Detect player intent and skill check requirements
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
        description: "Highest power word tier (1=basic, 2=advanced, 3=master)",
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
        description: "Difficulty class if roll required (8=easy, 12=moderate, 15=hard, 18=very hard)",
      },
      denial_reason: {
        type: Type.STRING,
        description: "If action is contextually impossible, explain why",
      },
    },
    required: ["primary_skill", "requires_roll"],
  }
);

/**
 * Proposal tool: Change HP or gold
 */
export const proposeStatChangeTool = createTool(
  "propose_stat_change",
  "Propose a change to character HP or gold",
  {
    type: Type.OBJECT,
    properties: {
      stat: { type: Type.STRING, enum: ["hp", "gold"], description: "Which stat to change" },
      delta: { type: Type.NUMBER, description: "Amount to change (negative for damage/spending)" },
      reason: { type: Type.STRING, description: "Why this change is happening" },
    },
    required: ["stat", "delta", "reason"],
  }
);

/**
 * Proposal tool: Add item to inventory
 */
export const proposeInventoryAddTool = createTool(
  "propose_inventory_add",
  "Propose adding an item to character inventory",
  {
    type: Type.OBJECT,
    properties: {
      item_name: { type: Type.STRING, description: "Name of the item" },
      item_type: {
        type: Type.STRING,
        enum: ["weapon", "armor", "consumable", "quest", "trinket", "misc"],
        description: "Type of item",
      },
      rarity: {
        type: Type.STRING,
        enum: ["common", "uncommon", "rare", "legendary"],
        description: "Item rarity tier",
      },
      description: { type: Type.STRING, description: "Item description" },
      reason: { type: Type.STRING, description: "How the item was obtained" },
    },
    required: ["item_name", "item_type", "reason"],
  }
);

/**
 * Proposal tool: Remove item from inventory
 */
export const proposeInventoryRemoveTool = createTool(
  "propose_inventory_remove",
  "Propose removing an item from character inventory",
  {
    type: Type.OBJECT,
    properties: {
      item_name: { type: Type.STRING, description: "Name of the item to remove" },
      reason: { type: Type.STRING, description: "Why the item is being removed" },
    },
    required: ["item_name", "reason"],
  }
);

/**
 * Proposal tool: Change NPC relationship
 */
export const proposeRelationshipChangeTool = createTool(
  "propose_relationship_change",
  "Propose a change to NPC relationship",
  {
    type: Type.OBJECT,
    properties: {
      npc: { type: Type.STRING, description: "Name of the NPC" },
      delta: { type: Type.NUMBER, description: "Relationship change (-10 to +10)" },
      reason: { type: Type.STRING, description: "Why the relationship changed" },
    },
    required: ["npc", "delta", "reason"],
  }
);

/**
 * Proposal tool: Update quest progress
 */
export const proposeQuestProgressTool = createTool(
  "propose_quest_progress",
  "Propose updating quest progress",
  {
    type: Type.OBJECT,
    properties: {
      quest_id: { type: Type.STRING, description: "Quest identifier or title" },
      new_progress: { type: Type.NUMBER, description: "New progress value" },
      reason: { type: Type.STRING, description: "What triggered the progress" },
    },
    required: ["quest_id", "new_progress", "reason"],
  }
);

/**
 * Proposal tool: Discover new NPC
 */
export const proposeNpcDiscoveredTool = createTool(
  "propose_npc_discovered",
  "Propose registering a newly discovered NPC",
  {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "NPC name" },
      role: { type: Type.STRING, description: "NPC role or occupation" },
      location: { type: Type.STRING, description: "Where the NPC was found" },
      personality: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Personality traits",
      },
    },
    required: ["name", "role", "location"],
  }
);

/**
 * Proposal tool: Change location
 */
export const proposeLocationChangeTool = createTool(
  "propose_location_change",
  "Propose moving to a different location",
  {
    type: Type.OBJECT,
    properties: {
      location: { type: Type.STRING, description: "Name of the destination POI" },
      reason: { type: Type.STRING, description: "Why the character is traveling" },
    },
    required: ["location", "reason"],
  }
);

/**
 * Proposal tool: Start a quest
 */
export const proposeQuestStartTool = createTool(
  "propose_quest_start",
  "Propose starting a new quest",
  {
    type: Type.OBJECT,
    properties: {
      quest_id: { type: Type.STRING, description: "Quest identifier" },
      quest_title: { type: Type.STRING, description: "Quest title" },
      reason: { type: Type.STRING, description: "How the quest was discovered" },
    },
    required: ["quest_id", "quest_title", "reason"],
  }
);

/**
 * Proposal tool: Deal damage to enemy in combat
 */
export const proposeCombatDamageTool = createTool(
  "propose_combat_damage",
  "Propose dealing damage to an enemy in active combat",
  {
    type: Type.OBJECT,
    properties: {
      target: { type: Type.STRING, description: "Name of the enemy to damage" },
      damage: { type: Type.NUMBER, description: "Amount of damage to deal" },
      reason: { type: Type.STRING, description: "How the damage was dealt" },
    },
    required: ["target", "damage", "reason"],
  }
);

/**
 * Proposal tool: Start combat by spawning enemies
 */
export const proposeCombatStartTool = createTool(
  "propose_combat_start",
  "Propose starting combat by spawning enemies",
  {
    type: Type.OBJECT,
    properties: {
      enemies: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Enemy template names to spawn (e.g., ['Wolf', 'Wolf'] or ['Bandit'])",
      },
      reason: { type: Type.STRING, description: "Why combat is starting" },
    },
    required: ["enemies", "reason"],
  }
);

/** All proposal tools for Orchestrator */
export const PROPOSAL_TOOLS = [
  detectIntentTool,
  proposeStatChangeTool,
  proposeInventoryAddTool,
  proposeInventoryRemoveTool,
  proposeRelationshipChangeTool,
  proposeQuestProgressTool,
  proposeNpcDiscoveredTool,
  proposeLocationChangeTool,
  proposeQuestStartTool,
  proposeCombatDamageTool,
  proposeCombatStartTool,
];

/** Result types for proposal tools */
export interface DetectIntentResult {
  primary_skill: string;
  power_words?: string[];
  tier?: 1 | 2 | 3;
  bonus?: number;
  requires_roll: boolean;
  dc?: number;
  denial_reason?: string;
}

export interface ProposeStatChangeResult {
  stat: "hp" | "gold";
  delta: number;
  reason: string;
}

export interface ProposeInventoryAddResult {
  item_name: string;
  item_type: "weapon" | "armor" | "consumable" | "quest" | "trinket" | "misc";
  rarity?: "common" | "uncommon" | "rare" | "legendary";
  description?: string;
  reason: string;
}

export interface ProposeInventoryRemoveResult {
  item_name: string;
  reason: string;
}

export interface ProposeRelationshipChangeResult {
  npc: string;
  delta: number;
  reason: string;
}

export interface ProposeQuestProgressResult {
  quest_id: string;
  new_progress: number;
  reason: string;
}

export interface ProposeNpcDiscoveredResult {
  name: string;
  role: string;
  location: string;
  personality?: string[];
}

export interface ProposeLocationChangeResult {
  location: string;
  reason: string;
}

export interface ProposeQuestStartResult {
  quest_id: string;
  quest_title: string;
  reason: string;
}

export interface ProposeCombatDamageResult {
  target: string;
  damage: number;
  reason: string;
}

export interface ProposeCombatStartResult {
  enemies: string[];
  reason: string;
}

/** Union type for all proposals */
export type ProposalResult =
  | { type: "detect_intent"; data: DetectIntentResult }
  | { type: "propose_stat_change"; data: ProposeStatChangeResult }
  | { type: "propose_inventory_add"; data: ProposeInventoryAddResult }
  | { type: "propose_inventory_remove"; data: ProposeInventoryRemoveResult }
  | { type: "propose_relationship_change"; data: ProposeRelationshipChangeResult }
  | { type: "propose_quest_progress"; data: ProposeQuestProgressResult }
  | { type: "propose_npc_discovered"; data: ProposeNpcDiscoveredResult }
  | { type: "propose_location_change"; data: ProposeLocationChangeResult }
  | { type: "propose_quest_start"; data: ProposeQuestStartResult }
  | { type: "propose_combat_damage"; data: ProposeCombatDamageResult }
  | { type: "propose_combat_start"; data: ProposeCombatStartResult };
