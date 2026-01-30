/**
 * Unit tests for combat-related apply functions
 */

import { describe, it, expect } from "vitest";
import { applyEvents } from "../apply";
import type { Character, WorldContext } from "@/types";
import type { CombatStartEvent, CombatDamageEvent } from "../validate";

const mockCharacter: Character = {
  name: "Test",
  hp: 20,
  maxHp: 20,
  gold: 10,
  skills: {},
  equipment: { mainHand: null, offHand: null, head: null, chest: null, arms: null, legs: null, cloak: null, trinket: null },
  inventory: [],
  conditions: [],
  isMagicUnlocked: false,
};

const mockWorld: WorldContext = {
  name: "Test World",
  region: "Test Region",
  poi: "Test Location",
  time: { day: 1, phase: "Morning" },
  weather: "Clear",
  description: "",
  tags: [],
  nearbyPoi: [],
  entities: [],
  memory: [],
  activeCombat: null,
};

describe("applyEvents - combat_start", () => {
  it("should spawn enemies from templates", () => {
    const event: CombatStartEvent = {
      type: "combat_start",
      enemies: ["Wolf", "Bandit"],
      reason: "ambush",
    };

    const result = applyEvents(mockCharacter, mockWorld, [event]);

    expect(result.worldUpdates.activeCombat).toBeDefined();
    expect(result.worldUpdates.activeCombat?.enemies).toHaveLength(2);
    expect(result.worldUpdates.activeCombat?.round).toBe(1);
    
    const wolf = result.worldUpdates.activeCombat?.enemies.find(e => e.templateName === "Wolf");
    expect(wolf).toBeDefined();
    expect(wolf?.hp).toBe(wolf?.maxHp);
  });

  it("should add combat_started consequence", () => {
    const event: CombatStartEvent = {
      type: "combat_start",
      enemies: ["Wolf"],
      reason: "entered territory",
    };

    const result = applyEvents(mockCharacter, mockWorld, [event]);

    const consequence = result.consequences.find(c => c.type === "combat_started");
    expect(consequence).toBeDefined();
    expect(consequence?.reason).toBe("entered territory");
  });

  it("should add world diff for combat start", () => {
    const event: CombatStartEvent = {
      type: "combat_start",
      enemies: ["Rat"],
      reason: "disturbed nest",
    };

    const result = applyEvents(mockCharacter, mockWorld, [event]);

    const diff = result.diffs.find(d => d.text === "Combat started");
    expect(diff).toBeDefined();
    expect(diff?.type).toBe("world");
  });

  it("should skip invalid enemy templates", () => {
    const event: CombatStartEvent = {
      type: "combat_start",
      enemies: ["InvalidEnemy", "Wolf"],
      reason: "test",
    };

    const result = applyEvents(mockCharacter, mockWorld, [event]);

    // Only Wolf should be spawned
    expect(result.worldUpdates.activeCombat?.enemies).toHaveLength(1);
    expect(result.worldUpdates.activeCombat?.enemies[0].templateName).toBe("Wolf");
  });

  it("should not create combat if all enemies invalid", () => {
    const event: CombatStartEvent = {
      type: "combat_start",
      enemies: ["InvalidEnemy"],
      reason: "test",
    };

    const result = applyEvents(mockCharacter, mockWorld, [event]);

    expect(result.worldUpdates.activeCombat).toBeUndefined();
    expect(result.consequences).toHaveLength(0);
  });

  it("should add enemy_defeated consequence when HP reaches 0", () => {
    const worldWithCombat: WorldContext = {
      ...mockWorld,
      activeCombat: {
        enemies: [{
          id: "rat-1",
          templateName: "Rat",
          name: "Rat",
          hp: 2,
          maxHp: 4,
          tier: "trivial",
          defense: 8,
          damage: "1d2",
        }],
        round: 1
      }
    };

    const event: CombatDamageEvent = {
      type: "combat_damage",
      damage: 5,
      target: "Rat",
      reason: "test attack",
    };

    const result = applyEvents(mockCharacter, worldWithCombat, [event]);

    const consequence = result.consequences.find(c => c.type === "enemy_defeated");
    expect(consequence).toBeDefined();
  });
});
