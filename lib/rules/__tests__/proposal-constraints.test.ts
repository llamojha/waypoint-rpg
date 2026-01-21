/**
 * Proposal Constraints Tests
 */

import { describe, it, expect } from "vitest";
import {
  getAllowedProposalTools,
  getAllowedToolNames,
  getUnionOfAllowedTools,
  isProposalAllowed,
  getConstraintDescription,
} from "../proposal-constraints";
import type { ActionType } from "@/lib/agents/rune-marshal";

describe("Proposal Constraints", () => {
  describe("getAllowedToolNames", () => {
    it("returns empty array for passive", () => {
      expect(getAllowedToolNames("passive")).toEqual([]);
    });

    it("returns travel tools", () => {
      const names = getAllowedToolNames("travel");
      expect(names).toContain("propose_location_change");
      expect(names).toContain("propose_npc_discovered");
      expect(names).toHaveLength(2);
    });

    it("returns social tools", () => {
      const names = getAllowedToolNames("social");
      expect(names).toContain("propose_relationship_change");
      expect(names).toContain("propose_quest_start");
      expect(names).toContain("propose_quest_progress");
      expect(names).toContain("propose_npc_discovered");
      expect(names).toHaveLength(4);
    });

    it("returns combat tools", () => {
      const names = getAllowedToolNames("combat");
      expect(names).toContain("propose_stat_change");
      expect(names).toContain("propose_inventory_add");
      expect(names).toHaveLength(2);
    });

    it("returns object tools", () => {
      const names = getAllowedToolNames("object");
      expect(names).toContain("propose_inventory_add");
      expect(names).toContain("propose_inventory_remove");
      expect(names).toContain("propose_stat_change");
      expect(names).toHaveLength(3);
    });
  });

  describe("getAllowedProposalTools", () => {
    it("returns empty array for passive", () => {
      const tools = getAllowedProposalTools("passive");
      expect(tools).toHaveLength(0);
    });

    it("returns FunctionDeclaration objects for travel", () => {
      const tools = getAllowedProposalTools("travel");
      expect(tools.length).toBeGreaterThan(0);
      tools.forEach(tool => {
        expect(tool).toHaveProperty("name");
        expect(tool).toHaveProperty("parameters");
      });
    });

    it("excludes detect_intent from all action types", () => {
      const actionTypes: ActionType[] = ["passive", "travel", "social", "combat", "object"];
      actionTypes.forEach(type => {
        const tools = getAllowedProposalTools(type);
        const names = tools.map(t => t.name);
        expect(names).not.toContain("detect_intent");
      });
    });
  });

  describe("isProposalAllowed", () => {
    it("allows location_change for travel", () => {
      expect(isProposalAllowed("travel", "propose_location_change")).toBe(true);
    });

    it("disallows location_change for passive", () => {
      expect(isProposalAllowed("passive", "propose_location_change")).toBe(false);
    });

    it("allows relationship_change for social", () => {
      expect(isProposalAllowed("social", "propose_relationship_change")).toBe(true);
    });

    it("disallows relationship_change for combat", () => {
      expect(isProposalAllowed("combat", "propose_relationship_change")).toBe(false);
    });

    it("allows stat_change for combat and object", () => {
      expect(isProposalAllowed("combat", "propose_stat_change")).toBe(true);
      expect(isProposalAllowed("object", "propose_stat_change")).toBe(true);
    });

    it("disallows stat_change for travel", () => {
      expect(isProposalAllowed("travel", "propose_stat_change")).toBe(false);
    });
  });

  describe("getUnionOfAllowedTools", () => {
    it("returns empty for empty array", () => {
      const tools = getUnionOfAllowedTools([]);
      expect(tools).toHaveLength(0);
    });

    it("returns same as single type", () => {
      const single = getAllowedProposalTools("travel");
      const union = getUnionOfAllowedTools(["travel"]);
      expect(union.map(t => t.name).sort()).toEqual(single.map(t => t.name).sort());
    });

    it("combines tools from multiple types", () => {
      const union = getUnionOfAllowedTools(["travel", "social"]);
      const names = union.map(t => t.name);
      // From travel
      expect(names).toContain("propose_location_change");
      // From social
      expect(names).toContain("propose_relationship_change");
      // Shared (npc_discovered)
      expect(names).toContain("propose_npc_discovered");
    });

    it("deduplicates shared tools", () => {
      const union = getUnionOfAllowedTools(["travel", "social"]);
      const names = union.map(t => t.name);
      const npcDiscoveredCount = names.filter(n => n === "propose_npc_discovered").length;
      expect(npcDiscoveredCount).toBe(1);
    });
  });

  describe("getConstraintDescription", () => {
    it("returns description for passive", () => {
      const desc = getConstraintDescription("passive");
      expect(desc).toContain("observation");
      expect(desc).toContain("No state changes");
    });

    it("returns description for travel", () => {
      const desc = getConstraintDescription("travel");
      expect(desc).toContain("travel");
      expect(desc).toContain("location");
    });

    it("returns description for social", () => {
      const desc = getConstraintDescription("social");
      expect(desc).toContain("social");
      expect(desc).toContain("relationship");
    });

    it("returns description for combat", () => {
      const desc = getConstraintDescription("combat");
      expect(desc).toContain("combat");
      expect(desc).toContain("stat");
    });

    it("returns description for object", () => {
      const desc = getConstraintDescription("object");
      expect(desc).toContain("object");
      expect(desc).toContain("inventory");
    });
  });
});
