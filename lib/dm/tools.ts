/**
 * DM Fix Tools
 * 
 * Limited tools for the DM Chat to detect and fix state inconsistencies.
 * DB/State is authoritative - DM cross-checks and can correct errors.
 */

import { FunctionDeclaration, Type } from "@google/genai";

/**
 * Check state consistency - compare claims against actual DB state
 */
export const checkStateConsistencyTool: FunctionDeclaration = {
  name: "check_state_consistency",
  description: `Cross-check a player's claim against the actual game state in the database.
Use this when a player reports something seems wrong (e.g., "Lucie shouldn't be here", "I should have more gold").
Returns whether the claim is valid and what the actual state is.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      claim_type: {
        type: Type.STRING,
        enum: ["location", "npc_presence", "character_stat", "inventory", "quest"],
        description: "What type of state the player is questioning",
      },
      claimed_value: {
        type: Type.STRING,
        description: "What the player claims should be true (e.g., 'Lucie should not be here', 'I should have 15 gold')",
      },
    },
    required: ["claim_type", "claimed_value"],
  },
};

/**
 * Fix character state - correct HP, gold, or inventory
 */
export const fixCharacterStateTool: FunctionDeclaration = {
  name: "fix_character_state",
  description: `Fix an inconsistency in character state (HP, gold, inventory).
ONLY use this after check_state_consistency confirms there IS an inconsistency.
Do NOT use this for player requests to gain items/gold - only for fixing errors.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      fix_type: {
        type: Type.STRING,
        enum: ["hp", "gold", "add_item", "remove_item"],
        description: "What to fix",
      },
      new_value: {
        type: Type.NUMBER,
        description: "New value for hp or gold (required for hp/gold fixes)",
      },
      item_name: {
        type: Type.STRING,
        description: "Item name (required for add_item/remove_item)",
      },
      reason: {
        type: Type.STRING,
        description: "Why this fix is being applied (must reference the inconsistency found)",
      },
    },
    required: ["fix_type", "reason"],
  },
};

/**
 * Fix world state - correct location or entity presence
 */
export const fixWorldStateTool: FunctionDeclaration = {
  name: "fix_world_state",
  description: `Fix an inconsistency in world state (location, NPCs present).
ONLY use this after check_state_consistency confirms there IS an inconsistency.
Do NOT use this for player requests to teleport - only for fixing errors.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      fix_type: {
        type: Type.STRING,
        enum: ["location", "add_entity", "remove_entity"],
        description: "What to fix",
      },
      value: {
        type: Type.STRING,
        description: "The correct value (location name or entity name)",
      },
      reason: {
        type: Type.STRING,
        description: "Why this fix is being applied (must reference the inconsistency found)",
      },
    },
    required: ["fix_type", "value", "reason"],
  },
};

/**
 * Explain state - explain why current state is correct
 */
export const explainStateTool: FunctionDeclaration = {
  name: "explain_state",
  description: `Explain to the player why the current state is correct and cannot be changed.
Use this when check_state_consistency shows the state IS consistent but the player wants a change.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      state_type: {
        type: Type.STRING,
        enum: ["location", "npc_presence", "character_stat", "inventory", "quest"],
        description: "What type of state to explain",
      },
      current_value: {
        type: Type.STRING,
        description: "The current correct value",
      },
      explanation: {
        type: Type.STRING,
        description: "Why this is correct and how the player can legitimately change it",
      },
    },
    required: ["state_type", "current_value", "explanation"],
  },
};

/**
 * All DM tools
 */
export const DM_TOOLS: FunctionDeclaration[] = [
  checkStateConsistencyTool,
  fixCharacterStateTool,
  fixWorldStateTool,
  explainStateTool,
];

/**
 * Tool call result types
 */
export interface CheckStateConsistencyArgs {
  claim_type: "location" | "npc_presence" | "character_stat" | "inventory" | "quest";
  claimed_value: string;
}

export interface FixCharacterStateArgs {
  fix_type: "hp" | "gold" | "add_item" | "remove_item";
  new_value?: number;
  item_name?: string;
  reason: string;
}

export interface FixWorldStateArgs {
  fix_type: "location" | "add_entity" | "remove_entity";
  value: string;
  reason: string;
}

export interface ExplainStateArgs {
  state_type: "location" | "npc_presence" | "character_stat" | "inventory" | "quest";
  current_value: string;
  explanation: string;
}

export type DmToolArgs = 
  | { name: "check_state_consistency"; args: CheckStateConsistencyArgs }
  | { name: "fix_character_state"; args: FixCharacterStateArgs }
  | { name: "fix_world_state"; args: FixWorldStateArgs }
  | { name: "explain_state"; args: ExplainStateArgs };
