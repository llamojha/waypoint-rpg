/**
 * Affordances Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildAffordances, constrainTools, formatAffordancesForPrompt, validateSkillForActionType } from "../affordances";
import type { Character, WorldContext } from "@/types";
import { Type } from "@google/genai";
import type { FunctionDeclaration } from "@google/genai";

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
  equipment: {
    mainHand: null,
    offHand: null,
    head: null,
    chest: null,
    arms: null,
    legs: null,
    cloak: null,
    trinket: null,
  },
  inventory: [
    { id: "sword-1", name: "Iron Sword", type: "weapon", description: "A sturdy iron sword", tags: [] },
    { id: "potion-1", name: "Health Potion", type: "consumable", description: "Restores health", tags: [] },
  ],
  conditions: [],
  isMagicUnlocked: false,
};

const mockWorld: WorldContext = {
  name: "Waystone Plaza",
  region: "Ash Coast",
  poi: "Waystone Plaza",
  time: { day: 1, phase: "Morning" },
  weather: "Clear",
  description: "A bustling plaza",
  tags: [],
  nearbyPoi: ["Temple Quarter"],
  entities: ["Lucie", "Merchant Gorm"],
  memory: [],
  activeCombat: null,
};

const mockWorldWithCombat: WorldContext = {
  ...mockWorld,
  activeCombat: {
    enemies: [
      { id: "bandit-1", templateName: "bandit_scout", name: "Bandit Scout", hp: 8, maxHp: 8, tier: "easy", defense: 10, damage: "1d4" },
      { id: "bandit-2", templateName: "bandit_warrior", name: "Bandit Warrior", hp: 12, maxHp: 12, tier: "medium", defense: 12, damage: "1d6" },
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
      
      expect(affordances.enemyIds).toContain("Bandit Scout");
      expect(affordances.enemyIds).toContain("Bandit Warrior");
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
    const mockLocationTool: FunctionDeclaration = {
      name: "propose_location_change",
      description: "Change location",
      parameters: {
        type: Type.OBJECT,
        properties: {
          location: { type: Type.STRING, description: "Destination" },
          reason: { type: Type.STRING, description: "Why" },
        },
        required: ["location", "reason"],
      },
    };

    const mockCombatTool: FunctionDeclaration = {
      name: "propose_combat_damage",
      description: "Deal damage",
      parameters: {
        type: Type.OBJECT,
        properties: {
          enemy_name: { type: Type.STRING, description: "Target" },
          damage: { type: Type.NUMBER, description: "Amount" },
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
        enemyIds: ["Bandit Scout", "Bandit Warrior"],
        itemIds: [],
      };

      const constrained = constrainTools([mockCombatTool], affordances);
      
      expect(constrained[0].parameters?.properties?.enemy_name).toHaveProperty("enum");
      expect((constrained[0].parameters?.properties?.enemy_name as { enum?: string[] }).enum).toEqual(["Bandit Scout", "Bandit Warrior"]);
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
      const unrelatedTool: FunctionDeclaration = {
        name: "propose_stat_change",
        description: "Change stats",
        parameters: {
          type: Type.OBJECT,
          properties: {
            stat: { type: Type.STRING, enum: ["hp", "gold"] },
            delta: { type: Type.NUMBER },
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
