/**
 * Integration Test: Look Around
 * 
 * Tests the "I look around" scenario - a passive observation action
 * that should not require a roll and should not produce state changes.
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
  validateWithGemini,
  SCENARIO_EXPECTATIONS,
  isGeminiQAEnabled,
  TEST_CONFIG,
} from "../index";

describe("Integration: Look Around", () => {
  let characterId: string;
  const testUserId = getTestUserId();

  beforeAll(async () => {
    console.log("🔄 Resetting journey for test user...");
    const result = await resetJourney(testUserId);
    characterId = result.characterId;
    console.log(`✅ Created test character: ${characterId}`);
    console.log(`   Location: ${result.world.poi} (${result.world.region})`);
  }, TEST_CONFIG.turnTimeout);

  it("should execute 'I look around' without errors", async () => {
    console.log("\n📝 Executing: 'I look around'");
    
    const result = await executeTurn(characterId, "I look around");
    
    console.log(`✅ Turn completed: ${result.turnId}`);
    console.log(`   Narration length: ${result.narration.length} chars`);
    console.log(`   Diffs: ${result.diffs.length}`);
    console.log(`   Traces: ${result.traces.length}`);
    
    // Basic assertions
    expect(result.turnId).toBeDefined();
    expect(result.narration).toBeTruthy();
    expect(result.traces.length).toBeGreaterThan(0);
  }, TEST_CONFIG.turnTimeout);

  it("should pass deterministic validation", async () => {
    console.log("\n🔍 Validating trace (deterministic mode)...");
    
    const result = await executeTurn(characterId, "I look around");
    const validation = validateTrace(result, SCENARIO_EXPECTATIONS.lookAround);
    
    if (!validation.passed) {
      console.log("❌ Validation failures:");
      validation.failures.forEach(f => console.log(`   - ${f}`));
    } else {
      console.log("✅ All deterministic checks passed");
    }
    
    // Log trace summary for debugging
    console.log("\n📊 Trace summary:");
    for (const trace of result.traces) {
      const status = trace.status === "success" ? "✓" : trace.status === "error" ? "✗" : "○";
      console.log(`   ${status} ${trace.agent}: ${trace.description}`);
    }
    
    expect(validation.passed).toBe(true);
    if (!validation.passed) {
      expect(validation.failures).toEqual([]);
    }
  }, TEST_CONFIG.turnTimeout);

  it("should have correct agent flow", async () => {
    const result = await executeTurn(characterId, "I look around");
    
    // Check expected agents ran
    const agentNames = result.traces.map(t => t.agent);
    
    expect(agentNames).toContain("sentinel");
    expect(agentNames).toContain("rune_marshal");
    expect(agentNames).toContain("orchestrator");
    expect(agentNames).toContain("arbiter");
    expect(agentNames).toContain("lorekeeper");
    expect(agentNames).toContain("chronicler");
    
    // Sentinel should pass
    const sentinel = result.traces.find(t => t.agent === "sentinel");
    expect(sentinel?.status).toBe("success");
    
    // No roll should be required
    const runeMarshal = result.traces.find(t => t.agent === "rune_marshal");
    expect(runeMarshal?.description).not.toContain("DC");
  }, TEST_CONFIG.turnTimeout);

  it("should not produce state changes for passive observation", async () => {
    const result = await executeTurn(characterId, "I look around");
    
    // Passive observation should not change character stats
    expect(result.diffs.filter(d => d.type === "stat")).toHaveLength(0);
    expect(result.diffs.filter(d => d.type === "inventory")).toHaveLength(0);
    
    // May have world/relationship diffs from lore, but no stat changes
    console.log(`   State changes: ${result.diffs.map(d => d.type).join(", ") || "none"}`);
  }, TEST_CONFIG.turnTimeout);

  // Gemini QA validation (only runs with --gemini-qa flag)
  it.skipIf(!isGeminiQAEnabled())("should pass Gemini QA validation", async () => {
    console.log("\n🤖 Running Gemini QA validation...");
    
    const result = await executeTurn(characterId, "I look around");
    const qaResult = await validateWithGemini(result, {
      name: "look_around",
      description: "Passive observation of surroundings",
      action: "I look around",
      expectations: SCENARIO_EXPECTATIONS.lookAround,
      expectedNarrationHints: [
        "describes the current location",
        "mentions atmosphere or environment",
        "sets the scene appropriately",
      ],
    });
    
    console.log(`   Passed: ${qaResult.passed}`);
    console.log(`   Confidence: ${(qaResult.confidence * 100).toFixed(0)}%`);
    console.log(`   Reasoning: ${qaResult.reasoning}`);
    
    expect(qaResult.passed).toBe(true);
  }, TEST_CONFIG.turnTimeout);
});
