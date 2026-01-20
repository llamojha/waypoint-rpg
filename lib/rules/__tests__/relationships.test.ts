/**
 * Relationships Rules Tests
 */

import { describe, it, expect, vi } from "vitest";
import { classifyInteraction, getRelationshipBounds, validateRelationshipDelta } from "../relationships";

// Mock the cache module
vi.mock("../cache", () => ({
  getRelationshipRules: vi.fn().mockResolvedValue([
    { id: "1", interactionType: "greeting", deltaMin: 0, deltaMax: 0, keywords: ["hello", "hi", "greet"] },
    { id: "2", interactionType: "small_talk", deltaMin: 0, deltaMax: 1, keywords: ["chat", "talk", "ask about"] },
    { id: "3", interactionType: "help_minor", deltaMin: 1, deltaMax: 1, keywords: ["help", "assist"] },
    { id: "4", interactionType: "help_major", deltaMin: 1, deltaMax: 2, keywords: ["save", "rescue"] },
    { id: "5", interactionType: "insult_minor", deltaMin: -1, deltaMax: -1, keywords: ["insult", "mock"] },
    { id: "6", interactionType: "attack", deltaMin: -3, deltaMax: -2, keywords: ["attack", "hit", "fight"] },
  ]),
}));

describe("Relationships Rules", () => {
  describe("classifyInteraction", () => {
    it("classifies greeting", async () => {
      const result = await classifyInteraction("I say hello to the merchant");
      expect(result).toBe("greeting");
    });

    it("classifies help action", async () => {
      const result = await classifyInteraction("I help the old woman carry her bags");
      expect(result).toBe("help_minor");
    });

    it("classifies attack action", async () => {
      const result = await classifyInteraction("I attack the bandit");
      expect(result).toBe("attack");
    });

    it("returns null for unclassified action", async () => {
      const result = await classifyInteraction("I contemplate the stars");
      expect(result).toBeNull();
    });
  });

  describe("getRelationshipBounds", () => {
    it("returns bounds for greeting", async () => {
      const bounds = await getRelationshipBounds("greeting");
      expect(bounds.deltaMin).toBe(0);
      expect(bounds.deltaMax).toBe(0);
    });

    it("returns bounds for help_major", async () => {
      const bounds = await getRelationshipBounds("help_major");
      expect(bounds.deltaMin).toBe(1);
      expect(bounds.deltaMax).toBe(2);
    });

    it("returns bounds for attack", async () => {
      const bounds = await getRelationshipBounds("attack");
      expect(bounds.deltaMin).toBe(-3);
      expect(bounds.deltaMax).toBe(-2);
    });
  });

  describe("validateRelationshipDelta", () => {
    it("validates delta within bounds", async () => {
      const result = await validateRelationshipDelta("help_minor", 1);
      expect(result.valid).toBe(true);
    });

    it("rejects delta above max", async () => {
      const result = await validateRelationshipDelta("greeting", 1);
      expect(result.valid).toBe(false);
      expect(result.modified).toBe(0);
    });

    it("rejects delta below min", async () => {
      const result = await validateRelationshipDelta("attack", -1);
      expect(result.valid).toBe(false);
      expect(result.modified).toBe(-2);
    });
  });
});
