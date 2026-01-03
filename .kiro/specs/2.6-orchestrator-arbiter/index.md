# Spec: Orchestrator & Arbiter (with Tool Calling)

## Status: ⏸️ DEFERRED (Post-Demo)

## Overview

Split state change proposal (Orchestrator) from validation (World Arbiter) using tool calling for typed event proposals and validation decisions.

## Estimate

6-8 hours

## Dependencies

- 2.5 lorekeeper

## Outputs

- Orchestrator agent proposes state changes via tools
- World Arbiter validates using typed tool responses
- Rejection handling with retry
- Event format standardization

## Key Files

- `lib/agents/orchestrator.ts`
- `lib/agents/arbiter.ts`
- `lib/agents/tools/orchestrator-tools.ts`
- `lib/agents/tools/arbiter-tools.ts`
- `lib/validation/rules.ts`

## Tool Calling Approach

### Orchestrator Tools (Event Proposals)

Each event type is a separate tool for cleaner separation:

```typescript
export const proposeStatChangeTool: FunctionDeclaration = {
  name: "propose_stat_change",
  description: "Propose HP or gold change",
  parameters: {
    type: Type.OBJECT,
    properties: {
      stat: { type: Type.STRING, enum: ["hp", "gold"] },
      delta: { type: Type.NUMBER },
      reason: { type: Type.STRING },
    },
    required: ["stat", "delta", "reason"],
  },
};

export const proposeInventoryAddTool: FunctionDeclaration = {
  name: "propose_inventory_add",
  description: "Propose adding an item to inventory",
  parameters: {
    type: Type.OBJECT,
    properties: {
      item_name: { type: Type.STRING },
      item_type: {
        type: Type.STRING,
        enum: ["weapon", "armor", "consumable", "quest", "trinket", "misc"],
      },
      rarity: {
        type: Type.STRING,
        enum: ["common", "uncommon", "rare", "legendary"],
      },
      description: { type: Type.STRING },
      reason: { type: Type.STRING },
    },
    required: ["item_name", "item_type", "reason"],
  },
};

// Similar tools for: inventory_remove, relationship_change, quest_progress, world_update, npc_discovered
```

### Arbiter Tools (Validation Decisions)

```typescript
export const validateEventTool: FunctionDeclaration = {
  name: "validate_event",
  description: "Validate a proposed event against game rules",
  parameters: {
    type: Type.OBJECT,
    properties: {
      approved: { type: Type.BOOLEAN },
      reason: { type: Type.STRING },
      modified_payload: { type: Type.OBJECT }, // Optional corrections
    },
    required: ["approved", "reason"],
  },
};
```

## Benefits

- **Type-safe event proposals** — No malformed JSON
- **Enum-constrained values** — Rarity, item types validated by schema
- **Clear validation flow** — Arbiter returns typed approve/reject
- **Easier debugging** — Each tool call is traceable

## Acceptance Criteria

- [ ] Orchestrator tools defined for all event types
- [ ] Arbiter validation tool working
- [ ] Orchestrator proposes reasonable changes
- [ ] Arbiter catches invalid proposals
- [ ] Rejection triggers re-generation
- [ ] Max 2 retries before fallback

## Notes

This spec is deferred until after the demo. Builds on tool calling foundation from 2.1/2.2.
