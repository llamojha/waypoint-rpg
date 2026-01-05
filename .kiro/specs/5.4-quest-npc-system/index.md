# Spec 4.4: Quest & NPC System

## Status: 📋 NOT STARTED

## Overview

Implement quest tracking, progression, and NPC relationship management. Uses tool calling for quest/relationship change proposals.

## Roadmap Reference

See #[[file:.kiro/steering/mvp-roadmap.md]] — Phase 4

## Mechanics Reference

See #[[file:.kiro/steering/game-mechanics.md]]

## Estimate

6-8 hours

## Dependencies

- 3.1 demo-experience (complete)
- 2.1 gemini-integration (tool calling infrastructure)

## Scope Summary

- Quest tracking UI in left column
- Quest progress updates
- Quest completion handling
- NPC relationship display (-5 to +5)
- Relationship change tracking
- NPC history logging

## Tool Calling Integration

Quest and NPC changes flow through tool calling:

```typescript
// Quest progress via tool
const questProgressEvent = {
  name: "propose_quest_progress",
  args: {
    quest_id: "q1",
    new_progress: 2,
    reason: "Found the hidden entrance",
  },
};

// Relationship change via tool
const relationshipEvent = {
  name: "propose_relationship_change",
  args: {
    npc: "Mira the Fence",
    delta: 1,
    reason: "Completed her request",
  },
};

// NPC discovery via tool
const npcDiscoveredEvent = {
  name: "propose_npc_discovered",
  args: {
    name: "Old Fisherman",
    role: "Hermit",
    location: "Ash Coast",
    personality: ["gruff", "wise"],
  },
};
```

## Deliverables

- [ ] Active quests display
- [ ] Progress updates correctly (via tool-proposed events)
- [ ] Quest completion triggers rewards
- [ ] NPC relationships display
- [ ] Relationship changes persist
- [ ] History shows interactions

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
- [ ] Update: Reflect changes in steering docs (game-mechanics.md)
- [ ] Update: Update roadmap status
