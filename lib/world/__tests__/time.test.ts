/**
 * Unit tests for time system
 */

import { describe, it, expect } from "vitest";
import {
  getNextPhase,
  advanceTimeByPhases,
  isRestAction,
  shouldAdvanceTime,
  calculateTimeAdvancement,
  getTimeTransitionDescription,
  PHASE_ORDER,
  type GameTime,
} from "../time";

describe("Time System", () => {
  describe("PHASE_ORDER", () => {
    it("has 5 phases in correct order", () => {
      expect(PHASE_ORDER).toEqual(["Dawn", "Morning", "Afternoon", "Dusk", "Night"]);
    });
  });

  describe("getNextPhase", () => {
    it("advances through phases correctly", () => {
      expect(getNextPhase({ day: 1, phase: "Dawn" })).toEqual({ day: 1, phase: "Morning" });
      expect(getNextPhase({ day: 1, phase: "Morning" })).toEqual({ day: 1, phase: "Afternoon" });
      expect(getNextPhase({ day: 1, phase: "Afternoon" })).toEqual({ day: 1, phase: "Dusk" });
      expect(getNextPhase({ day: 1, phase: "Dusk" })).toEqual({ day: 1, phase: "Night" });
    });

    it("wraps from Night to Dawn and increments day", () => {
      expect(getNextPhase({ day: 1, phase: "Night" })).toEqual({ day: 2, phase: "Dawn" });
      expect(getNextPhase({ day: 5, phase: "Night" })).toEqual({ day: 6, phase: "Dawn" });
    });
  });

  describe("advanceTimeByPhases", () => {
    it("advances by 0 phases (no change)", () => {
      const time: GameTime = { day: 1, phase: "Morning" };
      expect(advanceTimeByPhases(time, 0)).toEqual({ day: 1, phase: "Morning" });
    });

    it("advances by 1 phase", () => {
      expect(advanceTimeByPhases({ day: 1, phase: "Morning" }, 1)).toEqual({ day: 1, phase: "Afternoon" });
    });

    it("advances by 2 phases (rest action)", () => {
      expect(advanceTimeByPhases({ day: 1, phase: "Morning" }, 2)).toEqual({ day: 1, phase: "Dusk" });
    });

    it("handles day rollover correctly", () => {
      // From Dusk, +2 phases = Night, then Dawn (new day)
      expect(advanceTimeByPhases({ day: 1, phase: "Dusk" }, 2)).toEqual({ day: 2, phase: "Dawn" });
    });

    it("handles multiple day rollovers", () => {
      // 5 phases = 1 full day cycle
      expect(advanceTimeByPhases({ day: 1, phase: "Dawn" }, 5)).toEqual({ day: 2, phase: "Dawn" });
      // 10 phases = 2 full day cycles
      expect(advanceTimeByPhases({ day: 1, phase: "Dawn" }, 10)).toEqual({ day: 3, phase: "Dawn" });
    });
  });

  describe("isRestAction", () => {
    it("detects rest keywords", () => {
      expect(isRestAction("I want to rest")).toBe(true);
      expect(isRestAction("I sleep for the night")).toBe(true);
      expect(isRestAction("Let's make camp here")).toBe(true);
      expect(isRestAction("I set up camp")).toBe(true);
      expect(isRestAction("I take a nap")).toBe(true);
    });

    it("is case insensitive", () => {
      expect(isRestAction("I REST here")).toBe(true);
      expect(isRestAction("SLEEP")).toBe(true);
    });

    it("returns false for non-rest actions", () => {
      expect(isRestAction("I attack the goblin")).toBe(false);
      expect(isRestAction("I look around")).toBe(false);
      expect(isRestAction("I talk to the merchant")).toBe(false);
    });
  });

  describe("shouldAdvanceTime", () => {
    it("returns 0 for normal actions before turn 5", () => {
      expect(shouldAdvanceTime(1, "passive", "I look around")).toBe(0);
      expect(shouldAdvanceTime(3, "social", "I talk to the guard")).toBe(0);
      expect(shouldAdvanceTime(4, "combat", "I attack")).toBe(0);
    });

    it("returns 1 every 5 turns", () => {
      expect(shouldAdvanceTime(5, "passive", "I look around")).toBe(1);
      expect(shouldAdvanceTime(10, "passive", "I look around")).toBe(1);
      expect(shouldAdvanceTime(15, "social", "I talk")).toBe(1);
    });

    it("returns 1 for travel actions", () => {
      expect(shouldAdvanceTime(1, "travel", "I go to the market")).toBe(1);
      expect(shouldAdvanceTime(3, "travel", "I travel to the forest")).toBe(1);
    });

    it("returns 2 for rest actions (overrides turn count)", () => {
      expect(shouldAdvanceTime(1, "passive", "I rest here")).toBe(2);
      expect(shouldAdvanceTime(5, "passive", "I sleep")).toBe(2); // Rest takes priority over turn count
    });
  });

  describe("calculateTimeAdvancement", () => {
    it("returns null when no advancement needed", () => {
      const time: GameTime = { day: 1, phase: "Morning" };
      expect(calculateTimeAdvancement(time, 3, "passive", "I look around")).toBeNull();
    });

    it("returns new time when advancement needed", () => {
      const time: GameTime = { day: 1, phase: "Morning" };
      const result = calculateTimeAdvancement(time, 5, "passive", "I look around");
      expect(result).toEqual({ day: 1, phase: "Afternoon" });
    });

    it("handles travel advancement", () => {
      const time: GameTime = { day: 1, phase: "Dawn" };
      const result = calculateTimeAdvancement(time, 1, "travel", "I go to the market");
      expect(result).toEqual({ day: 1, phase: "Morning" });
    });

    it("handles rest advancement", () => {
      const time: GameTime = { day: 1, phase: "Dusk" };
      const result = calculateTimeAdvancement(time, 1, "passive", "I rest for the night");
      expect(result).toEqual({ day: 2, phase: "Dawn" });
    });
  });

  describe("getTimeTransitionDescription", () => {
    it("describes new day transition", () => {
      const from: GameTime = { day: 1, phase: "Night" };
      const to: GameTime = { day: 2, phase: "Dawn" };
      expect(getTimeTransitionDescription(from, to)).toContain("Day 2");
    });

    it("describes phase transitions", () => {
      expect(getTimeTransitionDescription(
        { day: 1, phase: "Dawn" },
        { day: 1, phase: "Morning" }
      )).toContain("morning");

      expect(getTimeTransitionDescription(
        { day: 1, phase: "Dusk" },
        { day: 1, phase: "Night" }
      )).toContain("night");
    });
  });
});
