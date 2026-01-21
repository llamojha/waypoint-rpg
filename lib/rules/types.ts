/**
 * Rules Engine Types
 * Base types for deterministic game mechanics validation
 */

// ============================================
// Core Types
// ============================================

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  modified?: unknown; // For capping/adjusting values
}

export interface RuleConstraints {
  /** Valid options the LLM can choose from */
  validOptions?: string[];
  /** Bounds for numeric values */
  bounds?: { min: number; max: number };
  /** Required conditions that must be met */
  requires?: string[];
  /** Context to inject into prompts */
  context?: string;
}

// ============================================
// Quest Rules
// ============================================

export type QuestGoalType = "exploration" | "dialogue" | "fetch" | "combat" | "discover" | "deliver";
export type EventType = "location_change" | "relationship_change" | "inventory_add" | "inventory_remove" | "stat_change" | "enemy_defeated" | "npc_discovered";

export interface QuestGoalRule {
  id: string;
  goalType: QuestGoalType;
  requiredEventType: EventType;
  validationPattern?: {
    /** Field to match in the event */
    field: string;
    /** How to match: contains, equals, regex */
    match: "contains" | "equals" | "regex";
  };
}

export interface QuestValidationContext {
  questId: string;
  questTitle: string;
  currentGoal: string;
  goalType: QuestGoalType;
  /** Events proposed in the same turn */
  proposedEvents: Array<{ type: string; data: Record<string, unknown> }>;
}

// ============================================
// Skill Check Rules
// ============================================

export interface SkillCheckRule {
  id: string;
  pattern: string; // Regex pattern
  skill: string;
  dcMin: number;
  dcMax: number;
  requiresRoll: boolean;
  contextModifiers?: Record<string, number>; // e.g., { "hostile_npc": 3, "dark": 2 }
}

export interface NoRollActionRule {
  id: string;
  pattern: string; // Regex pattern
  reason: string;
}

export interface SkillCheckResult {
  skill: string;
  dcRange: { min: number; max: number };
  requiresRoll: boolean;
  suggestedDc?: number;
  modifiers?: Record<string, number>;
}

// ============================================
// Relationship Rules
// ============================================

export type InteractionType = 
  | "greeting" 
  | "small_talk" 
  | "help_minor" 
  | "help_major" 
  | "gift_common" 
  | "gift_valuable"
  | "insult_minor"
  | "insult_major"
  | "attack"
  | "betrayal";

export interface RelationshipRule {
  id: string;
  interactionType: InteractionType;
  deltaMin: number;
  deltaMax: number;
  keywords: string[]; // Keywords that indicate this interaction type
}

export interface RelationshipBounds {
  interactionType: InteractionType;
  deltaMin: number;
  deltaMax: number;
}

// ============================================
// Location Rules
// ============================================

export interface LocationConnection {
  id: string;
  fromLocation: string;
  toLocation: string;
  requirements?: {
    quest?: string; // Quest ID or title required
    reputation?: { npc: string; min: number };
    item?: string; // Item required in inventory
  };
  travelTime?: number; // Phases to travel
}

export interface TravelValidationResult extends ValidationResult {
  travelTime?: number;
  unmetRequirements?: string[];
}

// ============================================
// Loot Rules
// ============================================

export interface LootTable {
  id: string;
  locationType: string;
  itemPool: string[];
  rarityWeights: {
    common: number;
    uncommon: number;
    rare: number;
    legendary: number;
  };
  actionWhitelist: string[]; // Actions that can yield loot
}

export interface LootOptions {
  canLoot: boolean;
  reason?: string;
  availableItems?: string[];
  rarityWeights?: LootTable["rarityWeights"];
}

// ============================================
// Rules Engine Context
// ============================================

export interface RulesContext {
  /** Quest-related constraints */
  quest?: {
    canProgress: boolean;
    reason?: string;
    requiredEvent?: EventType;
  };
  /** Skill check constraints */
  skillCheck?: SkillCheckResult;
  /** Relationship constraints */
  relationship?: {
    bounds: RelationshipBounds;
    npcDisposition?: string;
  };
  /** Location constraints */
  location?: {
    validDestinations: string[];
    blockedDestinations?: Array<{ location: string; reason: string }>;
  };
  /** Loot constraints */
  loot?: LootOptions;
}

// ============================================
// Game State for Rules Evaluation
// ============================================

export interface RulesGameState {
  character: {
    id: string;
    inventory: Array<{ name: string }>;
    gold: number;
  };
  world: {
    poi: string;
    region: string;
    nearbyPoi: string[];
    entities: string[];
    weather?: string;
    time?: { phase: string };
  };
  activeQuests: Array<{
    id: string;
    title: string;
    currentGoal: string;
    goalType: QuestGoalType;
    progress: number;
  }>;
  npcRelationships: Record<string, number>;
}
