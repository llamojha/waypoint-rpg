/**
 * Skills Rules Tests
 */

import { describe, it, expect, vi } from "vitest";
import { matchSkillCheckRule, isNoRollAction, getSkillConstraints } from "../skills";

// Mock the cache module
vi.mock("../cache", () => ({
  getSkillCheckRules: vi.fn().mockResolvedValue([
    { id: "1", pattern: "(sneak|hide|creep)", skill: "Sneaking", dcMin: 10, dcMax: 18, requiresRoll: true, contextModifiers: { hostile_npc: 3 } },
    { id: "2", pattern: "(attack|strike|slash)", skill: "Melee", dcMin: 8, dcMax: 15, requiresRoll: true },
    { id: "3", pattern: "(persuade|convince)", skill: "Persuasion", dcMin: 10, dcMax: 20, requiresRoll: true },
  ]),
  getNoRollActionRules: vi.fn().mockResolvedValue([
    { id: "1", pattern: "^(walk|go|travel)", reason: "Movement" },
    { id: "2", pattern: "^(look|examine)", reason: "Observation" },
    { id: "3", pattern: "^(rest|sleep)", reason: "Rest" },
  ]),
}));

describe("Skills Rules", () => {
  describe("matchSkillCheckRule", () => {
    it("matches sneak action to Sneaking skill", async () => {
      const result = await matchSkillCheckRule("I sneak past the guards");
      expect(result).not.toBeNull();
      expect(result?.skill).toBe("Sneaking");
      expect(result?.requiresRoll).toBe(true);
      expect(result?.dcRange.min).toBe(10);
      expect(result?.dcRange.max).toBe(18);
    });

    it("matches attack action to Melee skill", async () => {
      const result = await matchSkillCheckRule("I attack the bandit");
      expect(result).not.toBeNull();
      expect(result?.skill).toBe("Melee");
    });

    it("returns no-roll for movement actions", async () => {
      const result = await matchSkillCheckRule("walk to the tavern");
      expect(result).not.toBeNull();
      expect(result?.requiresRoll).toBe(false);
    });

    it("returns null for unmatched actions", async () => {
      const result = await matchSkillCheckRule("I ponder the meaning of life");
      expect(result).toBeNull();
    });
  });

  describe("isNoRollAction", () => {
    it("returns true for observation actions", async () => {
      const result = await isNoRollAction("look around the room");
      expect(result).toBe(true);
    });

    it("returns true for rest actions", async () => {
      const result = await isNoRollAction("rest by the fire");
      expect(result).toBe(true);
    });

    it("returns false for combat actions", async () => {
      const result = await isNoRollAction("attack the enemy");
      expect(result).toBe(false);
    });
  });

  describe("getSkillConstraints", () => {
    it("applies hostile context modifier", async () => {
      const result = await getSkillConstraints("sneak past", { hostile: true });
      expect(result.bounds).toBeDefined();
      // Base 10-18, hostile adds +2
      expect(result.bounds?.min).toBe(12);
      expect(result.bounds?.max).toBe(20);
    });

    it("applies dark context modifier", async () => {
      const result = await getSkillConstraints("sneak past", { dark: true });
      expect(result.bounds).toBeDefined();
      // Base 10-18, dark adds +3
      expect(result.bounds?.min).toBe(13);
      expect(result.bounds?.max).toBe(21);
    });
  });
});
