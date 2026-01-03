# Spec: Orchestrator & Arbiter

## Status: ⏸️ DEFERRED (Post-Demo)

## Overview

Split state change proposal (Orchestrator) from validation (World Arbiter) for better separation of concerns and more robust validation.

## Estimate

6-8 hours

## Dependencies

- 2.5 lorekeeper

## Outputs

- Orchestrator agent proposes state changes
- World Arbiter validates against rules and canon
- Rejection handling with retry
- Event format standardization

## Key Files

- `lib/agents/orchestrator.ts`
- `lib/agents/arbiter.ts`
- `lib/validation/rules.ts`

## Acceptance Criteria

- [ ] Orchestrator proposes reasonable changes
- [ ] Arbiter catches invalid proposals
- [ ] Rejection triggers re-generation
- [ ] Max 2 retries before fallback

## Notes

This spec is deferred until after the demo. The basic validation in 1.6 is sufficient for MVP.
