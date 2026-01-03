# Spec: Lorekeeper

## Status: ⏸️ DEFERRED (Post-Demo)

## Overview

Implement the Lorekeeper agent that queries the codex and returns relevant canon snippets for context enrichment.

## Estimate

4-6 hours

## Dependencies

- 2.4 content-sentinel
- Codex entries populated in database

## Outputs

- Lorekeeper agent queries codex_entries
- Returns relevant snippets based on context
- Integrates with turn pipeline

## Key Files

- `lib/agents/lorekeeper.ts`
- `app/api/turn/route.ts` (integration)

## Acceptance Criteria

- [ ] Queries return relevant codex entries
- [ ] Snippets included in narration context
- [ ] Performance acceptable (<300ms)

## Notes

This spec is deferred until after the demo is working. The single-LLM approach in 1.6 works without codex queries.
