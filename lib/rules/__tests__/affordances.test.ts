/**
 * Affordances Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildAffordances, constrainTools, formatAffordancesForPrompt, validateSkillForActionType } from "../affordances";
import type { Character, WorldContext } from "@/types";

// Mock the cache module
vi.mock("../cache", () => ({
  getLocationConnectionRules: vi.fn().mockResolvedValue([
    { fromLocation: "Waystone Plaza", toLocation: "Market District" },
    { fromLocation: "Waystone Plaza", toLocation: "Harbor" },
    { fromLocation: "Market District", toLocation: "Waystone Plaza" },
  ]),
}));

const mockCharacter: Character = {
  id: "char-1",
  name: "Test Hero",
  hp: 20,
  maxHp: 20,
  gold: 100,
  skills: {},
  equipment: {},
  inventory: [
    { id: "sword-1", name: "Iron Sword", type: "weapon", rarity: "common" },
    { id: "potion-1", name: "Health Potion", type: "consumable", rarity: "common" },
  ],
  conditions: [],
  isMagicUnlocked: false,
};

const mockWorld: WorldContext = {
  region: "Ash Coast",
  poi: "Waystone Plaza",
  time: { day: 1, phase: "Morning" },
  weather: "Clear",
  description: "A bustling plaza",
  nearbyPoi: ["Temple Quarter"],
  entities: ["Lucie", "Merchant Gorm"],
  memories: [],
};

const mockWorldWithCombat: WorldContext = {
  ...mockWorld,
  activeCombat: {
    enemies: [
      { id: "goblin-1", name: "Goblin Scout", hp: 8, maxHp: 8, tier: "minion" },
      { id: "goblin-2", name: "Goblin Warrior", hp: 12, maxHp: 12, tier: "standard" },
    ],
    round: 1,
  },
};

describe("Affordances", () => {
  describe("buildAffordances", () => {
    it("returns location IDs for travel action", async () => {
      const affordances = await buildAffordances(mockCharacter, mockWorld, "travel");
      
      expect(affordances.locationIds).toContain("Market District");
      expect(affordances.locationIds).toContain("Harbor");
      // Also includes nearbyPoi as fallback
      expect(affordances.locationIds).toContain("Temple Quarter");
    });

    it("returns empty location IDs for non-travel actions", async () => {
      const affordances = await buildAffordances(mockCharacter, mockWorld, "social");
      expect(affordances.locationIds).toEqual([]);
    });

    it("returns NPC IDs from world entities", async () => {
      const affordances = await buildAffordances(mockCharacter, mockWorld, "social");
      
      expect(affordances.npcIds).toContain("Lucie");
      expect(affordances.npcIds).toContain("Merchant Gorm");
    });

    it("returns enemy IDs from active combat", async () => {
      const affordances = await buildAffordances(mockCharacter, mockWorldWithCombat, "combat");
      
      expect(affordances.enemyIds).toContain("Goblin Scout");
      expect(affordances.enemyIds).toContain("Goblin Warrior");
    });

    it("returns empty enemy IDs when no combat", async () => {
      const affordances = await buildAffordances(mockCharacter, mockWorld, "combat");
      expect(affordances.enemyIds).toEqual([]);
    });

    it("returns item IDs from inventory", async () => {
      const affordances = await buildAffordances(mockCharacter, mockWorld, "object");
      
      expect(affordances.itemIds).toContain("Iron Sword");
      expect(affordances.itemIds).toContain("Health Potion");
    });
  });

  describe("constrainTools", () => {
    const mockLocationTool = {
      name: "propose_location_change",
      description: "Change location",
      parameters: {
        type: "OBJECT" as const,
        properties: {
          location: { type: "STRING" as const, description: "Destination" },
          reason: { type: "STRING" as const, description: "Why" },
        },
        required: ["location", "reason"],
      },
    };

    const mockCombatTool = {
      name: "propose_combat_damage",
      description: "Deal damage",
      parameters: {
        type: "OBJECT" as const,
        properties: {
          enemy_name: { type: "STRING" as const, description: "Target" },
          damage: { type: "NUMBER" as const, description: "Amount" },
        },
        required: ["enemy_name", "damage"],
      },
    };

    it("injects location enum into propose_location_change", () => {
      const affordances = {
        locationIds: ["Market District", "Harbor"],
        npcIds: [],
        enemyIds: [],
        itemIds: [],
      };

      const constrained = constrainTools([mockLocationTool], affordances);
      
      expect(constrained[0].parameters?.properties?.location).toHaveProperty("enum");
      expect((constrained[0].parameters?.properties?.location as { enum?: string[] }).enum).toEqual(["Market District", "Harbor"]);
    });

    it("injects enemy enum into propose_combat_damage", () => {
      const affordances = {
        locationIds: [],
        npcIds: [],
        enemyIds: ["Goblin Scout", "Goblin Warrior"],
        itemIds: [],
      };

      const constrained = constrainTools([mockCombatTool], affordances);
      
      expect(constrained[0].parameters?.properties?.enemy_name).toHaveProperty("enum");
      expect((constrained[0].parameters?.properties?.enemy_name as { enum?: string[] }).enum).toEqual(["Goblin Scout", "Goblin Warrior"]);
    });

    it("does not modify tools when affordances are empty", () => {
      const affordances = {
        locationIds: [],
        npcIds: [],
        enemyIds: [],
        itemIds: [],
      };

      const constrained = constrainTools([mockLocationTool], affordances);
      
      // Should return original tool unchanged
      expect(constrained[0].parameters?.properties?.location).not.toHaveProperty("enum");
    });

    it("does not modify unrelated tools", () => {
      const unrelatedTool = {
        name: "propose_stat_change",
        description: "Change stats",
        parameters: {
          type: "OBJECT" as const,
          properties: {
            stat: { type: "STRING" as const, enum: ["hp", "gold"] },
            delta: { type: "NUMBER" as const },
          },
          required: ["stat", "delta"],
        },
      };

      const affordances = {
        locationIds: ["Market District"],
        npcIds: [],
        enemyIds: [],
        itemIds: [],
      };

      const constrained = constrainTools([unrelatedTool], affordances);
      
      // Should be unchanged
      expect(constrained[0]).toEqual(unrelatedTool);
    });
  });

  describe("formatAffordancesForPrompt", () => {
    it("formats location affordances", () => {
      const affordances = {
        locationIds: ["Market District", "Harbor"],
        npcIds: [],
        enemyIds: [],
        itemIds: [],
      };

      const text = formatAffordancesForPrompt(affordances);
      
      expect(text).toContain("Valid travel destinations");
      expect(text).toContain("Market District");
      expect(text).toContain("Harbor");
    });

    it("formats enemy affordances", () => {
      const affordances = {
        locationIds: [],
        npcIds: [],
        enemyIds: ["Goblin Scout", "Goblin Warrior"],
        itemIds: [],
      };

      const text = formatAffordancesForPrompt(affordances);
      
      expect(text).toContain("Valid combat targets");
      expect(text).toContain("Goblin Scout");
    });

    it("returns empty string when no affordances", () => {
      const affordances = {
        locationIds: [],
        npcIds: [],
        enemyIds: [],
        itemIds: [],
      };

      const text = formatAffordancesForPrompt(affordances);
      expect(text).toBe("");
    });
  });
});


describe("validateSkillForActionType", () => {
  it("validates combat skills for combat action", () => {
    expect(validateSkillForActionType("Melee", "combat").valid).toBe(true);
    expect(validateSkillForActionType("Ranged", "combat").valid).toBe(true);
    expect(validateSkillForActionType("Blocking", "combat").valid).toBe(true);
  });

  it("validates social skills for social action", () => {
    expect(validateSkillForActionType("Persuasion", "social").valid).toBe(true);
    expect(validateSkillForActionType("Intimidation", "social").valid).toBe(true);
    expect(validateSkillForActionType("Insight", "social").valid).toBe(true);
  });

  it("validates travel skills for travel action", () => {
    expect(validateSkillForActionType("Navigation", "travel").valid).toBe(true);
    expect(validateSkillForActionType("Athletics", "travel").valid).toBe(true);
    expect(validateSkillForActionType("Sneaking", "travel").valid).toBe(true);
  });

  it("flags mismatched skill/action combinations", () => {
    // Melee is Combat pillar, not valid for social
    const result = validateSkillForActionType("Melee", "social");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("Melee");
    expect(result.suggestedPillars).toContain("Charisma");
  });

  it("allows unknown skills", () => {
    expect(validateSkillForActionType("UnknownSkill", "combat").valid).toBe(true);
  });

  it("validates object manipulation skills", () => {
    expect(validateSkillForActionType("Lockpicking", "object").valid).toBe(true);
    expect(validateSkillForActionType("Perception", "object").valid).toBe(true);
  });
});
