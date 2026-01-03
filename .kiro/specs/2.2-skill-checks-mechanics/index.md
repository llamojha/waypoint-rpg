# Spec: Skill Checks & Mechanics

## Status: 📋 TODO

## Overview

Extract mechanics detection into a dedicated low-temperature LLM call. Implements power word detection, skill check determination, and roll resolution.

## Estimate

4-6 hours

## Dependencies

- 2.1 gemini-client
- 1.2 authentication

## Outputs

- Power word detection against SKILL_TREE
- Skill check determination (when to roll)
- DC calculation based on context
- Modifier calculation (stat + skill level + power word bonus)
- Roll button resolves checks server-side

## Key Files

- `lib/mechanics/detect.ts`
- `lib/mechanics/checks.ts`
- `lib/mechanics/modifiers.ts`
- `app/api/turn/route.ts` (updated)
- `components/CenterColumn.tsx` (roll integration)

## Acceptance Criteria

- [ ] "I sneak past the guard" triggers Sneaking check
- [ ] Power words detected and bonus applied
- [ ] Roll button appears for checks
- [ ] Server-side roll determines outcome
- [ ] Outcome affects narration

## 🎮 CHECKPOINT 2

After completing this spec:

- Skill checks with roll button
- Power word detection (+1/+2/+3 bonuses)
- DC and modifiers displayed
