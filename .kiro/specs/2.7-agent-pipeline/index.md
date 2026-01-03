# Spec: Agent Pipeline

## Status: ⏸️ DEFERRED (Post-Demo)

## Overview

Wire all agents together into the full A2A pipeline with parallel execution where possible.

## Estimate

4-6 hours

## Dependencies

- 2.6 orchestrator-arbiter

## Outputs

- Full 6-agent pipeline
- Parallel execution (Lorekeeper + Rune Marshal)
- Latency monitoring
- Error handling across pipeline

## Key Files

- `lib/agents/pipeline.ts`
- `lib/agents/index.ts`
- `app/api/turn/route.ts` (full pipeline)

## Acceptance Criteria

- [ ] All 6 agents execute in correct order
- [ ] Parallel agents run concurrently
- [ ] Total latency <3s target
- [ ] Graceful degradation on agent failure

## Notes

This spec is deferred until after the demo. The single-LLM approach works for MVP.
