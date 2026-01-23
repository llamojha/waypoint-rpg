/**
 * Unit Tests: Skill XP System
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  xpForLevel,
  levelFromXp,
  calculateSkillXP,
  applyDiminishingReturns,
  clearDiminishingReturns,
  awardSkillXP,
} from "../skill-xp";

describe("Skill XP System", () => {
  beforeEach(() => {
    clearDiminishingReturns();
  });

  describe("xpForLevel", () => {
    it("returns 0 for level 1", () => {
      expect(xpForLevel(1)).toBe(0);
    });

    it("returns correct XP for level 2", () => {
      expect(xpForLevel(2)).toBe(83);
    });

    it("returns correct XP for level 10", () => {
      expect(xpForLevel(10)).toBe(1154);
    });

    it("increases exponentially", () => {
      const xp10 = xpForLevel(10);
      const xp20 = xpForLevel(20);
      const xp30 = xpForLevel(30);
      
      expect(xp20 - xp10).toBeGreaterThan(xp10);
      expect(xp30 - xp20).toBeGreaterThan(xp20 - xp10);
    });
  });

  describe("levelFromXp", () => {
    it("returns level 1 for 0 XP", () => {
      expect(levelFromXp(0)).toBe(1);
    });

    it("returns level 2 for 83 XP", () => {
      expect(levelFromXp(83)).toBe(2);
    });

    it("returns level 2 for 100 XP (between thresholds)", () => {
      expect(levelFromXp(100)).toBe(2);
    });

    it("returns level 10 for 1154 XP", () => {
      expect(levelFromXp(1154)).toBe(10);
    });
  });

  describe("calculateSkillXP", () => {
    it("returns 15-50 XP for success based on DC", () => {
      const lowDc = calculateSkillXP(5, undefined, true);
      const highDc = calculateSkillXP(20, undefined, true);
      
      expect(lowDc).toBeGreaterThanOrEqual(15);
      expect(highDc).toBeLessThanOrEqual(50);
      expect(highDc).toBeGreaterThan(lowDc);
    });

    it("returns 5-15 XP for failure", () => {
      const lowDc = calculateSkillXP(5, undefined, false);
      const highDc = calculateSkillXP(20, undefined, false);
      
      expect(lowDc).toBeGreaterThanOrEqual(5);
      expect(highDc).toBeLessThanOrEqual(15);
    });

    it("adds tier bonus (+5 per tier)", () => {
      const noTier = calculateSkillXP(10, undefined, true);
      const tier1 = calculateSkillXP(10, 1, true);
      const tier2 = calculateSkillXP(10, 2, true);
      const tier3 = calculateSkillXP(10, 3, true);
      
      expect(tier1 - noTier).toBe(5);
      expect(tier2 - tier1).toBe(5);
      expect(tier3 - tier2).toBe(5);
    });
  });

  describe("applyDiminishingReturns", () => {
    it("returns 1.0 for first use", () => {
      const mult = applyDiminishingReturns("test-char", "Melee");
      expect(mult).toBeCloseTo(1.0, 1);
    });

    it("reduces multiplier for repeated use", () => {
      applyDiminishingReturns("test-char", "Melee");
      const mult2 = applyDiminishingReturns("test-char", "Melee");
      
      expect(mult2).toBeLessThan(1.0);
    });

    it("gives variety bonus for different skills", () => {
      // Use 3 different skills
      applyDiminishingReturns("test-char", "Melee");
      applyDiminishingReturns("test-char", "Ranged");
      applyDiminishingReturns("test-char", "Blocking");
      
      // 4th different skill should get variety bonus
      const mult = applyDiminishingReturns("test-char", "Perception");
      expect(mult).toBeGreaterThan(1.0);
    });

    it("floors at 30%", () => {
      // Use same skill many times
      for (let i = 0; i < 10; i++) {
        applyDiminishingReturns("test-char", "Melee");
      }
      const mult = applyDiminishingReturns("test-char", "Melee");
      expect(mult).toBeGreaterThanOrEqual(0.3);
    });
  });

  describe("awardSkillXP", () => {
    it("awards XP and returns updated skills", () => {
      const skills = { Melee: { level: 0, xp: 0, nextLevel: 83, verbs: [] } };
      const result = awardSkillXP("test-char", skills, "Melee", 10, 1, true);
      
      expect(result.xpGained).toBeGreaterThan(0);
      expect(result.updatedSkills.Melee.xp).toBe(result.xpGained);
      expect(result.diffs.length).toBe(1);
      expect(result.diffs[0].type).toBe("skill");
    });

    it("handles level up", () => {
      // Start with XP just below level 2 threshold
      const skills = { Melee: { level: 1, xp: 80, nextLevel: 83, verbs: [] } };
      const result = awardSkillXP("test-char", skills, "Melee", 15, 2, true);
      
      // Should level up (80 + ~30 XP > 83)
      if (result.xpGained >= 3) {
        expect(result.leveledUp).toBe(true);
        expect(result.updatedSkills.Melee.level).toBe(2);
        expect(result.diffs[0].text).toContain("Level Up");
      }
    });

    it("initializes missing skill", () => {
      const skills = {};
      const result = awardSkillXP("test-char", skills, "Ranged", 10, 1, true);
      
      expect(result.updatedSkills.Ranged).toBeDefined();
      expect(result.updatedSkills.Ranged.xp).toBe(result.xpGained);
    });

    it("unlocks verbs at tier thresholds", () => {
      // Start at level 3, should have tier1 verbs
      const skills = { Melee: { level: 3, xp: 250, nextLevel: 276, verbs: [] } };
      const result = awardSkillXP("test-char", skills, "Melee", 10, 1, true);
      
      // Should have tier1 verbs (strike, slash, thrust)
      expect(result.updatedSkills.Melee.verbs).toContain("strike");
    });
  });
});
