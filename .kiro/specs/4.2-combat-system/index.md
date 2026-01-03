# Spec 4.2: Combat System

## Status: 📋 NOT STARTED

## Overview

Implement HP tracking, damage calculation, enemy AI, and death mechanics. Uses tool calling for combat event proposals.

## Roadmap Reference

See #[[file:.kiro/steering/mvp-roadmap.md]] — Phase 4

## Mechanics Reference

See #[[file:.kiro/steering/combat-mechanics.md]]
See #[[file:.kiro/steering/bestiary.md]]

## Estimate

8-10 hours

## Dependencies

- 3.1 demo-experience (complete)
- 4.1 skill-system (can parallel)
- 2.2 skill-checks-mechanics (tool calling foundation)

## Scope Summary

- HP tracking (player + enemies)
- Damage calculation (weapons, modifiers)
- Defense calculation
- Enemy AI behavior patterns
- Death/incapacitation handling
- Loot drops on victory
- Fleeing mechanics

## Tool Calling Integration

Combat uses the tool calling infrastructure for:

1. **Attack resolution** — `detect_intent` identifies combat skills
2. **Damage proposals** — `propose_stat_change` tool for HP changes
3. **Loot generation** — `propose_inventory_add` tool for drops
4. **Condition application** — `propose_condition_add` tool for combat effects

```typescript
// Combat damage via tool calling (when full pipeline active)
const damageEvent = {
  name: "propose_stat_change",
  args: {
    stat: "hp",
    delta: -rollDamage(weapon),
    reason: `${enemy.name} attack hit`,
  },
};
```

## Deliverables

- [ ] HP displays and updates correctly
- [ ] Damage applies correctly (via tool-proposed events)
- [ ] Enemies attack back
- [ ] Death triggers correctly
- [ ] Loot drops work
- [ ] Combat feels responsive

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
- [ ] Update: Reflect changes in steering docs (combat-mechanics.md, bestiary.md)
- [ ] Update: Update roadmap status
