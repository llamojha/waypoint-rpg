# Spec: Content Sentinel (Safety Filtering)

## Status: ✅ COMPLETE

## Overview

Add deterministic safety filtering for player input and LLM output. Blocks explicit sexual content and real-world hate speech only. Fantasy violence/gore is allowed.

## Estimate

2-3 hours

## Dependencies

- 2.3 chronicler-streaming (integration point)

## User Story

As a player, I expect the game to block inappropriate real-world content (sexual, hate speech) while allowing fantasy violence and combat.

## Outputs

- Input filter for player actions (pre-LLM)
- Output filter for narration (post-LLM)
- Violation logging for review
- Graceful redirect on block

## Key Files

- `lib/safety/sentinel.ts` (new - core filtering logic)
- `lib/safety/patterns.ts` (new - blocklist patterns)
- `app/api/turn/stream/route.ts` (updated - integrate filters)
- `app/api/turn/route.ts` (updated - integrate filters)

## Content Policy

### Allowed ✅
- Fantasy violence and combat (swords, magic, monsters)
- Gore and graphic injury descriptions
- Death and killing (in fantasy context)
- Dark themes (betrayal, corruption, war)
- Profanity (fantasy or mild real-world)

### Blocked ❌
- Explicit sexual content (graphic descriptions, solicitation)
- Real-world hate speech (slurs, targeted harassment)
- Real-world violence instructions (terrorism, harm to real people)

## Technical Approach

### Filter Interface

```typescript
interface FilterResult {
  status: "allow" | "block";
  output: string;        // Original or redirect message
  flags?: string[];      // What was caught (for logging)
}

function filterInput(userText: string): FilterResult;
function filterOutput(narration: string): FilterResult;
```

### Pattern Categories

| Category | Action | Examples |
|----------|--------|----------|
| Explicit sexual | Block | Graphic sexual descriptions, solicitation |
| Hate speech/slurs | Block | Racial slurs, targeted real-world harassment |
| Real-world violence | Block | Instructions for harm, terrorism references |

### Implementation Strategy

**Deterministic (no LLM):**
- Regex patterns for known bad content
- Word/phrase blocklists
- Fast execution (<10ms)

**Input Filtering:**
```typescript
const inputResult = filterInput(playerAction);
if (inputResult.status === "block") {
  return { error: "Let's keep the adventure in the fantasy realm." };
}
```

**Output Filtering:**
```typescript
const outputResult = filterOutput(fullNarration);
if (outputResult.status === "block") {
  // Use fallback narration
}
```

### Streaming Consideration

Filter complete narration before `complete` event. If LLM generates blocked content, replace with fallback narration in the complete event.

### Blocklist Patterns

```typescript
// lib/safety/patterns.ts
export const BLOCK_PATTERNS = {
  explicit_sexual: [
    // Graphic sexual terms and solicitation
  ],
  hate_speech: [
    // Slurs and targeted harassment terms
  ],
  real_world_violence: [
    // Terrorism, real-world harm instructions
  ],
};
```

### Logging

```typescript
// Log to console for MVP
function logViolation(type: "input" | "output", category: string, flags: string[]): void;
```

## Implementation Tasks

### Task 1: Pattern Definitions
Create `lib/safety/patterns.ts`:
- Explicit sexual patterns
- Hate speech patterns
- Real-world violence patterns

### Task 2: Core Filter Logic
Create `lib/safety/sentinel.ts`:
- `filterInput()` - Check player action
- `filterOutput()` - Check LLM narration
- `logViolation()` - Console logging

### Task 3: API Integration
Update turn endpoints:
- Filter input before Gemini call
- Filter output before sending to client
- Return friendly message on block

## Acceptance Criteria

- [ ] Explicit sexual input → friendly redirect
- [ ] Hate speech → blocked with redirect
- [ ] Fantasy violence/gore → allowed (no filtering)
- [ ] Combat descriptions → allowed
- [ ] Violations logged to console
- [ ] Filter execution <10ms
- [ ] No false positives on fantasy terms ("kill", "blood", "death" OK)

## Edge Cases

- **Word boundaries**: Use `\b` to avoid partial matches
- **Fantasy context**: "assassin", "slaughter", "massacre" are fine
- **Real vs fantasy**: "kill the dragon" OK, real-world targets not OK

## Non-Goals (Out of Scope)

- LLM-based content moderation
- User reporting system
- Admin review dashboard
- Configurable content preferences

## 🎮 CHECKPOINT 3

After completing this spec:
- Streaming narration ✅ (2.3)
- Content safety filtering ✅ (2.4)
- Ready for demo polish phase!
