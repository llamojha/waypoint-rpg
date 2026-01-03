# Spec: Content Sentinel

## Status: 📋 TODO

## Overview

Add safety filtering for both input and output to maintain PG-13 content rating.

## Estimate

2-3 hours

## Dependencies

- 2.3 chronicler-streaming

## Outputs

- Input filtering (block explicit content before LLM)
- Output filtering (rewrite unsafe LLM responses)
- Logging for review

## Key Files

- `lib/safety/filter.ts`
- `lib/safety/patterns.ts`
- `app/api/turn/route.ts` (integration)

## Acceptance Criteria

- [ ] Explicit input rejected with safe message
- [ ] Unsafe LLM output rewritten
- [ ] Violations logged for review
- [ ] PG-13 rating maintained

## 🎮 CHECKPOINT 3

After completing this spec:

- Streaming narration
- Content safety filtering
- Polished UX ready for demo
