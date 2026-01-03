# LLM Integration Guidelines

## LLM Provider

Google Gemini (`gemini-2.5-flash-lite` primary, `gemini-3-flash-preview` optional)

## Two-Pass Generation Pattern

### Pass A: Narration + Intent (LLM, temp ~0.8)

Input to LLM:

- Current world context (location, time, weather)
- Character state (HP, gold, equipped items, conditions, skill levels)
- Recent turn history (last 3-5 turns for context)
- Player's current action
- Pending skill check results (if any)

Output:

- Narrative text (streamed via SSE)
- `proposed_events[]` - suggested state changes
- `detected_intent` - skill/action interpretation

### Pass B: Hybrid Validation (Rules Engine + LLM fallback)

**Step 1: Deterministic Rules Engine**

- Validate inventory changes against current state
- Check bounds (HP ≤ maxHP, gold ≥ 0)
- Verify NPC exists in location or global registry
- Enforce relationship change caps (±2 per turn)
- Validate quest progression (no skipping steps)

**Step 2: LLM Validator (low temp ~0.2) - only if needed**

- Semantic consistency check (narration matches diffs)
- Item balance check (is "Legendary Sword" appropriate for context?)
- NPC behavior consistency (does this match their personality?)

**On Validation Failure:**

1. Log rejection reason
2. Notify user: "Refining the story..."
3. Re-run Pass A with rejection context in prompt
4. Max 2 retries, then graceful fallback narration

## Power Word & Intent Detection

Use dedicated low-temp (~0.1) LLM call for intent parsing:

```json
{
  "input": "I try to sneak past the guard quietly",
  "detected": {
    "primary_skill": "Sneaking",
    "power_words": ["sneak", "quietly"],
    "tier": 1,
    "bonus": 1,
    "confidence": 0.92
  }
}
```

- Aliases resolve to parent skill (e.g., "tiptoe" → Sneaking)
- Ambiguous words: LLM picks best fit from context
- Multi-skill actions: pick dominant intent, note secondary

## Item Generation Rules

No strict loot table, but LLM must follow:

- **Rarity tiers**: common / uncommon / rare / legendary
- **Context-appropriate**: no legendary items from random crates
- **Stat bounds**: damage/AC within tier limits
- **Naming conventions**: fantasy-appropriate, no modern items

```typescript
const ITEM_BOUNDS = {
  common: { maxDamage: "1d6", maxAC: 1, maxValue: 50 },
  uncommon: { maxDamage: "1d8", maxAC: 2, maxValue: 200 },
  rare: { maxDamage: "2d6", maxAC: 3, maxValue: 1000 },
  legendary: { maxDamage: "2d10", maxAC: 4, maxValue: 5000 },
};
```

## NPC Discovery & Persistence

### Pre-seeded NPCs

- Core story NPCs exist in database
- Tied to specific locations/quests

### LLM-Generated NPCs

1. LLM proposes NPC in narration
2. Validator extracts NPC data (name, role, location)
3. Check global registry for duplicates
4. If new: insert to `npcs` table (becomes canonical)
5. Future players can encounter same NPC

### NPC Schema for Generation

```json
{
  "name": "Mira the Fence",
  "role": "Black Market Dealer",
  "location": "Ash Coast Outpost",
  "personality": ["cunning", "greedy", "reliable"],
  "initial_relationship": 0,
  "dialogue_hints": ["speaks in riddles", "always wants a cut"]
}
```

## Conversation Compression System (Post-MVP Priority)

### Problem

LLM context windows are finite. Long play sessions accumulate turn history that:

- Exceeds token limits
- Increases API costs
- Slows response times
- Dilutes relevant context with old information

### Solution: Location-Based Compression

Inspired by NeverEndingQuest's "hub-and-spoke" architecture — compress conversation history when player changes locations.

### Compression Triggers

| Trigger                               | Action                                         |
| ------------------------------------- | ---------------------------------------------- |
| Location change (POI → POI)           | Generate summary of previous location's events |
| Turn count threshold (e.g., 15 turns) | Compress oldest turns into summary             |
| Token budget exceeded (~80% of limit) | Emergency compression of oldest content        |
| Session end                           | Generate session summary for next load         |

### Living Summary Format

When compression triggers, generate a "chronicle" summary:

```typescript
interface LocationSummary {
  location: string;
  visitNumber: number;
  turnRange: { start: number; end: number };
  summary: string; // AI-generated prose summary
  keyEvents: string[]; // Bullet points of important happenings
  npcsEncountered: string[];
  itemsGained: string[];
  itemsLost: string[];
  questProgress: string[];
  timestamp: number;
}
```

### Context Injection Strategy

When building LLM prompt:

```
1. System prompt (fixed)
2. Character state (current)
3. World context (current location)
4. Location summaries (compressed history) ← NEW
5. Recent turns (last 3-5 verbatim)
6. Current player action
```

### Token Budget Estimation

```typescript
// Rough estimates for Gemini
const TOKEN_ESTIMATES = {
  systemPrompt: 2000,
  characterState: 500,
  worldContext: 300,
  perSummary: 200, // Compressed location summary
  perVerbatimTurn: 150, // Full turn with narration
  playerAction: 50,
  buffer: 500,
};

const MAX_CONTEXT = 30000; // Gemini flash limit

const calculateBudget = (summaryCount: number, verbatimTurns: number) => {
  return (
    TOKEN_ESTIMATES.systemPrompt +
    TOKEN_ESTIMATES.characterState +
    TOKEN_ESTIMATES.worldContext +
    summaryCount * TOKEN_ESTIMATES.perSummary +
    verbatimTurns * TOKEN_ESTIMATES.perVerbatimTurn +
    TOKEN_ESTIMATES.playerAction +
    TOKEN_ESTIMATES.buffer
  );
};
```

### Compression Prompt

Low-temp (~0.2) call to generate summary:

```
Summarize the following adventure segment in 2-3 sentences.
Preserve: key decisions, NPCs met, items gained/lost, quest progress.
Omit: combat blow-by-blow, routine exploration, failed checks.

Location: {location}
Turns: {turns_json}

Output JSON: { "summary": "...", "keyEvents": [...] }
```

### Database Schema Addition

```sql
-- Location summaries (per character)
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

CREATE INDEX idx_location_summaries_character
  ON waypoint_location_summaries(character_id);
CREATE INDEX idx_location_summaries_location
  ON waypoint_location_summaries(character_id, location);
```

### Implementation Phases

**Phase 1 (MVP+1):** Turn count threshold compression

- After 15 turns, compress oldest 10 into summary
- Keep last 5 verbatim

**Phase 2:** Location-based compression

- Detect POI changes
- Generate summary on location exit
- Restore summary on location re-entry

**Phase 3:** Smart budget management

- Real-time token counting
- Dynamic verbatim turn count based on budget
- Priority-based summary inclusion

### Cost Savings Estimate

| Scenario  | Without Compression | With Compression | Savings |
| --------- | ------------------- | ---------------- | ------- |
| 20 turns  | ~3000 tokens        | ~1500 tokens     | 50%     |
| 50 turns  | ~7500 tokens        | ~2500 tokens     | 67%     |
| 100 turns | ~15000 tokens       | ~3500 tokens     | 77%     |

## Prompt Engineering Principles

### Context Window Management

- Summarize older turns, keep recent 3-5 verbatim
- Include only relevant character stats for current action
- World context: current POI + nearby POIs + present entities

### Narration Style

- PG-13 fantasy tone
- Second person ("You step forward...")
- Vivid but concise descriptions
- Must acknowledge skill check outcomes accurately

### Proposed Events Format

```json
{
  "proposed_events": [
    {
      "type": "inventory_add",
      "item": "Rusty Key",
      "rarity": "common",
      "source": "found in chest"
    },
    {
      "type": "relationship_change",
      "npc": "Glimmer",
      "delta": -1,
      "reason": "startled"
    },
    { "type": "quest_progress", "quest_id": "q1", "new_progress": 2 },
    {
      "type": "npc_discovered",
      "npc": {
        "name": "Old Fisherman",
        "role": "Hermit",
        "location": "Ash Coast"
      }
    }
  ]
}
```

## Safety Guardrails

### Input Filtering

- Reject explicit sexual content
- Reject hate speech / slurs
- Reject real-world violence instructions

### Output Filtering

- Rewrite unsafe LLM outputs
- Maintain PG-13 fantasy rating
- Refuse and redirect if content policy violated

## SSE Streaming Format

```
event: narration
data: {"chunk": "You step into the shadows...", "index": 0}

event: narration
data: {"chunk": " The air grows cold.", "index": 1}

event: complete
data: {"diffs": [...], "suggested_actions": [...]}
```
