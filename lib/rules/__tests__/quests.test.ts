/**
 * Quest Rules Tests
 */

import { describe, it, expect, vi } from "vitest";
import { validateQuestProgress, getQuestConstraints } from "../quests";
import type { QuestValidationContext } from "../types";

// Mock the cache module
vi.mock("../cache", () => ({
  getQuestGoalRules: vi.fn().mockResolvedValue([
    { id: "1", goalType: "exploration", requiredEventType: "location_change" },
    { id: "2", goalType: "dialogue", requiredEventType: "relationship_change" },
    { id: "3", goalType: "fetch", requiredEventType: "inventory_add" },
    { id: "4", goalType: "combat", requiredEventType: "enemy_defeated" },
    { id: "5", goalType: "discover", requiredEventType: "npc_discovered" },
  ]),
}));

describe("Quest Rules", () => {
  describe("validateQuestProgress", () => {
    it("validates exploration goal with location_change event", async () => {
      const ctx: QuestValidationContext = {
        questId: "q1",
        questTitle: "Test Quest",
        currentGoal: "Travel to Nomante Outpost",
        goalType: "exploration",
        proposedEvents: [
          { type: "location_change", data: { location: "Nomante Outpost" } },
        ],
      };

      const result = await validateQuestProgress(ctx);
      expect(result.valid).toBe(true);
    });

    it("rejects exploration goal without location_change", async () => {
      const ctx: QuestValidationContext = {
        questId: "q1",
        questTitle: "Test Quest",
        currentGoal: "Travel to Nomante Outpost",
        goalType: "exploration",
        proposedEvents: [
          { type: "relationship_change", data: { npc: "Lucie", delta: 1 } },
        ],
      };

      const result = await validateQuestProgress(ctx);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Missing required event");
    });

    it("validates dialogue goal with relationship_change event", async () => {
      const ctx: QuestValidationContext = {
        questId: "q1",
        questTitle: "Test Quest",
        currentGoal: "Speak with Captain Aran",
        goalType: "dialogue",
        proposedEvents: [
          { type: "relationship_change", data: { npc: "Captain Aran", delta: 1 } },
        ],
      };

      const result = await validateQuestProgress(ctx);
      expect(result.valid).toBe(true);
    });

    it("validates fetch goal with inventory_add event", async () => {
      const ctx: QuestValidationContext = {
        questId: "q1",
        questTitle: "Test Quest",
        currentGoal: "Obtain the Ancient Key",
        goalType: "fetch",
        proposedEvents: [
          { type: "inventory_add", data: { item: "Ancient Key" } },
        ],
      };

      const result = await validateQuestProgress(ctx);
      expect(result.valid).toBe(true);
    });
  });

  describe("getQuestConstraints", () => {
    it("returns exploration constraints", async () => {
      const constraints = await getQuestConstraints({
        goalType: "exploration",
        currentGoal: "Travel to the forest",
      });

      expect(constraints.requires).toContain("location_change");
      expect(constraints.context).toContain("location_change");
    });

    it("returns dialogue constraints", async () => {
      const constraints = await getQuestConstraints({
        goalType: "dialogue",
        currentGoal: "Talk to the merchant",
      });

      expect(constraints.requires).toContain("relationship_change");
    });
  });
});
