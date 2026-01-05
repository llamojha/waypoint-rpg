# Spec 4.5: World Systems

## Status: 📋 NOT STARTED

## Overview

Implement map, travel, news feed, and codex systems. Uses tool calling for world state change proposals.

## Roadmap Reference

See #[[file:.kiro/steering/mvp-roadmap.md]] — Phase 4

## Scope Reference

See #[[file:.kiro/steering/mvp-scope.md]]

## Estimate

4-6 hours

## Dependencies

- 4.1 skill-system (complete)
- 4.2 combat-system (complete)
- 4.3 inventory-equipment (complete)
- 4.4 quest-npc-system (complete)
- 2.1 gemini-integration (tool calling infrastructure)

## Scope Summary

- Map display with locations
- Travel between locations
- World news feed (discoveries)
- Mark news as read
- Codex entries display
- Time/weather in header

## Tool Calling Integration

World state changes flow through tool calling:

```typescript
// World update via tool (location change, weather, time)
const worldUpdateEvent = {
  name: "propose_world_update",
  args: {
    field: "poi",
    value: "Ash Coast Outpost",
    reason: "Player traveled to new location",
  },
};

// Location discovery triggers news
const locationDiscoveredEvent = {
  name: "propose_location_discovered",
  args: {
    name: "Hidden Cave",
    region: "Ash Coast",
    description: "A dark cave entrance behind the waterfall",
  },
};
```

## Deliverables

- [ ] Map shows discovered locations
- [ ] Travel works correctly (via tool-proposed events)
- [ ] News shows other players' discoveries
- [ ] News read status tracks
- [ ] Codex searchable
- [ ] Time/weather updates

---

## Spec Documents

> Created when spec is started

- [ ] requirements.md
- [ ] design.md
- [ ] tasks.md

---

## Post-Implementation Review

> Completed after spec is done

- [ ] Review: Did implementation match design?
- [ ] Review: Any pivots or changes made?
- [ ] Update: Reflect changes in steering docs (mvp-scope.md)
- [ ] Update: Update roadmap status
