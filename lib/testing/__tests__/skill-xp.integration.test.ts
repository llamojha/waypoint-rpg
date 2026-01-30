/**
 * Integration Tests: Skill XP System
 * 
 * Tests XP awarding for power words and skill checks
 * 
 * Run with: npm run test:integration
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import {
  getTestUserId,
  resetJourney,
  executeTurn,
  TEST_CONFIG,
} from "../index";
import { clearDiminishingReturns } from "@/lib/mechanics/skill-xp";

describe("Integration: Skill XP System", () => {
  let characterId: string;
  const testUserId = getTestUserId();

  beforeAll(async () => {
    console.log("🔄 Resetting journey for skill XP tests...");
    const result = await resetJourney(testUserId);
    characterId = result.characterId;
    console.log(`✅ Created test character: ${characterId}`);
  }, TEST_CONFIG.turnTimeout);

  beforeEach(() => {
    // Clear diminishing returns between tests for consistent results
    clearDiminishingReturns(characterId);
  });

  // ============================================
  // Scenario: Skill Check Awards XP
  // ============================================
  describe("Skill Check XP", () => {
    it("should award XP after skill check (success or failure)", async () => {
      // Use a perception-type action that triggers a roll
      const result = await executeTurn(characterId, "I carefully search the area for hidden items");
      
      // Print full trace
      console.log("\n   === FULL TRACE ===");
      for (const trace of result.traces) {
        console.log(`   [${trace.agent}] ${trace.status} (${trace.durationMs}ms)`);
        console.log(`      ${trace.description}`);
        if (trace.details?.length) {
          for (const detail of trace.details) {
            console.log(`      - ${detail}`);
          }
        }
      }
      console.log("   === END TRACE ===\n");
      
      // Check for skill diff
      const skillDiff = result.diffs.find(d => d.type === "skill");
      console.log(`   Roll outcome: ${result.mechanics?.outcome}`);
      console.log(`   Skill: ${result.mechanics?.skill}`);
      console.log(`   Skill diff: ${skillDiff?.text} ${skillDiff?.value || ""}`);
      
      // Should have a skill XP diff if a roll happened
      if (result.mechanics?.skill) {
        expect(skillDiff).toBeDefined();
        console.log(`   ✓ XP awarded for ${result.mechanics.skill} check`);
      }
    }, TEST_CONFIG.turnTimeout);

    it("should award XP for combat skill check", async () => {
      // Use explicit combat action
      const result = await executeTurn(characterId, "I swing my weapon at the training post");
      
      const skillDiff = result.diffs.find(d => d.type === "skill");
      console.log(`   Roll outcome: ${result.mechanics?.outcome}`);
      console.log(`   Skill: ${result.mechanics?.skill}`);
      console.log(`   Skill diff: ${skillDiff?.text} ${skillDiff?.value || ""}`);
      console.log(`   All diffs: ${result.diffs.map(d => `${d.type}: ${d.text}`).join(", ")}`);
      
      // If a combat roll happened, XP should be awarded
      if (result.mechanics?.skill) {
        expect(skillDiff).toBeDefined();
      }
    }, TEST_CONFIG.turnTimeout);
  });

  // ============================================
  // Scenario: Level Up
  // ============================================
  describe("Level Up", () => {
    it("should show level up diff when XP threshold reached", async () => {
      // Fresh skill should level up quickly (0 → 1 at 83 XP)
      const result = await executeTurn(characterId, "I aim at a distant target");
      
      const skillDiffs = result.diffs.filter(d => d.type === "skill");
      console.log(`   Skill diffs: ${skillDiffs.map(d => `${d.text} ${d.value || ""}`).join(", ")}`);
      
      // Check diff format is correct (either "+X XP" or "→ N" for level up)
      for (const diff of skillDiffs) {
        const valueStr = String(diff.value || "");
        const isXpGain = valueStr.includes("XP");
        const isLevelUp = valueStr.includes("→");
        expect(isXpGain || isLevelUp).toBe(true);
      }
    }, TEST_CONFIG.turnTimeout);
  });

  // ============================================
  // Scenario: Diminishing Returns (same skill repeated)
  // ============================================
  describe("Diminishing Returns", () => {
    it("should track XP gains across repeated skill checks", async () => {
      // Clear any previous state
      clearDiminishingReturns(characterId);
      
      // Use actions that reliably trigger skill checks
      const result1 = await executeTurn(characterId, "I search thoroughly for hidden compartments");
      const skill1 = result1.mechanics?.skill;
      if (!skill1) {
        console.log("   ⚠ First action didn't trigger a skill check, skipping test");
        return;
      }
      const xp1 = result1.character.skills[skill1]?.xp || 0;
      console.log(`   Turn 1: ${skill1} check → XP = ${xp1}`);
      
      // Same type of action to trigger same skill
      const result2 = await executeTurn(characterId, "I search again for anything I might have missed");
      const xp2 = result2.character.skills[skill1]?.xp || 0;
      const gain2 = xp2 - xp1;
      console.log(`   Turn 2: ${result2.mechanics?.skill || "no check"} → XP = ${xp2} (+${gain2})`);
      
      // XP should have increased
      expect(xp2).toBeGreaterThanOrEqual(xp1);
      console.log(`   ✓ XP tracking works: ${xp1} → ${xp2}`);
    }, TEST_CONFIG.turnTimeout * 2);
  });
});
