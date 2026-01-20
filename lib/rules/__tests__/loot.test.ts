/**
 * Loot Rules Tests
 */

import { describe, it, expect, vi } from "vitest";
import { canGetLoot, getLootOptions, getLootConstraints } from "../loot";

// Mock the cache module
vi.mock("../cache", () => ({
  getLootTableRules: vi.fn().mockResolvedValue([
    {
      id: "1",
      locationType: "forest",
      itemPool: ["herbs", "berries", "wood", "feather"],
      rarityWeights: { common: 0.7, uncommon: 0.25, rare: 0.05, legendary: 0 },
      actionWhitelist: ["search", "forage", "gather"],
    },
    {
      id: "2",
      locationType: "dungeon",
      itemPool: ["gold_small", "potion_minor", "weapon_common"],
      rarityWeights: { common: 0.6, uncommon: 0.3, rare: 0.1, legendary: 0 },
      actionWhitelist: ["search", "loot", "open chest"],
    },
  ]),
}));

describe("Loot Rules", () => {
  describe("canGetLoot", () => {
    it("allows loot with valid action in forest", async () => {
      const result = await canGetLoot("I search the bushes", "forest");
      expect(result).toBe(true);
    });

    it("allows loot with forage action in forest", async () => {
      const result = await canGetLoot("I forage for herbs", "forest");
      expect(result).toBe(true);
    });

    it("rejects loot with invalid action", async () => {
      const result = await canGetLoot("I look around", "forest");
      expect(result).toBe(false);
    });

    it("rejects loot in unknown location type", async () => {
      const result = await canGetLoot("I search", "tavern");
      expect(result).toBe(false);
    });
  });

  describe("getLootOptions", () => {
    it("returns loot options for valid action", async () => {
      const result = await getLootOptions("I search the area", "forest");
      expect(result.canLoot).toBe(true);
      expect(result.availableItems).toContain("herbs");
      expect(result.availableItems).toContain("berries");
      expect(result.rarityWeights?.common).toBe(0.7);
    });

    it("returns canLoot false for invalid action", async () => {
      const result = await getLootOptions("I look around", "forest");
      expect(result.canLoot).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it("returns dungeon loot for dungeon location", async () => {
      const result = await getLootOptions("I loot the chest", "dungeon");
      expect(result.canLoot).toBe(true);
      expect(result.availableItems).toContain("gold_small");
      expect(result.availableItems).toContain("potion_minor");
    });
  });

  describe("getLootConstraints", () => {
    it("returns valid items as options", async () => {
      const constraints = await getLootConstraints("forest");
      expect(constraints.validOptions).toContain("herbs");
      expect(constraints.validOptions).toContain("berries");
    });

    it("returns empty for unknown location", async () => {
      const constraints = await getLootConstraints("unknown");
      expect(constraints.validOptions).toEqual([]);
    });
  });
});
