/**
 * Integration Test: Compression System
 * 
 * Tests the conversation compression system:
 * - Compression trigger on location change
 * - Summary generation
 * - Prompt building with summaries
 * 
 * Run with: npm run test:integration
 */

import { describe, it, expect } from "vitest";
import { TEST_CONFIG } from "../index";
import { generateLocationSummary } from "@/lib/compression/summarize";
import { buildTurnPrompt, type LocationSummaryForPrompt } from "@/lib/gemini/prompts";
import type { Turn, Character, WorldContext, Equipment } from "@/types";

// Helper to create mock turns
function createMockTurns(count: number, location: string): Turn[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `turn-${i}`,
    timestamp: Date.now() - (count - i) * 60000,
    playerAction: `Action ${i + 1} at ${location}`,
    narration: `You did something interesting at ${location}. The scene unfolds around you.`,
    isStreaming: false,
    diffs: i % 3 === 0 ? [{ type: "relationship" as const, text: "Helga Thornwood +1" }] : [],
    suggestedActions: ["Continue", "Look around"],
  }));
}

// Mock character for prompt building
const mockCharacter: Character = {
  id: "test",
  name: "Test",
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
  } as Equipment,
  inventory: [],
  conditions: [],
  isMagicUnlocked: false,
};

// Mock world for prompt building
const mockWorld: WorldContext = {
  name: "Test World",
  region: "Test Region",
  poi: "Test POI",
  time: { day: 1, phase: "Morning" as const },
  weather: "Clear",
  description: "",
  tags: [],
  nearbyPoi: [],
  entities: [],
  memory: [],
  activeCombat: null,
};

describe("Integration: Compression System", () => {

  describe("Summary Generation", () => {
    it("should generate a summary from turns", async () => {
      const turns = createMockTurns(5, "The Waystone");
      
      const summary = await generateLocationSummary(turns, "The Waystone", 1);
      
      expect(summary.location).toBe("The Waystone");
      expect(summary.visitNumber).toBe(1);
      expect(summary.summary).toBeTruthy();
      expect(summary.turnRange.start).toBe(1);
      expect(summary.turnRange.end).toBe(5);
    }, TEST_CONFIG.turnTimeout);

    it("should extract NPCs from relationship diffs", async () => {
      const turns: Turn[] = [
        {
          id: "turn-1",
          timestamp: Date.now(),
          playerAction: "Talk to Helga",
          narration: "Helga smiles warmly.",
          isStreaming: false,
          diffs: [{ type: "relationship", text: "Helga Thornwood +1" }],
          suggestedActions: [],
        },
      ];
      
      const summary = await generateLocationSummary(turns, "Thornwood Inn", 1);
      
      expect(summary.npcsEncountered).toContain("Helga Thornwood");
    }, TEST_CONFIG.turnTimeout);

    it("should extract items from inventory diffs", async () => {
      const turns: Turn[] = [
        {
          id: "turn-1",
          timestamp: Date.now(),
          playerAction: "Search the chest",
          narration: "You find a rusty key.",
          isStreaming: false,
          diffs: [{ type: "inventory", text: "+Rusty Key" }],
          suggestedActions: [],
        },
      ];
      
      const summary = await generateLocationSummary(turns, "Old Ruins", 1);
      
      expect(summary.itemsGained).toContain("Rusty Key");
    }, TEST_CONFIG.turnTimeout);

    it("should handle empty turns gracefully", async () => {
      const summary = await generateLocationSummary([], "Empty Location", 1);
      
      expect(summary.summary).toBe("No events recorded.");
      expect(summary.keyEvents).toHaveLength(0);
    }, TEST_CONFIG.turnTimeout);
  });

  describe("Prompt Building with Summaries", () => {
    it("should format summaries in prompt", () => {
      const turns = createMockTurns(3, "Current Location");
      const summaries: LocationSummaryForPrompt[] = [
        {
          location: "The Waystone",
          visitNumber: 1,
          summary: "Met the innkeeper and rested.",
          keyEvents: ["Rested at inn"],
          npcsEncountered: ["Helga Thornwood"],
        },
      ];
      
      const prompt = buildTurnPrompt(
        mockCharacter,
        mockWorld,
        turns,
        "test action",
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        summaries
      );
      
      expect(prompt).toContain("Previously at The Waystone");
      expect(prompt).toContain("Met the innkeeper and rested");
      expect(prompt).toContain("Helga Thornwood");
    });

    it("should include recent turns after summaries", () => {
      const turns = createMockTurns(3, "Current Location");
      const summaries: LocationSummaryForPrompt[] = [
        {
          location: "Old Location",
          visitNumber: 1,
          summary: "Previous events.",
          keyEvents: [],
          npcsEncountered: [],
        },
      ];
      
      const prompt = buildTurnPrompt(
        mockCharacter,
        mockWorld,
        turns,
        "test action",
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        summaries
      );
      
      expect(prompt).toContain("Recent turns:");
      expect(prompt).toContain("Action 1");
    });

    it("should handle no summaries gracefully", () => {
      const turns = createMockTurns(3, "Current Location");
      
      const prompt = buildTurnPrompt(
        mockCharacter,
        mockWorld,
        turns,
        "test action"
      );
      
      expect(prompt).not.toContain("Previously at");
      expect(prompt).toContain("Action 1");
    });
  });
});
