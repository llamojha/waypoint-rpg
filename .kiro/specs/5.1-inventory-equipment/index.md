# Spec 4.3: Inventory & Equipment

## Status: 📋 NOT STARTED

## Overview

Implement item management, equipment slots, and consumable usage. Uses tool calling for inventory change proposals.

## Roadmap Reference

See #[[file:.kiro/steering/mvp-roadmap.md]] — Phase 4

## Mechanics Reference

See #[[file:.kiro/steering/game-mechanics.md]]

## Estimate

4-6 hours

## Dependencies

- 3.1 demo-experience (complete)
- 2.1 gemini-integration (tool calling infrastructure)

## Scope Summary

- Inventory UI in left column
- 8 equipment slots display
- Equip/unequip actions
- Item stats affecting gameplay (AC, damage)
- Consumable usage (potions)
- Item tooltips

## Tool Calling Integration

Inventory changes flow through tool calling:

```typescript
// Item pickup via tool
const addItemEvent = {
  name: "propose_inventory_add",
  args: {
    item_name: "Healing Potion",
    item_type: "consumable",
    rarity: "common",
    description: "Restores 2d4+2 HP",
    reason: "Found in chest",
  },
};

// Item removal via tool
const removeItemEvent = {
  name: "propose_inventory_remove",
  args: {
    item_name: "Healing Potion",
    reason: "Consumed to restore health",
  },
};
```

## Deliverables

- [ ] Inventory displays correctly
- [ ] Equipment slots show equipped items
- [ ] Equip/unequip works (via tool-proposed events)
- [ ] Stats update when equipment changes
- [ ] Consumables can be used
- [ ] Narration reflects equipment

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
