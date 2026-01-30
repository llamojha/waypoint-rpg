/**
 * Enemy Templates - Medieval-realistic bestiary
 * Based on .kiro/steering/deferred/bestiary.md
 */

export type EnemyTier = "trivial" | "easy" | "medium" | "hard" | "elite" | "boss";

export interface EnemyTemplate {
  name: string;
  tier: EnemyTier;
  hp: number;
  defense: number;
  damage: string;
  xp: number;
  behavior: string;
  abilities?: string[];
  conditions?: string[];
  loot: { gold: string; items: string[] };
}

export interface CombatEnemy {
  id: string;
  templateName: string;
  name: string;
  hp: number;
  maxHp: number;
  tier: EnemyTier;
  defense: number;
  damage: string;
}

export interface ActiveCombat {
  enemies: CombatEnemy[];
  round: number;
}

/**
 * All enemy templates from bestiary.md
 */
export const ENEMY_TEMPLATES: Record<string, EnemyTemplate> = {
  // Wildlife - Trivial
  Rat: {
    name: "Rat",
    tier: "trivial",
    hp: 4,
    defense: 8,
    damage: "1d2",
    xp: 5,
    behavior: "flees when hurt",
    loot: { gold: "0-1", items: [] },
  },
  Snake: {
    name: "Snake",
    tier: "trivial",
    hp: 6,
    defense: 10,
    damage: "1d3",
    xp: 8,
    behavior: "ambush, may poison",
    conditions: ["can_poison"],
    loot: { gold: "0", items: ["Snake Fang"] },
  },

  // Wildlife - Easy
  Wolf: {
    name: "Wolf",
    tier: "easy",
    hp: 12,
    defense: 11,
    damage: "1d6",
    xp: 20,
    behavior: "pack tactics, calls allies",
    loot: { gold: "0", items: ["Wolf Pelt", "Wolf Fang"] },
  },

  // Wildlife - Medium
  "Wild Boar": {
    name: "Wild Boar",
    tier: "medium",
    hp: 18,
    defense: 12,
    damage: "1d8",
    xp: 30,
    behavior: "charges, aggressive when cornered",
    loot: { gold: "0", items: ["Boar Tusk", "Raw Meat"] },
  },

  // Wildlife - Hard
  Bear: {
    name: "Bear",
    tier: "hard",
    hp: 35,
    defense: 13,
    damage: "2d6",
    xp: 60,
    behavior: "territorial, mauls on crit",
    conditions: ["can_bleed"],
    loot: { gold: "0", items: ["Bear Pelt", "Bear Claw"] },
  },

  // Wildlife - Elite
  "Pack Alpha": {
    name: "Pack Alpha",
    tier: "elite",
    hp: 45,
    defense: 14,
    damage: "2d6+2",
    xp: 100,
    behavior: "commands pack, howls for reinforcements",
    abilities: ["Howl: summons 1d2 wolves"],
    loot: { gold: "0", items: ["Alpha Pelt", "Alpha Fang"] },
  },

  // Humanoids - Easy
  Thief: {
    name: "Thief",
    tier: "easy",
    hp: 10,
    defense: 12,
    damage: "1d4",
    xp: 15,
    behavior: "steals items, flees when losing",
    abilities: ["Pickpocket: may steal 1d10 gold on hit"],
    loot: { gold: "5-20", items: ["Lockpick"] },
  },

  // Humanoids - Medium
  Bandit: {
    name: "Bandit",
    tier: "medium",
    hp: 15,
    defense: 12,
    damage: "1d6+1",
    xp: 25,
    behavior: "demands toll, fights if refused",
    loot: { gold: "10-30", items: ["Rusty Sword", "Leather Scraps"] },
  },
  "Bandit Archer": {
    name: "Bandit Archer",
    tier: "medium",
    hp: 12,
    defense: 11,
    damage: "1d8",
    xp: 25,
    behavior: "keeps distance, retreats if approached",
    loot: { gold: "10-25", items: ["Shortbow", "Arrows"] },
  },

  // Humanoids - Hard
  "Bandit Leader": {
    name: "Bandit Leader",
    tier: "hard",
    hp: 30,
    defense: 14,
    damage: "1d8+2",
    xp: 50,
    behavior: "commands bandits, tactical",
    abilities: ["Rally: nearby bandits gain +2 damage for 1 turn"],
    loot: { gold: "50-100", items: ["Steel Sword", "Bandit's Key"] },
  },
  Outlaw: {
    name: "Outlaw",
    tier: "hard",
    hp: 25,
    defense: 13,
    damage: "1d8+1",
    xp: 45,
    behavior: "wanted criminal, fights to death",
    loot: { gold: "30-75", items: ["Bounty Notice", "Quality Dagger"] },
  },

  // Humanoids - Elite
  Mercenary: {
    name: "Mercenary",
    tier: "elite",
    hp: 40,
    defense: 15,
    damage: "1d10+2",
    xp: 80,
    behavior: "professional, uses tactics",
    abilities: ["Disarm: may knock weapon from player's hand"],
    loot: { gold: "75-150", items: ["Mercenary Blade", "Chainmail Scraps"] },
  },
  "Mercenary Captain": {
    name: "Mercenary Captain",
    tier: "elite",
    hp: 55,
    defense: 16,
    damage: "2d6+3",
    xp: 120,
    behavior: "commands squad, strategic",
    abilities: ["Command: allies attack twice", "Parry: +4 defense"],
    loot: { gold: "150-300", items: ["Captain's Blade", "Signet Ring"] },
  },

  // Boss
  "Bandit King": {
    name: "Bandit King",
    tier: "boss",
    hp: 100,
    defense: 17,
    damage: "2d8+4",
    xp: 500,
    behavior: "ruthless leader, multiple phases",
    abilities: [
      "Call Reinforcements: summons 2 bandits",
      "Intimidating Presence: player must pass check or -2 to attacks",
      "Desperate Strike: +50% damage when below 25% HP",
    ],
    loot: { gold: "500-1000", items: ["Bandit King's Crown", "Vault Key", "Royal Decree"] },
  },
};

/**
 * Get enemy template by name
 */
export function getEnemyTemplate(name: string): EnemyTemplate | undefined {
  return ENEMY_TEMPLATES[name];
}

/**
 * Create a combat enemy instance from a template
 */
export function createCombatEnemy(templateName: string, instanceId?: string): CombatEnemy | null {
  const template = getEnemyTemplate(templateName);
  if (!template) return null;

  return {
    id: instanceId || `${templateName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
    templateName,
    name: template.name,
    hp: template.hp,
    maxHp: template.hp,
    tier: template.tier,
    defense: template.defense,
    damage: template.damage,
  };
}

/**
 * Get all enemy names by tier
 */
export function getEnemiesByTier(tier: EnemyTier): string[] {
  return Object.keys(ENEMY_TEMPLATES).filter(name => ENEMY_TEMPLATES[name].tier === tier);
}
