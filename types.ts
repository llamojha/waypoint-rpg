export interface Character {
  id?: string;
  name: string;
  gender?: string; // Optional, free-form
  portraitUrl?: string;
  hp: number;
  maxHp: number;
  gold: number;
  skills: Record<string, SkillProgression>;
  equipment: Equipment;
  inventory: Item[];
  conditions: Condition[];
  isMagicUnlocked: boolean;
}

export interface SkillProgression {
  level: number;
  xp: number;
  nextLevel: number;
  verbs: string[]; // Unlocked actions e.g., "Track", "Identify"
}

export interface SkillTier {
  words: string[];
}

export interface SkillDefinition {
  name: string;
  tier1: string[];
  tier2: string[];
  tier3: string[];
  aliases: string[];
}

export interface SkillPillar {
  pillar: string;
  skills: SkillDefinition[];
}

export interface Condition {
  id: string;
  name: string;
  type: "buff" | "debuff" | "neutral";
  description: string;
  duration?: string; // "Until Long Rest"
}

export interface Equipment {
  mainHand: Item | null;
  offHand: Item | null;
  head: Item | null;
  chest: Item | null;
  arms: Item | null;
  legs: Item | null;
  cloak: Item | null;
  trinket: Item | null;
}

// Spells will be added post-MVP when magic system is unlocked
// export interface Spell {
//   id: string;
//   name: string;
//   level: number;
//   school: string;
//   description: string;
//   cost: string;
// }

export interface Item {
  id: string;
  name: string;
  type: "weapon" | "armor" | "consumable" | "quest" | "trinket" | "misc";
  slot?: keyof Equipment; // Optional hint for auto-equip
  tags: string[];
  description: string;
  provenance?: string; // Who owned it before
  isCanon?: boolean; // If true, links to Codex
  stats?: {
    ac?: number;
    damage?: string;
    value?: number;
    healing?: string; // e.g., "2d4" for consumables
  };
  skillBonuses?: Record<string, number>; // e.g., { "Lockpicking": 2 }
  passiveEffect?: string; // Flavor text, e.g., "Grants night vision"
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  status: "active" | "completed" | "failed";
  progress: number;
  totalProgress: number;
  leads: string[];
}

export interface NPC {
  id: string;
  name: string;
  role: string;
  portraitUrl?: string;
  relationship: number; // -25 to +25
  location: string;
  personality?: string[];
  notes: string[];
  history: string[]; // "Betrayed at the bridge", "Gave a potion"
}

export interface TurnDiff {
  type:
    | "news"
    | "quest"
    | "relationship"
    | "inventory"
    | "stat"
    | "world"
    | "skill"
    | "npc";
  text: string;
  value?: string | number;
}

export interface AgentTrace {
  agent: "sentinel" | "rune_marshal" | "orchestrator" | "arbiter" | "lorekeeper" | "quest_agent" | "collector" | "apply_state" | "chronicler" | "state_snapshot" | "world_time";
  status: "success" | "error" | "skipped";
  durationMs?: number;
  description: string;
  details?: string[];
  error?: string;
}

export interface Turn {
  id: string;
  timestamp: number;
  playerAction: string;
  narration: string;
  isStreaming: boolean;
  mechanics?: {
    type: "check";
    skill: string;
    dc: number;
    rolled?: number;
    modifier?: number;
    total?: number;
    outcome?: "success" | "failure";
  };
  suggestedActions: string[];
  diffs: TurnDiff[];
  trace?: AgentTrace[];
}

export interface WorldContext {
  name: string;
  region: string;
  poi: string;
  time: {
    day: number;
    phase: string; // "Dawn", "Morning", "Afternoon", "Dusk", "Night"
  };
  weather: string;
  description: string;
  imageUrl?: string;
  tags: WorldTag[];
  nearbyPoi: string[];
  entities: string[]; // IDs of NPCs present
  memory: WorldMemory[];
  activeCombat: ActiveCombat | null;
}

export interface ActiveCombat {
  enemies: CombatEnemy[];
  round: number;
}

export interface CombatEnemy {
  id: string;
  templateName: string;
  name: string;
  hp: number;
  maxHp: number;
  tier: 'trivial' | 'easy' | 'medium' | 'hard' | 'elite' | 'boss';
  defense: number;
  damage: string;
}

export interface WorldTag {
  name: string;
  type: "canon" | "claim";
  description?: string;
}

export interface WorldMemory {
  id: string;
  title: string;
  text: string;
  type: "canon" | "news";
  status: "unverified" | "corroborated" | "canonized";
}

export interface MapLocation {
  id: string;
  name: string;
  type: "city" | "ruin" | "forest" | "mountain" | "poi";
  coordinates: { x: number; y: number };
  status: "visited" | "known" | "unknown" | "locked";
  description: string;
  region?: string;
  artUrl?: string;
}

export interface CodexEntry {
  id: string;
  title: string;
  category: "Bestiary" | "Factions" | "Locations" | "History" | "Magic";
  text: string;
  status: "canon" | "rumor";
  tags: string[];
  imageUrl?: string;
}

export interface Session {
  id: string;
  title: string;
  date: string;
  summary: string;
  location: string;
  status: "active" | "completed";
}

export interface GameState {
  character: Character;
  quests: Quest[];
  npcs: NPC[];
  turns: Turn[];
  world: WorldContext;
  sessions: Session[];
}
