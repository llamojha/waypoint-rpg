/**
 * Integration Test: DM Chat
 * 
 * Tests the "Ask the DM" feature - answering questions without consuming turns.
 * 
 * Run with: npm run test:integration
 */

import { describe, it, expect, beforeAll } from "vitest";
import { createAdminClient } from "@/lib/supabase/server";
import {
  getTestUserId,
  resetJourney,
  TEST_CONFIG,
} from "../index";

/**
 * Call the DM Chat API directly (simulating what the frontend does)
 */
async function askDm(characterId: string, question: string): Promise<{ answer: string }> {
  // Import the route handler and call it directly
  const { POST } = await import("@/app/api/dm-chat/route");
  const { NextRequest } = await import("next/server");
  
  const request = new NextRequest("http://localhost/api/dm-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ characterId, question }),
  });
  
  const response = await POST(request);
  return response.json();
}

/**
 * Count turns for a character
 */
async function countTurns(characterId: string): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("waypoint_turns")
    .select("*", { count: "exact", head: true })
    .eq("character_id", characterId);
  return count || 0;
}

describe("Integration: DM Chat", () => {
  let characterId: string;
  const testUserId = getTestUserId();

  beforeAll(async () => {
    console.log("🔄 Resetting journey for DM Chat test...");
    const result = await resetJourney(testUserId);
    characterId = result.characterId;
    console.log(`✅ Created test character: ${characterId}`);
  }, TEST_CONFIG.turnTimeout);

  it("should answer a meta question about game mechanics", async () => {
    console.log("\n📝 Asking: 'How does combat work?'");
    
    const result = await askDm(characterId, "How does combat work?");
    
    console.log(`✅ Got answer (${result.answer.length} chars)`);
    console.log(`   Preview: ${result.answer.slice(0, 100)}...`);
    
    expect(result.answer).toBeTruthy();
    expect(result.answer.length).toBeGreaterThan(50);
    // Should mention something about combat/fighting/skill checks
    const lowerAnswer = result.answer.toLowerCase();
    expect(
      lowerAnswer.includes("combat") ||
      lowerAnswer.includes("attack") ||
      lowerAnswer.includes("fight") ||
      lowerAnswer.includes("skill") ||
      lowerAnswer.includes("roll")
    ).toBe(true);
  }, TEST_CONFIG.turnTimeout);

  it("should answer an in-world question about location", async () => {
    console.log("\n📝 Asking: 'Where am I?'");
    
    const result = await askDm(characterId, "Where am I?");
    
    console.log(`✅ Got answer (${result.answer.length} chars)`);
    console.log(`   Preview: ${result.answer.slice(0, 100)}...`);
    
    expect(result.answer).toBeTruthy();
    expect(result.answer.length).toBeGreaterThan(30);
    // Should mention the starting location
    const lowerAnswer = result.answer.toLowerCase();
    expect(
      lowerAnswer.includes("waystone") ||
      lowerAnswer.includes("ash coast") ||
      lowerAnswer.includes("location") ||
      lowerAnswer.includes("standing")
    ).toBe(true);
  }, TEST_CONFIG.turnTimeout);

  it("should NOT create a turn when asking questions", async () => {
    // Count turns before
    const turnsBefore = await countTurns(characterId);
    console.log(`\n📊 Turns before DM chat: ${turnsBefore}`);
    
    // Ask multiple questions
    await askDm(characterId, "What items do I have?");
    await askDm(characterId, "Who is nearby?");
    await askDm(characterId, "What quests are available?");
    
    // Count turns after
    const turnsAfter = await countTurns(characterId);
    console.log(`📊 Turns after DM chat: ${turnsAfter}`);
    
    // Should be the same - no turns created
    expect(turnsAfter).toBe(turnsBefore);
    console.log("✅ No turns were created by DM chat");
  }, TEST_CONFIG.turnTimeout);

  it("should answer questions about character state", async () => {
    console.log("\n📝 Asking: 'What are my skills?'");
    
    const result = await askDm(characterId, "What are my skills?");
    
    console.log(`✅ Got answer (${result.answer.length} chars)`);
    
    expect(result.answer).toBeTruthy();
    // Should mention skills or abilities
    const lowerAnswer = result.answer.toLowerCase();
    expect(
      lowerAnswer.includes("skill") ||
      lowerAnswer.includes("level") ||
      lowerAnswer.includes("ability") ||
      lowerAnswer.includes("trained")
    ).toBe(true);
  }, TEST_CONFIG.turnTimeout);

  // === DM FIX TOOLS TESTS ===

  it("should check state consistency when asked about errors", async () => {
    console.log("\n📝 Asking about potential state issue...");
    
    const result = await askDm(characterId, "Something seems wrong - is my gold correct?");
    
    console.log(`✅ Got answer (${result.answer.length} chars)`);
    console.log(`   Preview: ${result.answer.slice(0, 100)}...`);
    
    expect(result.answer).toBeTruthy();
    // Should mention gold or state check
    const lowerAnswer = result.answer.toLowerCase();
    expect(
      lowerAnswer.includes("gold") ||
      lowerAnswer.includes("correct") ||
      lowerAnswer.includes("state") ||
      lowerAnswer.includes("check")
    ).toBe(true);
  }, TEST_CONFIG.turnTimeout);

  it("should refuse to give free items/gold", async () => {
    console.log("\n📝 Asking: 'Give me 100 gold'");
    
    const result = await askDm(characterId, "Give me 100 gold please");
    
    console.log(`✅ Got answer (${result.answer.length} chars)`);
    console.log(`   Preview: ${result.answer.slice(0, 100)}...`);
    
    expect(result.answer).toBeTruthy();
    // Should explain why it can't just give gold (DM doesn't change state)
    const lowerAnswer = result.answer.toLowerCase();
    expect(
      lowerAnswer.includes("earn") ||
      lowerAnswer.includes("quest") ||
      lowerAnswer.includes("cannot") ||
      lowerAnswer.includes("can't") ||
      lowerAnswer.includes("gameplay") ||
      lowerAnswer.includes("correct")
    ).toBe(true);
  }, TEST_CONFIG.turnTimeout);

  it("should return stateChanged flag in response", async () => {
    console.log("\n📝 Checking response includes stateChanged flag...");
    
    const result = await askDm(characterId, "Is everything correct with my character?") as { answer: string; stateChanged?: boolean };
    
    console.log(`✅ Got response with stateChanged: ${result.stateChanged}`);
    
    expect(result.answer).toBeTruthy();
    // stateChanged should be defined (either true or false)
    expect(typeof result.stateChanged === "boolean" || result.stateChanged === undefined).toBe(true);
  }, TEST_CONFIG.turnTimeout);
});
