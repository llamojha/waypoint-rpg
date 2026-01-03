# Spec: Single LLM Turn

## Status: 📋 TODO

## Overview

Implement turn processing with a single Gemini API call. Simplest possible implementation that produces real AI-generated narration and state changes.

## Estimate

4-6 hours

## Dependencies

- 1.5 wire-character-crud

## Outputs

- Working /api/turn endpoint with Gemini integration
- Real AI-generated narration
- Basic state validation and persistence
- Frontend wired to real API

## Key Files

- `app/api/turn/route.ts`
- `lib/gemini/client.ts`
- `lib/gemini/prompts.ts`
- `lib/turn/validate.ts`
- `lib/turn/apply.ts`
- `App.tsx`

## Acceptance Criteria

- [ ] Play 5 turns with unique AI narration
- [ ] State changes persist to database
- [ ] Refresh page → turns load correctly
- [ ] Error handling works (retry on failure)

## 🎮 CHECKPOINT 1

After completing this spec, you have a playable game:

- Create character → saved to Supabase
- Play turns → Gemini generates narration
- State persists between sessions
