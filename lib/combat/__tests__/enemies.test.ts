import { describe, it, expect } from "vitest";
import {
  ENEMY_TEMPLATES,
  getEnemyTemplate,
  createCombatEnemy,
  getEnemiesByTier,
} from "../enemies";

describe("enemies", () => {
  describe("ENEMY_TEMPLATES", () => {
    it("contains all expected enemies", () => {
      const expectedEnemies = [
        "Rat", "Snake", "Wolf", "Wild Boar", "Bear", "Pack Alpha",
        "Thief", "Bandit", "Bandit Archer", "Bandit Leader", "Outlaw",
        "Mercenary", "Mercenary Captain", "Bandit King",
      ];
      expectedEnemies.forEach(name => {
        expect(ENEMY_TEMPLATES[name]).toBeDefined();
      });
    });

    it("has valid tier values", () => {
      const validTiers = ["trivial", "easy", "medium", "hard", "elite", "boss"];
      Object.values(ENEMY_TEMPLATES).forEach(template => {
        expect(validTiers).toContain(template.tier);
      });
    });
  });

  describe("getEnemyTemplate", () => {
    it("returns template for valid name", () => {
      const wolf = getEnemyTemplate("Wolf");
      expect(wolf).toBeDefined();
      expect(wolf?.hp).toBe(12);
      expect(wolf?.tier).toBe("easy");
    });

    it("returns undefined for invalid name", () => {
      expect(getEnemyTemplate("Dragon")).toBeUndefined();
    });
  });

  describe("createCombatEnemy", () => {
    it("creates enemy instance from template", () => {
      const enemy = createCombatEnemy("Bandit");
      expect(enemy).not.toBeNull();
      expect(enemy?.name).toBe("Bandit");
      expect(enemy?.hp).toBe(15);
      expect(enemy?.maxHp).toBe(15);
      expect(enemy?.tier).toBe("medium");
    });

    it("uses provided instance ID", () => {
      const enemy = createCombatEnemy("Wolf", "wolf-123");
      expect(enemy?.id).toBe("wolf-123");
    });

    it("returns null for invalid template", () => {
      expect(createCombatEnemy("Goblin")).toBeNull();
    });
  });

  describe("getEnemiesByTier", () => {
    it("returns trivial enemies", () => {
      const trivial = getEnemiesByTier("trivial");
      expect(trivial).toContain("Rat");
      expect(trivial).toContain("Snake");
    });

    it("returns boss enemies", () => {
      const bosses = getEnemiesByTier("boss");
      expect(bosses).toContain("Bandit King");
      expect(bosses).toHaveLength(1);
    });
  });
});
