# Spec: Chronicler Streaming

## Status: 📋 TODO

## Overview

Add SSE streaming for narration so text appears progressively as it generates, improving perceived responsiveness.

## Estimate

4-6 hours

## Dependencies

- 2.2 skill-checks-mechanics

## Outputs

- SSE streaming from /api/turn
- Progressive text display in CenterColumn
- Final diffs sent after narration complete

## Key Files

- `app/api/turn/route.ts` (streaming)
- `components/CenterColumn.tsx` (streaming display)
- `lib/gemini/stream.ts` (new)

## Acceptance Criteria

- [ ] Narration text appears word-by-word or chunk-by-chunk
- [ ] User sees response within 500ms of submission
- [ ] Diffs appear after narration completes
- [ ] Cancel button stops stream
