# Spec: Agent Pipeline (Tool Calling Architecture)

## Status: ⏸️ DEFERRED (Post-Demo)

## Overview

Wire all agents together into the full A2A pipeline using tool calling throughout. Each agent uses typed function declarations for its I/O, enabling parallel execution and robust error handling.

## Estimate

4-6 hours

## Dependencies

- 2.6 orchestrator-arbiter

## Outputs

- Full 6-agent pipeline with tool calling
- Parallel execution (Lorekeeper + Rune Marshal)
- Latency monitoring per tool call
- Error handling across pipeline

## Key Files

- `lib/agents/pipeline.ts`
- `lib/agents/index.ts`
- `lib/agents/tools/index.ts` (all tool declarations)
- `app/api/turn/route.ts` (full pipeline)

## Tool Calling Architecture

```
User Input
    │
    ├──────────────────┐
    ▼                  ▼
Lorekeeper        Rune Marshal     ◄── PARALLEL (tool calls)
[query_codex]     [detect_intent]
    │                  │
    └────────┬─────────┘
             ▼
        Orchestrator               ◄── Multiple tool calls
        [propose_stat_change]
        [propose_inventory_add]
        [propose_relationship_change]
        ...
             │
             ▼
       World Arbiter               ◄── Tool call per event
       [validate_event]
             │
             ▼
        Chronicler                 ◄── JSON mode (prose output)
             │
             ▼
      Content Sentinel             ◄── Deterministic filter
```

## Tool Call Summary by Agent

| Agent            | Tools Used                 | Temperature |
| ---------------- | -------------------------- | ----------- |
| Lorekeeper       | `query_codex`              | 0.1         |
| Rune Marshal     | `detect_intent`            | 0.1         |
| Orchestrator     | `propose_*` (multiple)     | 0.4         |
| World Arbiter    | `validate_event`           | 0.1         |
| Chronicler       | None (JSON mode for prose) | 0.8         |
| Content Sentinel | None (deterministic)       | N/A         |

## Benefits of Full Tool Calling

- **Consistent I/O contracts** — All agents use typed schemas
- **Better observability** — Each tool call logged with latency
- **Easier testing** — Mock tool responses for unit tests
- **Parallel safety** — No shared state between tool calls

## Acceptance Criteria

- [ ] All agents use tool calling (except Chronicler)
- [ ] All 6 agents execute in correct order
- [ ] Parallel agents run concurrently
- [ ] Total latency <3s target
- [ ] Graceful degradation on agent failure
- [ ] Tool call metrics logged

## Notes

This spec is deferred until after the demo. Builds on tool calling foundation established in 2.1/2.2.
