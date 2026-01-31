/**
 * Unit Tests: DM Chat Prompt
 * 
 * Tests the prompt building function for DM Chat.
 */

import { describe, it, expect } from "vitest";
import { buildDmChatPrompt, DM_CHAT_SYSTEM_PROMPT, type DmChatContext } from "../dm-chat";

const mockContext: DmChatContext = {
  character: {
    id: "test-char-id",
    name: "Test Hero",
    hp: 15,
    maxHp: 20,
    gold: 100,
    skills: {
      Melee: { level: 5, xp: 200, nextLevel: 500, verbs: ["strike"] },
    },
    equipment: {
      mainHand: { id: "sword-1", name: "Iron Sword", type: "weapon", tags: [], description: "A basic sword" },
      offHand: null,
      head: null,
      chest: null,
      arms: null,
      legs: null,
      cloak: null,
      trinket: null,
    },
    inventory: [
      { id: "potion-1", name: "Health Potion", type: "consumable", tags: [], description: "Heals 10 HP" },
    ],
    conditions: [],
    isMagicUnlocked: false,
  },
  world: {
    name: "Test World",
    region: "Ash Coast",
    poi: "The Waystone",
    time: { day: 3, phase: "Morning" },
    weather: "Clear",
    description: "A mystical standing stone",
    tags: [],
    nearbyPoi: ["Thornwood Village"],
    entities: ["Helga Thornwood"],
    memory: [],
    activeCombat: null,
  },
  turns: [
    {
      id: "turn-1",
      timestamp: Date.now(),
      playerAction: "I look around",
      narration: "You see a clearing with an ancient stone.",
      isStreaming: false,
      suggestedActions: [],
      diffs: [],
    },
  ],
  quests: [
    {
      id: "quest-1",
      title: "Find the Lost Artifact",
      description: "Search for the ancient relic",
      status: "active",
      progress: 1,
      totalProgress: 3,
      leads: ["Check the ruins"],
    },
  ],
  npcs: [
    {
      id: "npc-1",
      name: "Helga Thornwood",
      role: "Innkeeper",
      relationship: 2,
      location: "The Waystone",
      notes: [],
      history: [],
    },
  ],
  codexEntries: [
    { title: "The Waystone", category: "Locations", text: "An ancient standing stone with magical properties." },
  ],
  locations: [
    { name: "The Waystone", type: "landmark", region: "Ash Coast", description: "A mystical stone" },
  ],
  skillTree: { Combat: { skills: [] } },
};

describe("DM Chat Prompt", () => {
  describe("DM_CHAT_SYSTEM_PROMPT", () => {
    it("should contain rules for meta questions", () => {
      expect(DM_CHAT_SYSTEM_PROMPT).toContain("META QUESTIONS");
      expect(DM_CHAT_SYSTEM_PROMPT).toContain("game mechanics");
    });

    it("should contain rules for in-world questions", () => {
      expect(DM_CHAT_SYSTEM_PROMPT).toContain("IN-WORLD QUESTIONS");
      expect(DM_CHAT_SYSTEM_PROMPT).toContain("lore");
    });

    it("should specify no state changes", () => {
      expect(DM_CHAT_SYSTEM_PROMPT).toContain("NEVER propose");
      expect(DM_CHAT_SYSTEM_PROMPT).toContain("informational only");
    });
  });

  describe("buildDmChatPrompt", () => {
    it("should include character information", () => {
      const prompt = buildDmChatPrompt(mockContext);
      
      expect(prompt).toContain("Test Hero");
      expect(prompt).toContain("HP: 15/20");
      expect(prompt).toContain("Gold: 100");
      expect(prompt).toContain("Melee (Lv 5)");
    });

    it("should include world state", () => {
      const prompt = buildDmChatPrompt(mockContext);
      
      expect(prompt).toContain("Ash Coast");
      expect(prompt).toContain("The Waystone");
      expect(prompt).toContain("Day 3");
      expect(prompt).toContain("Morning");
    });

    it("should include quest information", () => {
      const prompt = buildDmChatPrompt(mockContext);
      
      expect(prompt).toContain("Find the Lost Artifact");
      expect(prompt).toContain("active");
      expect(prompt).toContain("[1/3]");
    });

    it("should include NPC information", () => {
      const prompt = buildDmChatPrompt(mockContext);
      
      expect(prompt).toContain("Helga Thornwood");
      expect(prompt).toContain("Innkeeper");
      expect(prompt).toContain("Relationship: 2");
    });

    it("should include recent events", () => {
      const prompt = buildDmChatPrompt(mockContext);
      
      expect(prompt).toContain("I look around");
      expect(prompt).toContain("ancient stone");
    });

    it("should include skill tree for mechanics questions", () => {
      const prompt = buildDmChatPrompt(mockContext);
      
      expect(prompt).toContain("GAME MECHANICS");
      expect(prompt).toContain("SKILL TREE");
    });

    it("should include inventory items", () => {
      const prompt = buildDmChatPrompt(mockContext);
      
      expect(prompt).toContain("Health Potion");
    });

    it("should include equipment", () => {
      const prompt = buildDmChatPrompt(mockContext);
      
      expect(prompt).toContain("Iron Sword");
    });
  });
});
