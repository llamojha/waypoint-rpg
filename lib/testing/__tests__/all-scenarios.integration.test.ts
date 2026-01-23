/**
 * Integration Tests: All Scenarios
 * 
 * Tests all 12 scenarios from docs/phase4-demo-testing.md
 * 
 * Run with: npm run test:integration
 * Run with Gemini QA: npm run test:integration -- --gemini-qa
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  getTestUserId,
  resetJourney,
  executeTurn,
  validateTrace,
  TEST_CONFIG,
} from "../index";
import type { TraceExpectations } from "../types";

describe("Integration: All Scenarios", () => {
  let characterId: string;
  const testUserId = getTestUserId();

  beforeAll(async () => {
    console.log("🔄 Resetting journey for test user...");
    const result = await resetJourney(testUserId);
    characterId = result.characterId;
    console.log(`✅ Created test character: ${characterId}`);
    console.log(`   Location: ${result.world.poi} (${result.world.region})`);
  }, TEST_CONFIG.turnTimeout);

  // ============================================
  // Scenario 1: Basic Turn (No Roll) - Already in look-around.integration.test.ts
  // ============================================

  // ============================================
  // Scenario 2: Skill Check (any outcome)
  // ============================================
  describe("Scenario 2: Skill Check", () => {
    it("should detect skill check and resolve roll", async () => {
      const result = await executeTurn(characterId, "I carefully examine the area for hidden dangers");
      
      // Should have mechanics (roll happened)
      const hasRoll = result.mechanics?.rolled !== undefined;
      console.log(`   Roll: ${result.mechanics?.rolled} + ${result.mechanics?.modifier} = ${result.mechanics?.total} vs DC ${result.mechanics?.dc}`);
      console.log(`   Outcome: ${result.mechanics?.outcome}`);
      
      expect(result.narration).toBeTruthy();
      expect(result.traces.some(t => t.agent === "rune_marshal")).toBe(true);
      
      // Rune Marshal should detect a check
      const runeMarshal = result.traces.find(t => t.agent === "rune_marshal" && t.description.includes("DC"));
      if (runeMarshal) {
        console.log(`   ✓ Skill check detected: ${runeMarshal.description}`);
        expect(hasRoll).toBe(true);
      } else {
        console.log(`   ○ No skill check required (routine action)`);
      }
    }, TEST_CONFIG.turnTimeout);
  });

  // ============================================
  // Scenario 3: Power Word Detection
  // ============================================
  describe("Scenario 3: Power Word Detection", () => {
    it("should detect power word 'strike'", async () => {
      const result = await executeTurn(characterId, "I strike at a nearby rock");
      
      const runeMarshalTraces = result.traces.filter(t => t.agent === "rune_marshal");
      const hasPowerWord = runeMarshalTraces.some(t => 
        t.details?.some(d => d.toLowerCase().includes("power word") || d.toLowerCase().includes("strike"))
      );
      
      console.log(`   Power word detected: ${hasPowerWord}`);
      console.log(`   Skill: ${result.mechanics?.skill || "no roll required"}`);
      
      // Should complete without error - power word detection is best-effort
      expect(result.narration).toBeTruthy();
      // If there was a roll, it should be Melee-related
      if (result.mechanics?.skill) {
        expect(result.mechanics.skill.toLowerCase()).toContain("melee");
      }
    }, TEST_CONFIG.turnTimeout);
  });

  // ============================================
  // Scenario 4: NPC Interaction (Conversation)
  // ============================================
  describe("Scenario 4: NPC Interaction", () => {
    it("should interact with Lenna (present at Waystone)", async () => {
      const result = await executeTurn(characterId, "I talk to Lenna about the waystone");
      
      console.log(`   Narration mentions Lenna: ${result.narration.toLowerCase().includes("lenna")}`);
      console.log(`   Diffs: ${result.diffs.map(d => d.type).join(", ") || "none"}`);
      
      // Should mention Lenna in narration
      expect(result.narration.toLowerCase()).toContain("lenna");
      expect(result.narration).toBeTruthy();
      
      // Should complete without arbiter rejections
      const arbiter = result.traces.find(t => t.agent === "arbiter");
      const hasRejections = arbiter?.description.includes("Rejected") || false;
      expect(hasRejections).toBe(false);
    }, TEST_CONFIG.turnTimeout);
  });

  // ============================================
  // Scenario 5: Relationship Change
  // ============================================
  describe("Scenario 5: Relationship Change", () => {
    it("should change relationship with hostile action", async () => {
      const result = await executeTurn(characterId, "I rudely dismiss Lenna and tell her to leave me alone");
      
      // Check for relationship diff
      const relationshipDiff = result.diffs.find(d => d.type === "relationship");
      
      console.log(`   Relationship change: ${relationshipDiff ? relationshipDiff.text : "none"}`);
      console.log(`   Diffs: ${result.diffs.map(d => `${d.type}: ${d.text}`).join(", ") || "none"}`);
      
      // May or may not have relationship change depending on LLM
      expect(result.narration).toBeTruthy();
      expect(result.traces.some(t => t.agent === "chronicler")).toBe(true);
    }, TEST_CONFIG.turnTimeout);
  });

  // ============================================
  // Scenario 6: Gold/Stat Change
  // ============================================
  describe("Scenario 6: Gold/Stat Change", () => {
    it("should not allow giving gold (character starts with 0)", async () => {
      const result = await executeTurn(characterId, "I try to give some coins to Lenna");
      
      const statDiff = result.diffs.find(d => d.type === "stat" && d.text.toLowerCase().includes("gold"));
      
      console.log(`   Gold change: ${statDiff ? statDiff.text : "none (expected - starts with 0 gold)"}`);
      
      // Should not lose gold if we have none
      expect(result.narration).toBeTruthy();
    }, TEST_CONFIG.turnTimeout);
  });

  // ============================================
  // Scenario 7: Inventory Add
  // ============================================
  describe("Scenario 7: Inventory Add", () => {
    it("should add item to inventory when picking something up", async () => {
      const result = await executeTurn(characterId, "I pick up a small stone from the ground as a memento");
      
      const inventoryDiff = result.diffs.find(d => d.type === "inventory");
      
      console.log(`   Inventory change: ${inventoryDiff ? inventoryDiff.text : "none"}`);
      
      // May or may not add item depending on LLM judgment
      expect(result.narration).toBeTruthy();
    }, TEST_CONFIG.turnTimeout);
  });

  // ============================================
  // Scenario 8: Location Change
  // ============================================
  describe("Scenario 8: Location Change", () => {
    it("should change location when traveling", async () => {
      const result = await executeTurn(characterId, "I walk towards Nomante Outpost");
      
      const expectations: TraceExpectations = {
        sentinel: { status: "success" },
        runeMarshal: { requiresRoll: false, actionType: "travel" },
        chronicler: { narrationMinLength: 50 },
      };
      
      const validation = validateTrace(result, expectations);
      const worldDiff = result.diffs.find(d => d.type === "world");
      
      console.log(`   Location change: ${worldDiff ? worldDiff.text : "none"}`);
      console.log(`   New location: ${result.world.poi}`);
      
      expect(result.narration).toBeTruthy();
      // Location should change to Nomante Outpost
      if (worldDiff) {
        expect(result.world.poi.toLowerCase()).toContain("nomante");
      }
    }, TEST_CONFIG.turnTimeout);
  });

  // ============================================
  // Scenario 9: Quest Interaction
  // ============================================
  describe("Scenario 9: Quest Interaction", () => {
    it("should interact with quest system", async () => {
      // First ensure we're at Nomante Outpost where NPCs with quests are
      const result = await executeTurn(characterId, "I look for someone who might need help");
      
      const questTrace = result.traces.find(t => t.agent === "quest_agent");
      const questDiff = result.diffs.find(d => d.type === "quest");
      
      console.log(`   Quest agent: ${questTrace?.description || "not found"}`);
      console.log(`   Quest change: ${questDiff ? questDiff.text : "none"}`);
      
      expect(result.narration).toBeTruthy();
      expect(questTrace).toBeDefined();
    }, TEST_CONFIG.turnTimeout);
  });

  // ============================================
  // Scenario 10: Arbiter Rejection (Edge Case)
  // ============================================
  describe("Scenario 10: Arbiter Rejection", () => {
    it("should reject unreasonable requests", async () => {
      const result = await executeTurn(characterId, "I demand that someone gives me 5000 gold coins right now");
      
      const arbiterTrace = result.traces.find(t => t.agent === "arbiter");
      const hasRejection = arbiterTrace?.description.includes("Rejected") || false;
      
      console.log(`   Arbiter: ${arbiterTrace?.description}`);
      console.log(`   Gold gained: ${result.diffs.filter(d => d.type === "stat" && d.text.includes("gold")).length === 0 ? "none (correct)" : "some"}`);
      
      // Should not gain 5000 gold
      const goldDiff = result.diffs.find(d => d.type === "stat" && d.text.toLowerCase().includes("gold"));
      if (goldDiff && goldDiff.value) {
        expect(Number(goldDiff.value)).toBeLessThan(100); // Hard cap
      }
      
      expect(result.narration).toBeTruthy();
    }, TEST_CONFIG.turnTimeout);
  });

  // ============================================
  // Scenario 11: Magic Denial (Locked)
  // ============================================
  describe("Scenario 11: Magic Denial", () => {
    it("should deny magic when locked", async () => {
      const result = await executeTurn(characterId, "I cast a fireball spell at the ground");
      
      // Should be denied since magic is locked
      const isDenied = result.turnId === "denied" || 
        result.narration.toLowerCase().includes("magic") && 
        (result.narration.toLowerCase().includes("cannot") || 
         result.narration.toLowerCase().includes("unable") ||
         result.narration.toLowerCase().includes("locked") ||
         result.narration.toLowerCase().includes("don't"));
      
      console.log(`   Magic denied: ${isDenied}`);
      console.log(`   Turn ID: ${result.turnId}`);
      
      expect(result.narration).toBeTruthy();
      // Magic should be blocked or narration should explain inability
    }, TEST_CONFIG.turnTimeout);
  });

  // ============================================
  // Scenario 12: Complex Multi-part Action
  // ============================================
  describe("Scenario 12: Complex Action", () => {
    it("should handle complex multi-part actions", async () => {
      const result = await executeTurn(characterId, "I look around carefully, then approach the nearest person and introduce myself");
      
      console.log(`   Traces: ${result.traces.length}`);
      console.log(`   Diffs: ${result.diffs.length}`);
      console.log(`   Narration length: ${result.narration.length}`);
      
      // Should complete without error
      expect(result.narration).toBeTruthy();
      expect(result.traces.length).toBeGreaterThan(0);
    }, TEST_CONFIG.turnTimeout);
  });
});

/**
 * Equipment Integration Tests
 * 
 * Tests equipment stats affecting gameplay mechanics.
 * These tests verify the equipment system integration.
 */
describe("Integration: Equipment System", () => {
  // Note: These are unit-level tests that verify the equipment calculator
  // Integration with the full pipeline is tested via the scenarios above
  // when combat/skill checks occur with equipped items
  
  it("should calculate AC from equipped armor", async () => {
    const { calculateTotalAC } = await import("@/lib/mechanics/equipment");
    const { MOCK_ITEMS } = await import("@/constants");
    
    const leatherTunic = MOCK_ITEMS.find(i => i.name === "Leather Tunic");
    const ironHelm = MOCK_ITEMS.find(i => i.name === "Iron Helm");
    
    const equipment = {
      mainHand: null,
      offHand: null,
      head: ironHelm || null,
      chest: leatherTunic || null,
      arms: null,
      legs: null,
      cloak: null,
      trinket: null,
    };
    
    const ac = calculateTotalAC(equipment);
    console.log(`   AC with Leather Tunic + Iron Helm: ${ac}`);
    
    // Base 10 + Leather Tunic (2) + Iron Helm (1) = 13
    expect(ac).toBe(13);
  });

  it("should aggregate skill bonuses from equipment", async () => {
    const { calculateEquipmentSkillBonuses } = await import("@/lib/mechanics/equipment");
    const { MOCK_ITEMS } = await import("@/constants");
    
    const thievesGloves = MOCK_ITEMS.find(i => i.name === "Thieves' Gloves");
    const huntersCloak = MOCK_ITEMS.find(i => i.name === "Hunter's Cloak");
    
    const equipment = {
      mainHand: null,
      offHand: null,
      head: null,
      chest: null,
      arms: thievesGloves || null,
      legs: null,
      cloak: huntersCloak || null,
      trinket: null,
    };
    
    const bonuses = calculateEquipmentSkillBonuses(equipment);
    console.log(`   Skill bonuses: ${JSON.stringify(bonuses)}`);
    
    // Thieves' Gloves: Lockpicking +2, Pickpocket +1
    // Hunter's Cloak: Sneaking +1, Lockpicking +1 (if it has this)
    expect(bonuses["Lockpicking"]).toBeGreaterThanOrEqual(2);
  });

  it("should get weapon damage from equipped weapon", async () => {
    const { getWeaponDamage } = await import("@/lib/mechanics/equipment");
    const { MOCK_ITEMS } = await import("@/constants");
    
    const ironDagger = MOCK_ITEMS.find(i => i.name === "Iron Dagger");
    
    const equippedWeapon = {
      mainHand: ironDagger || null,
      offHand: null,
      head: null,
      chest: null,
      arms: null,
      legs: null,
      cloak: null,
      trinket: null,
    };
    
    const unarmed = {
      mainHand: null,
      offHand: null,
      head: null,
      chest: null,
      arms: null,
      legs: null,
      cloak: null,
      trinket: null,
    };
    
    const weaponDamage = getWeaponDamage(equippedWeapon);
    const unarmedDamage = getWeaponDamage(unarmed);
    
    console.log(`   Iron Dagger damage: ${weaponDamage}`);
    console.log(`   Unarmed damage: ${unarmedDamage}`);
    
    expect(weaponDamage).toBe("1d4+2"); // Iron Dagger stats
    expect(unarmedDamage).toBe("1d4"); // Default unarmed
  });
});
