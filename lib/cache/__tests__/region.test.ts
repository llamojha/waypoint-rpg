/**
 * Region Cache Tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock Supabase before importing the module
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      const mockData: Record<string, unknown[]> = {
        waypoint_locations: [
          { id: "loc1", name: "Ash Coast Outpost", type: "settlement", region: "Ash Coast", description: "A dusty outpost", art_url: null },
          { id: "loc2", name: "Driftwood Tavern", type: "tavern", region: "Ash Coast", description: "A cozy tavern", art_url: "http://example.com/tavern.jpg" },
        ],
        waypoint_npcs: [
          { id: "npc1", name: "Glimmer", role: "Merchant", location: "Ash Coast Outpost", personality: ["friendly"], dialogue_hints: ["speaks softly"], portrait_url: null },
          { id: "npc2", name: "Brak", role: "Guard", location: "Ash Coast Outpost", personality: ["stern"], dialogue_hints: [], portrait_url: null },
        ],
        waypoint_codex_entries: [
          { id: "codex1", title: "The Ash Coast", category: "location", text: "A desolate coastal region", status: "canon", tags: ["ash coast", "geography"] },
        ],
        waypoint_rules_location_connections: [
          { from_location: "Ash Coast Outpost", to_location: "Driftwood Tavern", travel_time: 5, requirements: null },
          { from_location: "Driftwood Tavern", to_location: "Ash Coast Outpost", travel_time: 5, requirements: null },
        ],
        waypoint_rules_loot_tables: [
          { id: "loot1", location_type: "tavern", item_name: "Ale", item_type: "consumable", rarity: "common", drop_chance: 0.5 },
        ],
      };

      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: mockData[table] || [],
            error: null,
          })),
          in: vi.fn(() => ({
            data: mockData[table] || [],
            error: null,
          })),
          contains: vi.fn(() => ({
            data: mockData[table] || [],
            error: null,
          })),
          or: vi.fn(() => ({
            data: mockData[table] || [],
            error: null,
          })),
          data: mockData[table] || [],
          error: null,
        })),
      };
    }),
  })),
}));

import {
  getCachedRegion,
  isCacheLoadedForRegion,
  loadRegionCache,
  clearRegionCache,
  getCachedLocations,
  getCachedLocation,
  getCachedNpcsAtLocation,
  getCachedNpc,
  getCachedNpcs,
  getCachedCodexByKeywords,
  getCachedConnections,
  isValidTravel,
  getCachedLootTable,
  getCachedLocationNames,
} from "../region";

describe("Region Cache", () => {
  beforeEach(() => {
    clearRegionCache();
  });

  describe("cache state", () => {
    it("returns null region when not loaded", () => {
      expect(getCachedRegion()).toBeNull();
    });

    it("returns false for isCacheLoadedForRegion when not loaded", () => {
      expect(isCacheLoadedForRegion("Ash Coast")).toBe(false);
    });

    it("returns empty arrays when not loaded", () => {
      expect(getCachedLocations()).toEqual([]);
      expect(getCachedNpcs()).toEqual([]);
      expect(getCachedLocationNames()).toEqual([]);
    });
  });

  describe("loadRegionCache", () => {
    it("loads cache and sets region", async () => {
      await loadRegionCache("Ash Coast");
      expect(getCachedRegion()).toBe("Ash Coast");
      expect(isCacheLoadedForRegion("Ash Coast")).toBe(true);
    });

    it("returns cache data", async () => {
      const cache = await loadRegionCache("Ash Coast");
      expect(cache.region).toBe("Ash Coast");
      expect(cache.locations).toBeDefined();
      expect(cache.npcs).toBeDefined();
      expect(cache.loadedAt).toBeDefined();
    });
  });

  describe("clearRegionCache", () => {
    it("clears the cache", async () => {
      await loadRegionCache("Ash Coast");
      expect(getCachedRegion()).toBe("Ash Coast");
      
      clearRegionCache();
      expect(getCachedRegion()).toBeNull();
      expect(getCachedLocations()).toEqual([]);
    });
  });

  describe("location accessors", () => {
    beforeEach(async () => {
      await loadRegionCache("Ash Coast");
    });

    it("getCachedLocations returns all locations", () => {
      const locations = getCachedLocations();
      expect(locations.length).toBeGreaterThan(0);
    });

    it("getCachedLocation finds by name (case insensitive)", () => {
      const location = getCachedLocation("ash coast outpost");
      expect(location).toBeDefined();
      expect(location?.name).toBe("Ash Coast Outpost");
    });

    it("getCachedLocation returns undefined for unknown", () => {
      const location = getCachedLocation("Unknown Place");
      expect(location).toBeUndefined();
    });

    it("getCachedLocationNames returns all names", () => {
      const names = getCachedLocationNames();
      expect(names).toContain("Ash Coast Outpost");
      expect(names).toContain("Driftwood Tavern");
    });
  });

  describe("NPC accessors", () => {
    beforeEach(async () => {
      await loadRegionCache("Ash Coast");
    });

    it("getCachedNpcs returns all NPCs", () => {
      const npcs = getCachedNpcs();
      expect(npcs.length).toBeGreaterThan(0);
    });

    it("getCachedNpc finds by name (case insensitive)", () => {
      const npc = getCachedNpc("glimmer");
      expect(npc).toBeDefined();
      expect(npc?.name).toBe("Glimmer");
    });

    it("getCachedNpcsAtLocation filters by location", () => {
      const npcs = getCachedNpcsAtLocation("Ash Coast Outpost");
      expect(npcs.length).toBe(2);
      expect(npcs.map(n => n.name)).toContain("Glimmer");
      expect(npcs.map(n => n.name)).toContain("Brak");
    });

    it("getCachedNpcsAtLocation returns empty for unknown location", () => {
      const npcs = getCachedNpcsAtLocation("Unknown Place");
      expect(npcs).toEqual([]);
    });
  });

  describe("codex accessors", () => {
    beforeEach(async () => {
      await loadRegionCache("Ash Coast");
    });

    it("getCachedCodexByKeywords finds matching entries", () => {
      const entries = getCachedCodexByKeywords(["coast"]);
      expect(entries.length).toBeGreaterThan(0);
    });

    it("getCachedCodexByKeywords respects limit", () => {
      const entries = getCachedCodexByKeywords(["coast"], 1);
      expect(entries.length).toBeLessThanOrEqual(1);
    });

    it("getCachedCodexByKeywords returns empty for no matches", () => {
      const entries = getCachedCodexByKeywords(["xyznonexistent"]);
      expect(entries).toEqual([]);
    });
  });

  describe("connection accessors", () => {
    beforeEach(async () => {
      await loadRegionCache("Ash Coast");
    });

    it("getCachedConnections returns destinations", () => {
      const destinations = getCachedConnections("Ash Coast Outpost");
      expect(destinations).toContain("Driftwood Tavern");
    });

    it("isValidTravel returns true for valid connection", () => {
      expect(isValidTravel("Ash Coast Outpost", "Driftwood Tavern")).toBe(true);
    });

    it("isValidTravel returns false for invalid connection", () => {
      expect(isValidTravel("Ash Coast Outpost", "Unknown Place")).toBe(false);
    });

    it("isValidTravel returns false when cache not loaded", () => {
      clearRegionCache();
      expect(isValidTravel("Ash Coast Outpost", "Driftwood Tavern")).toBe(false);
    });
  });

  describe("loot table accessors", () => {
    beforeEach(async () => {
      await loadRegionCache("Ash Coast");
    });

    it("getCachedLootTable returns items for location type", () => {
      const loot = getCachedLootTable("tavern");
      expect(loot.length).toBeGreaterThan(0);
      expect(loot[0].itemName).toBe("Ale");
    });

    it("getCachedLootTable returns empty for unknown type", () => {
      const loot = getCachedLootTable("dungeon");
      expect(loot).toEqual([]);
    });
  });
});
