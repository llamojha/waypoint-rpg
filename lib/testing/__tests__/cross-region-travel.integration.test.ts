/**
 * Integration Tests: Cross-Region Travel
 * 
 * Tests traveling between the 4 regions of Summerland Island:
 * - The Highlands (starting region)
 * - Stormwall Coast
 * - Caledonia
 * - Dunamar
 */

import { describe, it, expect, beforeAll } from "vitest";
import { resetJourney, executeTurn, TEST_CONFIG, getTestUserId } from "@/lib/testing";

describe("Integration: Cross-Region Travel", () => {
  let characterId: string;

  beforeAll(async () => {
    console.log("🔄 Resetting journey for cross-region travel tests...");
    const result = await resetJourney(getTestUserId());
    characterId = result.characterId;
    console.log(`✅ Created test character: ${characterId}`);
  }, TEST_CONFIG.setupTimeout);

  it("should travel to all 4 regions and return to Highlands", async () => {
    // Start at The Waystone in The Highlands
    console.log("\n📍 Starting at The Waystone (The Highlands)");

    // Step 1: Go to Highlands Wilderness (hub)
    console.log("\n🚶 Step 1: Travel to Highlands Wilderness");
    const step1 = await executeTurn(characterId, "I travel to the Highlands Wilderness");
    console.log(`   Location: ${step1.world.poi}, Region: ${step1.world.region}`);
    expect(step1.world.region).toBe("The Highlands");
    // May or may not have moved depending on LLM - check we're in Highlands
    
    // Step 2: Travel to Stormwall Coast
    console.log("\n🚶 Step 2: Travel to Stormwall Coast Wilderness");
    const step2 = await executeTurn(characterId, "I travel north to the Stormwall Coast Wilderness");
    console.log(`   Location: ${step2.world.poi}, Region: ${step2.world.region}`);
    // Check we reached Stormwall Coast region
    expect(step2.world.region).toBe("Stormwall Coast");
    expect(step2.world.poi).toBe("Stormwall Coast Wilderness");

    // Step 3: Travel to Caledonia
    console.log("\n🚶 Step 3: Travel to Caledonia Wilderness");
    const step3 = await executeTurn(characterId, "I travel to the Caledonia Wilderness");
    console.log(`   Location: ${step3.world.poi}, Region: ${step3.world.region}`);
    expect(step3.world.region).toBe("Caledonia");
    expect(step3.world.poi).toBe("Caledonia Wilderness");

    // Step 4: Travel to Dunamar
    console.log("\n🚶 Step 4: Travel to Dunamar Wilderness");
    const step4 = await executeTurn(characterId, "I travel to the Dunamar Wilderness");
    console.log(`   Location: ${step4.world.poi}, Region: ${step4.world.region}`);
    expect(step4.world.region).toBe("Dunamar");
    expect(step4.world.poi).toBe("Dunamar Wilderness");

    // Step 5: Return to Highlands
    console.log("\n🚶 Step 5: Return to Highlands Wilderness");
    const step5 = await executeTurn(characterId, "I travel back to the Highlands Wilderness");
    console.log(`   Location: ${step5.world.poi}, Region: ${step5.world.region}`);
    expect(step5.world.region).toBe("The Highlands");
    expect(step5.world.poi).toBe("Highlands Wilderness");

    // Step 6: Return to The Waystone
    console.log("\n🚶 Step 6: Return to The Waystone");
    const step6 = await executeTurn(characterId, "I return to The Waystone");
    console.log(`   Location: ${step6.world.poi}, Region: ${step6.world.region}`);
    expect(step6.world.region).toBe("The Highlands");
    expect(step6.world.poi).toBe("The Waystone");

    console.log("\n✅ Successfully traveled to all 4 regions and returned!");
  }, TEST_CONFIG.turnTimeout * 8); // Allow time for 6+ turns
});
