# Agent System (Hub-and-Spoke Architecture with Tool Calling)

## Overview

Waypoint uses a hub-and-spoke agent architecture where the **Orchestrator** acts as the central coordinator. Agents communicate via Gemini tool calling (function calling) for typed, schema-enforced I/O — no agent can directly mutate game state.

## Tool Calling Strategy

| Agent            | Uses Tool Calling? | Reason                        |
| ---------------- | ------------------ | ----------------------------- |
| Rune Marshal     | ✅ Yes             | Typed intent detection        |
| Orchestrator     | ✅ Yes             | Dispatches to specialists     |
| Lorekeeper       | ✅ Yes             | Typed codex queries           |
| World Arbiter    | ✅ Yes             | Typed validation decisions    |
| Chronicler       | ❌ No (JSON mode)  | Free-form prose output        |
| Content Sentinel | ❌ No              | Deterministic filtering       |

## Agent Pipeline Flow (Hub-and-Spoke)

```
User Input
    │
    ▼
┌─────────────────┐
│  Rune Marshal   │ ◄── Detect intent, power words, determine checks
└────────┬────────┘
         │ intent { skill, dc, requires_roll }
         ▼
┌─────────────────┐
│  Orchestrator   │ ◄── Central coordinator (THE HUB)
│    (Hub)        │
└────────┬────────┘
         │
         │ Dispatches targeted queries based on intent
         │
    ┌────┴────┬────────────┐
    ▼         ▼            ▼
┌────────┐ ┌────────┐ ┌──────────┐
│Lore-   │ │World   │ │ Other    │  ◄── PARALLEL (spokes)
│keeper  │ │Arbiter │ │Validators│
└────┬───┘ └────┬───┘ └────┬─────┘
     │          │          │
     └──────────┴──────────┘
                │
                ▼ collected responses
┌─────────────────┐
│  Orchestrator   │ ◄── Collects answers, builds context
│  (Hub returns)  │
└────────┬────────┘
         │ approved_events[] + context
         ▼
┌─────────────────┐
│   Chronicler    │ ◄── Generate narration from approved events
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

## Key Design Principles

### Why Hub-and-Spoke?

1. **Intent-Driven Queries**: Orchestrator knows what the player wants before querying specialists
2. **Efficient**: Only fetch relevant canon/validation (no wasted tokens)
3. **Parallel Resolution**: Lorekeeper + Arbiter + other validators run simultaneously
4. **Single Coordinator**: Orchestrator is the brain, others are specialists
5. **Extensible**: Add new validators without changing the flow

### Agent Responsibilities

| Agent | Does | Does NOT |
|-------|------|----------|
| Rune Marshal | Detect intent, skills, DC | Deny actions, narrate |
| Orchestrator | Coordinate, propose events, collect answers | Validate rules, generate prose |
| Lorekeeper | Fetch canon facts | Make decisions |
| World Arbiter | Validate/reject/modify events | Propose events |
| Chronicler | Generate narration | Make game decisions |

## Agent Specifications

### 1. Rune Marshal (Intent Detection) — First in Pipeline

**Purpose**: Parse player intent, detect power words, determine if skill check needed

**Position**: FIRST — runs before Orchestrator to establish intent

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
    ▼
Rune Marshal                       ◄── FIRST (establishes intent)
    │
    ▼
Orchestrator (dispatch)            ◄── Knows what to ask
    │
    ├─────────┬─────────┐
    ▼         ▼         ▼
Lorekeeper  Arbiter   (others)     ◄── PARALLEL (spokes)
    │         │         │
    └─────────┴─────────┘
              │
              ▼
Orchestrator (collect)             ◄── Aggregates responses
    │
    ▼
Chronicler                         ◄── Narrates approved events
    │
    ▼
Content Sentinel
```

### Parallel Execution Groups

| Phase | Agents                              | Can Parallelize? | Notes                                |
| ----- | ----------------------------------- | ---------------- | ------------------------------------ |
| 1     | Rune Marshal                        | ❌ Sequential    | Must run first to establish intent   |
| 2     | Orchestrator (dispatch)             | ❌ Sequential    | Prepares targeted queries            |
| 3     | Lorekeeper, World Arbiter, others   | ✅ Yes           | Parallel spokes with specific queries|
| 4     | Orchestrator (collect)              | ❌ Sequential    | Aggregates spoke responses           |
| 5     | Chronicler                          | ❌ Sequential    | Needs approved events + context      |
| 6     | Content Sentinel                    | ❌ Sequential    | Needs final prose                    |

### Implementation Pattern

```typescript
// Phase 1: Intent Detection
const intent = await runeMarshal.analyze({ 
  user_action, 
  character, 
  context 
});

// Phase 2: Orchestrator prepares queries based on intent
const queries = orchestrator.prepareQueries({
  user_action,
  intent,
  current_state,
});

// Phase 3: Parallel spoke execution
const [lorekeeperResult, arbiterResult] = await Promise.all([
  lorekeeper.query(queries.lorekeeper),  // "What do we know about these guards?"
  worldArbiter.prevalidate(queries.arbiter),  // "Can player sneak here?"
]);

// Phase 4: Orchestrator collects and proposes events
const proposedEvents = await orchestrator.propose({
  user_action,
  intent,
  canon_snippets: lorekeeperResult.canon_snippets,
  validation_hints: arbiterResult.hints,
  roll_outcome,
});

// Phase 5: Stream narration
const chroniclerStream = chronicler.narrate({
  approved_events: proposedEvents.approved,
  context: lorekeeperResult.known_facts,
  scene_direction: proposedEvents.scene_direction,
  roll_outcome,
});

// Phase 6: Safety check
const finalOutput = await contentSentinel.filter({
  user_text: user_action,
  final_narration: await chroniclerStream.complete(),
});
```

### Latency Budget (Target: <3s total)

| Agent            | Target    | Notes                                  |
| ---------------- | --------- | -------------------------------------- |
| Rune Marshal     | 400ms     | Low-temp, tool call (schema-enforced)  |
| Orchestrator     | 200ms     | Query preparation (minimal LLM)        |
| Lorekeeper       | 300ms     | DB query + tool call                   |
| World Arbiter    | 400ms     | Parallel with Lorekeeper               |
| Orchestrator     | 400ms     | Event proposal with context            |
| Chronicler       | 1000ms    | Streaming JSON mode, display early     |
| Content Sentinel | 200ms     | Fast classifier (no LLM)               |
| **Total**        | **~2.5s** | With Phase 3 parallel                  |

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
