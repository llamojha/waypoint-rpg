/**
 * Locations Rules Tests
 */

import { describe, it, expect, vi } from "vitest";
import { canTravelTo, getValidDestinations, getLocationConstraints } from "../locations";

// Mock the cache module
vi.mock("../cache", () => ({
  getLocationConnectionRules: vi.fn().mockResolvedValue([
    { id: "1", fromLocation: "The Waystone", toLocation: "Nomante Outpost", requirements: null, travelTime: 1 },
    { id: "2", fromLocation: "Nomante Outpost", toLocation: "The Waystone", requirements: null, travelTime: 1 },
    { id: "3", fromLocation: "The Waystone", toLocation: "Highlands Wilderness", requirements: null, travelTime: 1 },
    { id: "4", fromLocation: "Highlands Wilderness", toLocation: "The Waystone", requirements: null, travelTime: 1 },
    { id: "5", fromLocation: "Nomante Outpost", toLocation: "Forbidden Grove", requirements: { quest: "forest_key" }, travelTime: 2 },
  ]),
}));

describe("Locations Rules", () => {
  const basicCharacter = { inventory: [], questsCompleted: [] };

  describe("canTravelTo", () => {
    it("allows travel on valid connection", async () => {
      const result = await canTravelTo("The Waystone", "Nomante Outpost", basicCharacter);
      expect(result.valid).toBe(true);
      expect(result.travelTime).toBe(1);
    });

    it("rejects travel with no connection", async () => {
      const result = await canTravelTo("The Waystone", "Unknown Place", basicCharacter);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("No path");
    });

    it("rejects travel with unmet quest requirement", async () => {
      const result = await canTravelTo("Nomante Outpost", "Forbidden Grove", basicCharacter);
      expect(result.valid).toBe(false);
      expect(result.unmetRequirements).toContain("Complete quest: forest_key");
    });

    it("allows travel when quest requirement is met", async () => {
      const characterWithQuest = { inventory: [], questsCompleted: ["forest_key"] };
      const result = await canTravelTo("Nomante Outpost", "Forbidden Grove", characterWithQuest);
      expect(result.valid).toBe(true);
    });
  });

  describe("getValidDestinations", () => {
    it("returns all valid destinations from The Waystone", async () => {
      const destinations = await getValidDestinations("The Waystone", basicCharacter);
      expect(destinations).toContain("Nomante Outpost");
      expect(destinations).toContain("Highlands Wilderness");
      expect(destinations).toHaveLength(2);
    });

    it("excludes destinations with unmet requirements", async () => {
      const destinations = await getValidDestinations("Nomante Outpost", basicCharacter);
      expect(destinations).toContain("The Waystone");
      expect(destinations).not.toContain("Forbidden Grove");
    });
  });

  describe("getLocationConstraints", () => {
    it("returns valid options as constraints", async () => {
      const constraints = await getLocationConstraints("The Waystone", basicCharacter);
      expect(constraints.validOptions).toContain("Nomante Outpost");
      expect(constraints.validOptions).toContain("Highlands Wilderness");
    });
  });
});
