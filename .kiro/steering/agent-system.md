# Agent System (A2A Architecture with Tool Calling)

## Overview

Waypoint uses a multi-agent pipeline where each agent has a single responsibility. Agents communicate via Gemini tool calling (function calling) for typed, schema-enforced I/O — no agent can directly mutate game state.

## Tool Calling Strategy

| Agent            | Uses Tool Calling? | Reason                        |
| ---------------- | ------------------ | ----------------------------- |
| Lorekeeper       | ✅ Yes             | Typed codex queries           |
| Rune Marshal     | ✅ Yes             | Typed intent detection        |
| Orchestrator     | ✅ Yes             | Multiple event proposal tools |
| World Arbiter    | ✅ Yes             | Typed validation decisions    |
| Chronicler       | ❌ No (JSON mode)  | Free-form prose output        |
| Content Sentinel | ❌ No              | Deterministic filtering       |

## Agent Pipeline Flow

```
User Input
    │
    ▼
┌─────────────────┐
│   Lorekeeper    │ ◄── Query canon/codex
└────────┬────────┘
         │ canon_snippets[]
         ▼
┌─────────────────┐
│  Rune Marshal   │ ◄── Detect intent, power words, determine checks
└────────┬────────┘
         │ mechanics (roll_type, DC, modifiers)
         ▼
┌─────────────────┐
│  Orchestrator   │ ◄── Propose state changes
└────────┬────────┘
         │ proposed_events[]
         ▼
┌─────────────────┐
│ World Arbiter   │ ◄── Validate against canon/state
└────────┬────────┘
         │ approved_events[]
         ▼
┌─────────────────┐
│   Chronicler    │ ◄── Generate narration
└────────┬────────┘
         │ prose + summary
         ▼
┌─────────────────┐
│Content Sentinel │ ◄── Safety filter
└────────┬────────┘
         │ final_output
         ▼
    UI / Client
```

## Agent Specifications

### 1. Lorekeeper (Read-Only Knowledge)

**Purpose**: Retrieve relevant canon and lore for current context

**Input**:

```typescript
{
  scene: WorldContext,
  query: string,           // Derived from user action
  entity_refs: string[]    // NPCs, locations, items mentioned
}
```

**Output**:

```typescript
{
  canon_snippets: Array<{
    source_id: string,     // Codex entry ID
    text: string,
    relevance: number      // 0-1 score
  }>,
  known_facts: string      // Summary for other agents
}
```

**Rules**:

- Read-only — no state changes
- No decisions or interpretations
- Returns raw facts for other agents to use

**Temperature**: 0.1 (deterministic retrieval)

---

### 2. Rune Marshal (Mechanics & Intent) — Tool Calling

**Purpose**: Parse player intent, detect power words, determine skill checks

**Tool Declaration**:

```typescript
import { FunctionDeclaration, Type } from "@google/genai";

export const detectIntentTool: FunctionDeclaration = {
  name: "detect_intent",
  description: "Analyze player action to determine skill check requirements",
  parameters: {
    type: Type.OBJECT,
    properties: {
      primary_skill: { type: Type.STRING, enum: SKILL_NAMES },
      power_words: { type: Type.ARRAY, items: { type: Type.STRING } },
      tier: { type: Type.NUMBER, enum: [1, 2, 3] },
      bonus: { type: Type.NUMBER },
      requires_roll: { type: Type.BOOLEAN },
      dc: { type: Type.NUMBER },
      denial_reason: { type: Type.STRING },
    },
    required: ["primary_skill", "requires_roll"],
  },
};
```

**Input**:

```typescript
{
  user_action: string,
  character: {
    skills: Record<string, SkillProgression>,
    conditions: Condition[],
    equipment: Equipment
  },
  context: string          // Brief scene context
}
```

**Output** (via tool call):

```typescript
{
  primary_skill: string,
  power_words: string[],
  tier: 1 | 2 | 3,
  bonus: number,
  requires_roll: boolean,
  dc?: number,
  denial_reason?: string
}
```

**Rules**:

- Does NOT narrate outcomes
- Does NOT propose state changes
- Only determines mechanics
- Resolves alias → skill mapping
- Handles ambiguous multi-skill actions
- Schema-enforced output (no JSON parsing)

**Temperature**: 0.1 (consistent mechanics)

---

### 3. Orchestrator (Director) — Tool Calling

**Purpose**: Propose state changes based on action + mechanics outcome

**Tool Declarations** (one per event type):

```typescript
export const proposeStatChangeTool: FunctionDeclaration = {
  name: "propose_stat_change",
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

// Additional tools: propose_inventory_remove, propose_relationship_change,
// propose_quest_progress, propose_world_update, propose_npc_discovered
```

**Input**:

```typescript
{
  user_action: string,
  current_state: GameState,
  canon_snippets: CanonSnippet[],
  mechanics_result: DetectIntentResult,
  roll_outcome?: { rolled: number, success: boolean },
  recent_events: TurnDiff[]
}
```

**Output** (via multiple tool calls):

```typescript
// Gemini calls multiple tools as needed:
// - propose_stat_change({ stat: 'hp', delta: -5, reason: '...' })
// - propose_inventory_add({ item_name: '...', ... })
// - propose_relationship_change({ npc: '...', delta: 1, reason: '...' })

// Plus scene direction in final response
scene_direction: string;
```

**Rules**:

- No prose generation
- No committing to state
- Only proposes — Arbiter validates
- Each tool call includes reason
- Multiple tools can be called per turn

**Temperature**: 0.4 (some creativity in proposals)

---

### 4. World Arbiter (Reality Guardrail) — Tool Calling

**Purpose**: Validate proposed events against canon and game rules

**Tool Declaration**:

```typescript
export const validateEventTool: FunctionDeclaration = {
  name: "validate_event",
  description: "Validate a proposed event against game rules and canon",
  parameters: {
    type: Type.OBJECT,
    properties: {
      event_id: { type: Type.STRING },
      approved: { type: Type.BOOLEAN },
      reason: { type: Type.STRING },
      modified_payload: { type: Type.OBJECT }, // Optional corrections
    },
    required: ["event_id", "approved", "reason"],
  },
};
```

**Input**:

```typescript
{
  user_action: string,
  proposed_events: ProposedEvent[],  // From Orchestrator tool calls
  canon_snippets: CanonSnippet[],
  current_state: GameState,
  rules: GameRules
}
```

**Output** (via tool calls, one per event):

```typescript
// For each proposed event:
{
  event_id: string,
  approved: boolean,
  reason: string,
  modified_payload?: Record<string, any>  // Corrections if needed
}
```

**Rules**:

- Enforces "no inventing/overriding" canon
- Checks item rarity bounds
- Validates NPC existence or registers new ones
- Caps relationship changes (±2 per turn)
- Ensures quest progression is valid
- Can modify events (e.g., cap damage) rather than reject

**Temperature**: 0.1 (strict validation)

---

### 5. Chronicler (Storyteller) — JSON Mode

**Purpose**: Generate final narration from validated events

**Note**: Chronicler uses JSON mode, NOT tool calling, because narration is free-form prose.

**Input**:

```typescript
{
  validated_events: ValidatedEvent[],
  updated_state: GameState,
  canon_snippets?: CanonSnippet[],
  scene_direction: string,
  roll_outcome?: { skill: string, rolled: number, success: boolean }
}
```

**Output** (JSON mode):

```typescript
{
  prose: string,           // Streamed via SSE
  summary: TurnDiff[],     // UI-friendly "what changed"
  suggested_actions: string[]
}
```

**Rules**:

- Only narrates validated events
- Must acknowledge roll outcomes accurately
- Second person, PG-13 fantasy tone
- Cannot invent state changes

**Temperature**: 0.8 (creative prose)

---

### 6. Content Sentinel (Safety Gate)

**Purpose**: Final safety filter before display

**Input**:

```typescript
{
  user_text: string,
  final_narration: string
}
```

**Output**:

```typescript
{
  status: 'allow' | 'block' | 'transform',
  output: string,          // Original or sanitized
  flags?: string[]         // What was caught
}
```

**Rules**:

- Runs LAST before display
- Blocks explicit sexual content
- Blocks hate speech / slurs
- Transforms borderline content
- Logs violations for review

**Temperature**: 0.0 (deterministic safety)

---

## Parallelization & Latency Optimization

### Dependency Graph

```
User Input
    │
    ├──────────────────┐
    ▼                  ▼
Lorekeeper        Rune Marshal     ◄── PARALLEL (no dependencies)
    │                  │
    └────────┬─────────┘
             ▼
        Orchestrator               ◄── Waits for both
             │
             ▼
       World Arbiter
             │
             ▼
        Chronicler
             │
             ▼
      Content Sentinel
```

### Parallel Execution Groups

| Phase | Agents                   | Can Parallelize? | Notes                             |
| ----- | ------------------------ | ---------------- | --------------------------------- |
| 1     | Lorekeeper, Rune Marshal | ✅ Yes           | Both only need user input + state |
| 2     | Orchestrator             | ❌ Sequential    | Needs outputs from Phase 1        |
| 3     | World Arbiter            | ❌ Sequential    | Needs proposed_events             |
| 4     | Chronicler               | ❌ Sequential    | Needs validated_events            |
| 5     | Content Sentinel         | ❌ Sequential    | Needs final prose                 |

### Implementation Pattern

```typescript
// Phase 1: Parallel
const [lorekeeperResult, runeMarshalResult] = await Promise.all([
  lorekeeper.query({ scene, query, entity_refs }),
  runeMarshal.analyze({ user_action, character, context }),
]);

// Phase 2-5: Sequential pipeline
const orchestratorResult = await orchestrator.propose({
  user_action,
  current_state,
  canon_snippets: lorekeeperResult.canon_snippets,
  mechanics_result: runeMarshalResult,
  roll_outcome,
  recent_events,
});

const arbiterResult = await worldArbiter.validate({
  user_action,
  proposed_events: orchestratorResult.proposed_events,
  canon_snippets: lorekeeperResult.canon_snippets,
  current_state,
  rules,
});

// Stream narration as it generates
const chroniclerStream = chronicler.narrate({
  validated_events: arbiterResult.approved_events,
  updated_state,
  scene_direction: orchestratorResult.scene_direction,
  roll_outcome,
});

// Final safety check on complete prose
const finalOutput = await contentSentinel.filter({
  user_text: user_action,
  final_narration: await chroniclerStream.complete(),
});
```

### Latency Budget (Target: <3s total)

| Agent            | Target    | Notes                                  |
| ---------------- | --------- | -------------------------------------- |
| Lorekeeper       | 300ms     | DB query + tool call                   |
| Rune Marshal     | 400ms     | Low-temp, tool call (schema-enforced)  |
| Orchestrator     | 600ms     | Medium complexity, multiple tool calls |
| World Arbiter    | 400ms     | Mostly rule checks + tool calls        |
| Chronicler       | 1000ms    | Streaming JSON mode, display early     |
| Content Sentinel | 200ms     | Fast classifier (no LLM)               |
| **Total**        | **~2.5s** | With Phase 1 parallel                  |

### Tool Calling Benefits for Latency

- **Structured output** — No retry on JSON parse failures
- **Parallel tool calls** — Orchestrator can propose multiple events in one call
- **Schema validation** — Gemini validates before returning, fewer round trips

### Streaming Optimization

Chronicler streams prose via SSE while generating:

- User sees text appearing within 500ms of Chronicler start
- Don't wait for full completion before displaying
- Content Sentinel runs on chunks OR final (configurable)

### Caching Opportunities

| What                  | Cache Key                        | TTL     | Benefit               |
| --------------------- | -------------------------------- | ------- | --------------------- |
| Lorekeeper results    | `location_id + entity_refs hash` | 5 min   | Same location queries |
| Rune Marshal patterns | `action_verb + skill_context`    | Session | Repeated action types |
| Canon snippets        | `codex_entry_id`                 | 1 hour  | Immutable lore        |

### Graceful Degradation

If latency exceeds budget:

1. **Skip Lorekeeper** (optional) — Orchestrator works without canon context
2. **Simplify Chronicler prompt** — Shorter narration
3. **Cache Rune Marshal** — Use cached intent for similar actions

## Error Handling

### Agent Failure

- Timeout: 10s per agent, fallback to safe default
- Retry: Max 2 retries with exponential backoff
- Graceful degradation: Skip optional agents (Lorekeeper), fail on critical (Arbiter)

### Validation Rejection Loop

1. Arbiter rejects events
2. Notify user: "Refining the story..."
3. Re-run Orchestrator with rejection context
4. Max 2 loops, then fallback narration

## Observability

Each agent call logs:

- Input hash (for debugging)
- Output
- Latency
- Token usage
- Temperature used

Trace ID links all agents in a single turn for debugging.
