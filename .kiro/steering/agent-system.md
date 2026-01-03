# Agent System (A2A Architecture)

## Overview

Waypoint uses a multi-agent pipeline where each agent has a single responsibility. Agents communicate via structured I/O — no agent can directly mutate game state.

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

### 2. Rune Marshal (Mechanics & Intent)

**Purpose**: Parse player intent, detect power words, determine skill checks

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

**Output**:

```typescript
{
  detected_intent: {
    primary_skill: string,
    power_words: string[],
    tier: 1 | 2 | 3,
    bonus: number
  },
  requires_roll: boolean,
  roll_type: string,       // e.g., "Perception", "Melee"
  difficulty: number,      // DC
  modifiers: Array<{ source: string, value: number }>,
  allowed: boolean,
  denial_reason?: string   // If action impossible
}
```

**Rules**:

- Does NOT narrate outcomes
- Does NOT propose state changes
- Only determines mechanics
- Resolves alias → skill mapping
- Handles ambiguous multi-skill actions

**Temperature**: 0.1 (consistent mechanics)

---

### 3. Orchestrator (Director)

**Purpose**: Propose state changes based on action + mechanics outcome

**Input**:

```typescript
{
  user_action: string,
  current_state: GameState,
  canon_snippets: CanonSnippet[],
  mechanics_result: RuneMarshalOutput,
  roll_outcome?: { rolled: number, success: boolean },
  recent_events: TurnDiff[] // Last 3-5 turns
}
```

**Output**:

```typescript
{
  proposed_events: Array<{
    type: 'inventory_add' | 'inventory_remove' | 'relationship_change' |
          'quest_progress' | 'stat_change' | 'world_update' | 'npc_discovered',
    payload: Record<string, any>,
    reason: string         // Why this change
  }>,
  scene_direction: string  // Brief guidance for Chronicler
}
```

**Rules**:

- No prose generation
- No committing to state
- Only proposes — Arbiter validates
- Must provide reason for each event

**Temperature**: 0.4 (some creativity in proposals)

---

### 4. World Arbiter (Reality Guardrail)

**Purpose**: Validate proposed events against canon and game rules

**Input**:

```typescript
{
  user_action: string,
  proposed_events: ProposedEvent[],
  canon_snippets: CanonSnippet[],
  current_state: GameState,
  rules: GameRules          // Item bounds, relationship caps, etc.
}
```

**Output**:

```typescript
{
  approved_events: ValidatedEvent[],
  rejected_events: Array<{
    event: ProposedEvent,
    reason: string,
    suggestion?: string    // How to fix
  }>,
  warnings: string[]       // Non-blocking concerns
}
```

**Rules**:

- Enforces "no inventing/overriding" canon
- Checks item rarity bounds
- Validates NPC existence or registers new ones
- Caps relationship changes (±2 per turn)
- Ensures quest progression is valid

**Temperature**: 0.1 (strict validation)

---

### 5. Chronicler (Storyteller)

**Purpose**: Generate final narration from validated events

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

**Output**:

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

| Agent            | Target    | Notes                                 |
| ---------------- | --------- | ------------------------------------- |
| Lorekeeper       | 300ms     | DB query + light LLM                  |
| Rune Marshal     | 400ms     | Low-temp, structured output           |
| Orchestrator     | 600ms     | Medium complexity                     |
| World Arbiter    | 400ms     | Mostly rule checks                    |
| Chronicler       | 1000ms    | Streaming, can start displaying early |
| Content Sentinel | 200ms     | Fast classifier                       |
| **Total**        | **~2.5s** | With Phase 1 parallel                 |

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
