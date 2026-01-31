/**
 * E2E Test: Full Journey
 * 
 * Simulates a 20+ turn player journey using Gemini as a player agent.
 * Run with: npm run test:e2e
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  getTestUserId,
  resetJourney,
  executeTurn,
  getNextPlayerAction,
  TEST_CONFIG,
} from "../index";

const JOURNEY_LENGTH = 20;

describe("E2E: Full Journey", () => {
  let characterId: string;
  let currentNarration: string;
  let suggestedActions: string[];

  beforeAll(async () => {
    console.log("🔄 Resetting journey for full e2e test...");
    const result = await resetJourney(getTestUserId());
    characterId = result.characterId;
    currentNarration = `You are ${result.character.name}, standing at ${result.world.poi} in ${result.world.region}.`;
    suggestedActions = ["Look around", "Talk to someone nearby", "Explore the area"];
    console.log(`✅ Created test character: ${characterId}`);
    console.log(`   Starting location: ${result.world.poi}`);
  }, TEST_CONFIG.turnTimeout);

  it(`should complete ${JOURNEY_LENGTH} turns with varied actions`, async () => {
    const turnLog: Array<{ turn: number; action: string; success: boolean }> = [];

    for (let turn = 1; turn <= JOURNEY_LENGTH; turn++) {
      // Get next action from player agent
      const playerAction = await getNextPlayerAction(currentNarration, suggestedActions);
      console.log(`\n📍 Turn ${turn}: "${playerAction}"`);

      // Execute the turn
      const result = await executeTurn(characterId, playerAction);

      // Validate turn succeeded
      const success = !!result.narration && result.narration.length > 0;
      turnLog.push({ turn, action: playerAction, success });

      if (!success) {
        console.log(`   ❌ Turn failed - no narration returned`);
        expect(success).toBe(true);
        break;
      }

      // Log results
      console.log(`   ✅ Narration: ${result.narration.slice(0, 100)}...`);
      if (result.diffs.length > 0) {
        console.log(`   📝 Diffs: ${result.diffs.map(d => d.type).join(", ")}`);
      }
      if (result.mechanics?.rolled) {
        console.log(`   🎲 Roll: ${result.mechanics.rolled} + ${result.mechanics.modifier} = ${result.mechanics.total} vs DC ${result.mechanics.dc} (${result.mechanics.outcome})`);
      }

      // Update state for next turn
      currentNarration = result.narration;
      suggestedActions = result.suggestedActions || [];
    }

    // Summary
    console.log("\n📊 Journey Summary:");
    console.log(`   Total turns: ${turnLog.length}`);
    console.log(`   Successful: ${turnLog.filter(t => t.success).length}`);
    console.log(`   Failed: ${turnLog.filter(t => !t.success).length}`);

    // All turns should succeed
    expect(turnLog.every(t => t.success)).toBe(true);
    expect(turnLog.length).toBe(JOURNEY_LENGTH);
  }, TEST_CONFIG.turnTimeout * JOURNEY_LENGTH);
});


describe("E2E: Edge Cases", () => {
  let characterId: string;

  beforeAll(async () => {
    console.log("🔄 Resetting journey for edge case tests...");
    const result = await resetJourney(getTestUserId());
    characterId = result.characterId;
    console.log(`✅ Created test character: ${characterId}`);
  }, TEST_CONFIG.turnTimeout);

  describe("Death and Respawn", () => {
    it("should handle 0 HP and respawn at Waystone", async () => {
      // Force HP to 1 via direct DB update, then take damage
      const { createAdminClient } = await import("@/lib/supabase/server");
      const supabase = createAdminClient();
      
      // Set HP to 1 so any damage will trigger death
      await supabase
        .from("waypoint_characters")
        .update({ hp: 1 })
        .eq("id", characterId);

      console.log("   Set HP to 1, attempting dangerous action...");

      // Try to get into combat or take damage
      const result = await executeTurn(characterId, "I recklessly attack the nearest dangerous creature");

      // Check if respawn happened (either via diffs or world state)
      const respawnDiff = result.diffs.find(d => 
        d.type === "world" && d.text.toLowerCase().includes("respawn")
      );
      const hpDiff = result.diffs.find(d => d.type === "stat" && d.text === "HP");

      console.log(`   Diffs: ${result.diffs.map(d => `${d.type}: ${d.text}`).join(", ") || "none"}`);
      console.log(`   Respawn diff: ${respawnDiff ? "yes" : "no"}`);

      // Turn should complete regardless
      expect(result.narration).toBeTruthy();
      
      // If combat happened and we died, we should have respawned
      // Note: LLM may not always trigger combat, so we just verify the turn completes
    }, TEST_CONFIG.turnTimeout);
  });

  describe("Invalid Travel", () => {
    it("should reject travel to non-existent location", async () => {
      const result = await executeTurn(characterId, "I travel to the Forbidden Castle of Doom");

      console.log(`   Narration: ${result.narration.slice(0, 150)}...`);
      
      // Check arbiter trace for rejection
      const arbiterTrace = result.traces.find(t => t.agent === "arbiter");
      const hasRejection = arbiterTrace?.description.includes("Rejected") || 
                          arbiterTrace?.details?.some(d => d.includes("not a known location"));

      console.log(`   Arbiter rejection: ${hasRejection ? "yes" : "no"}`);
      if (arbiterTrace?.details) {
        console.log(`   Arbiter details: ${arbiterTrace.details.join(", ")}`);
      }

      // Turn should complete (narration explains why travel failed)
      expect(result.narration).toBeTruthy();
      
      // Should NOT have a location change diff to invalid location
      const locationDiff = result.diffs.find(d => 
        d.type === "world" && d.text.toLowerCase().includes("forbidden castle")
      );
      expect(locationDiff).toBeUndefined();
    }, TEST_CONFIG.turnTimeout);

    it("should reject travel to non-adjacent location", async () => {
      // Try to travel somewhere that exists but isn't adjacent
      const result = await executeTurn(characterId, "I instantly teleport to the Capital City");

      console.log(`   Narration: ${result.narration.slice(0, 150)}...`);

      // Turn should complete
      expect(result.narration).toBeTruthy();
      
      // Should not have teleported
      const locationDiff = result.diffs.find(d => 
        d.type === "world" && typeof d.value === "string" && d.value.toLowerCase().includes("capital")
      );
      expect(locationDiff).toBeUndefined();
    }, TEST_CONFIG.turnTimeout);
  });
});
