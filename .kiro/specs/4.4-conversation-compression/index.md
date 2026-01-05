# 2.8 Conversation Compression

## Overview

Implement location-based conversation compression to maintain context across long play sessions while managing token usage. When players change locations, compress the conversation history into summaries.

## Status: 📋 TODO

## Estimate: 6-8 hours

## Dependencies

- 1.6 single-llm-turn (complete)
- 2.3 chronicler-streaming (complete)

## Scope Summary

Compress turn history when player changes locations. Store summaries in database. Load relevant summaries when building prompts. Reduces token usage by 50-77% for long sessions.

## Requirements

### Compression Triggers
1. Location change (POI → POI) - generate summary of previous location's events
2. Turn count threshold (100 turns) - compress oldest turns into summary
3. Token budget exceeded (~80% of limit) - emergency compression

### Summary Schema
```typescript
interface LocationSummary {
  location: string;
  visitNumber: number;
  turnRange: { start: number; end: number };
  summary: string;           // AI-generated prose summary
  keyEvents: string[];       // Bullet points of important happenings
  npcsEncountered: string[];
  itemsGained: string[];
  itemsLost: string[];
  questProgress: string[];
  timestamp: number;
}
```

### Database Table
```sql
CREATE TABLE waypoint_location_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES waypoint_characters(id) NOT NULL,
  location VARCHAR(100) NOT NULL,
  visit_number INT DEFAULT 1,
  turn_range_start INT NOT NULL,
  turn_range_end INT NOT NULL,
  summary TEXT NOT NULL,
  key_events JSONB DEFAULT '[]',
  npcs_encountered JSONB DEFAULT '[]',
  items_gained JSONB DEFAULT '[]',
  items_lost JSONB DEFAULT '[]',
  quest_progress JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Prompt Context Injection
When building LLM prompt:
1. System prompt (fixed)
2. Character state (current)
3. World context (current location)
4. Location summaries (compressed history) ← NEW
5. Recent turns (last 5-10 verbatim)
6. Current player action

### Compression Prompt
Low-temp (~0.2) call to generate summary:
```
Summarize the following adventure segment in 2-3 sentences.
Preserve: key decisions, NPCs met, items gained/lost, quest progress.
Omit: combat blow-by-blow, routine exploration, failed checks.
```

## Acceptance Criteria

- [ ] Detect location changes from world_update events
- [ ] Generate summary when leaving a location
- [ ] Store summaries in waypoint_location_summaries table
- [ ] Load summaries when building turn prompts
- [ ] Include summaries in context (most recent 3-5 locations)
- [ ] Fallback to turn-count compression if no location change after 100 turns
- [ ] Token usage reduced by at least 50% for 20+ turn sessions

## References

- See `llm-integration.md` → "Conversation Compression System" for full design
- See `backend-infrastructure.md` for database schema patterns
