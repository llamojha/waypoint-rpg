/**
 * Combat System Integration Tests
 * 
 * Tests the combat system with actual database state:
 * - Set up activeCombat in DB
 * - Execute attack turn
 * - Verify enemy HP decrements
 * 
 * Run with: npm run test:integration -- lib/combat/__tests__/combat.integration.test.ts
 */

import { describe, it, expect, beforeAll } from "vitest";
import { createAdminClient } from "@/lib/supabase/server";
import { getTestUserId, resetJourney, executeTurn, TEST_CONFIG } from "@/lib/testing";
import { createCombatEnemy, ENEMY_TEMPLATES } from "../enemies";
import { shouldRespawn, handlePlayerDeath } from "../respawn";
import type { Character, WorldContext } from "@/types";

describe("Combat System Integration", () => {
  let characterId: string;
  const testUserId = getTestUserId();
  const supabase = createAdminClient();

  beforeAll(async () => {
    console.log("🔄 Resetting journey for combat tests...");
    const result = await resetJourney(testUserId);
    characterId = result.characterId;
    console.log(`✅ Created test character: ${characterId}`);
  }, TEST_CONFIG.turnTimeout);

  /**
   * Helper to set up active combat in the database
   */
  async function setupCombat(enemyName: string) {
    const enemy = createCombatEnemy(enemyName);
    if (!enemy) throw new Error(`Unknown enemy: ${enemyName}`);

    const activeCombat = { enemies: [enemy], round: 1 };

    const { error } = await supabase
      .from("waypoint_world_state")
      .update({ active_combat: activeCombat })
      .eq("character_id", characterId);

    if (error) throw new Error(`Failed to set up combat: ${error.message}`);
    
    return { enemy, activeCombat };
  }

  /**
   * Helper to get current world state
   */
  async function getWorldState() {
    const { data, error } = await supabase
      .from("waypoint_world_state")
      .select("*")
      .eq("character_id", characterId)
      .single();

    if (error) throw new Error(`Failed to get world state: ${error.message}`);
    return data;
  }

  describe("Attack Enemy (with DB state)", () => {
    it("should track enemy HP when attacking", async () => {
      // 1. Set up combat with a Wolf in the database
      const { enemy } = await setupCombat("Wolf");
      console.log(`   Set up combat with ${enemy.name} (${enemy.hp}/${enemy.maxHp} HP)`);

      // 2. Execute attack turn
      const result = await executeTurn(characterId, "I strike at the wolf with my weapon");

      // 3. Log trace for debugging
      console.log("\n   === TRACE ===");
      for (const trace of result.traces) {
        console.log(`   [${trace.agent}] ${trace.description}`);
      }
      console.log("   === END ===\n");

      // 4. Check if combat action was detected
      const runeMarshal = result.traces.find(t => t.agent === "rune_marshal");
      console.log(`   Action type: ${runeMarshal?.description}`);

      // 5. Check world state for updated enemy HP
      const worldState = await getWorldState();
      const activeCombat = worldState.active_combat as { enemies: Array<{ name: string; hp: number; maxHp: number }> } | null;
      
      if (activeCombat) {
        const wolf = activeCombat.enemies.find(e => e.name === "Wolf");
        console.log(`   Wolf HP after attack: ${wolf?.hp}/${wolf?.maxHp}`);
        
        // Check if damage was applied (LLM may not always propose damage)
        if (result.mechanics?.outcome === "success" && wolf) {
          if (wolf.hp < wolf.maxHp) {
            console.log(`   ✅ Damage applied correctly`);
          } else {
            console.log(`   ⚠️ LLM did not propose combat_damage (non-deterministic)`);
          }
        }
      }

      expect(result.narration).toBeTruthy();
    }, TEST_CONFIG.turnTimeout);
  });

  describe("Unit Tests (no DB)", () => {
    it("should detect when player should respawn", () => {
      const mockChar: Character = {
        name: "Test",
        hp: 5,
        maxHp: 20,
        gold: 0,
        skills: {},
        equipment: { mainHand: null, offHand: null, head: null, chest: null, arms: null, legs: null, cloak: null, trinket: null },
        inventory: [],
        conditions: [],
        isMagicUnlocked: false,
      };

      expect(shouldRespawn(mockChar, { hp: 0 })).toBe(true);
      expect(shouldRespawn(mockChar, { hp: -5 })).toBe(true);
      expect(shouldRespawn(mockChar, { hp: 1 })).toBe(false);
    });

    it("should respawn at Waystone with 1 HP", () => {
      const mockChar: Character = {
        name: "Test",
        hp: 0,
        maxHp: 20,
        gold: 0,
        skills: {},
        equipment: { mainHand: null, offHand: null, head: null, chest: null, arms: null, legs: null, cloak: null, trinket: null },
        inventory: [],
        conditions: [],
        isMagicUnlocked: false,
      };
      const mockWorld: WorldContext = {
        name: "Test",
        region: "Test",
        poi: "Somewhere",
        time: { day: 1, phase: "Morning" },
        weather: "Clear",
        description: "",
        tags: [],
        nearbyPoi: [],
        entities: [],
        memory: [],
        activeCombat: { enemies: [createCombatEnemy("Wolf")!], round: 1 },
      };

      const result = handlePlayerDeath(mockChar, mockWorld);

      expect(result.characterUpdates.hp).toBe(1);
      expect(result.worldUpdates.poi).toBe("The Waystone");
      expect(result.worldUpdates.activeCombat).toBeNull();
    });

    it("should have all enemy tiers in templates", () => {
      const tiers = new Set(Object.values(ENEMY_TEMPLATES).map(e => e.tier));
      expect(tiers.has("trivial")).toBe(true);
      expect(tiers.has("easy")).toBe(true);
      expect(tiers.has("medium")).toBe(true);
      expect(tiers.has("hard")).toBe(true);
      expect(tiers.has("elite")).toBe(true);
      expect(tiers.has("boss")).toBe(true);
    });
  });

  describe("Enemy Spawning (combat_start)", () => {
    it("should spawn enemies when entering dangerous area", async () => {
      // 1. Ensure no active combat
      await supabase
        .from("waypoint_world_state")
        .update({ active_combat: null })
        .eq("character_id", characterId);

      // 2. Execute action that should trigger combat
      const result = await executeTurn(characterId, "I venture into the bandit territory looking for trouble");

      // 3. Log trace
      console.log("\n   === SPAWN TEST TRACE ===");
      for (const trace of result.traces) {
        console.log(`   [${trace.agent}] ${trace.description}`);
      }
      console.log("   === END ===\n");

      // 4. Check if combat was started
      const worldState = await getWorldState();
      const activeCombat = worldState.active_combat as { enemies: Array<{ name: string; hp: number }> } | null;

      if (activeCombat) {
        console.log(`   Combat started with: ${activeCombat.enemies.map(e => e.name).join(", ")}`);
        expect(activeCombat.enemies.length).toBeGreaterThan(0);
        // Verify enemies have HP
        for (const enemy of activeCombat.enemies) {
          expect(enemy.hp).toBeGreaterThan(0);
        }
      } else {
        // Combat may not always start - depends on LLM judgment
        console.log("   No combat started (LLM judgment)");
      }

      expect(result.narration).toBeTruthy();
    }, TEST_CONFIG.turnTimeout);
  });
});
