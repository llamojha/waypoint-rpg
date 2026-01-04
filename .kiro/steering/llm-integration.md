# LLM Integration Guidelines

## LLM Provider

Google Gemini (`gemini-2.5-flash-lite` primary, `gemini-3-flash-preview` optional)

**SDK**: `@google/genai`

## Tool Calling Architecture

Waypoint uses Gemini's tool calling (function calling) for structured outputs instead of JSON mode. This provides schema-enforced responses and eliminates JSON parsing failures.

### When to Use Tool Calling vs JSON Mode

| Use Case             | Approach      | Reason                              |
| -------------------- | ------------- | ----------------------------------- |
| Intent detection     | Tool calling  | Typed schema, enum constraints      |
| Event proposals      | Tool calling  | Multiple typed tools per event type |
| Validation decisions | Tool calling  | Boolean approve/reject with reason  |
| Narration generation | JSON mode     | Free-form prose, not structured     |
| Safety filtering     | Deterministic | No LLM needed                       |

### Tool Declaration Pattern

```typescript
import { FunctionDeclaration, Type } from "@google/genai";

export const exampleTool: FunctionDeclaration = {
  name: "tool_name",
  description: "What this tool does",
  parameters: {
    type: Type.OBJECT,
    properties: {
      field: { type: Type.STRING, enum: ["option1", "option2"] },
      value: { type: Type.NUMBER },
    },
    required: ["field"],
  },
};
```

### Handling Tool Call Responses

```typescript
import { GoogleGenAI, FunctionCallingConfigMode } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: prompt,
  config: {
    tools: [{ functionDeclarations: [detectIntentTool] }],
    toolConfig: {
      functionCallingConfig: { mode: FunctionCallingConfigMode.ANY },
    },
  },
});

if (response.functionCalls) {
  for (const call of response.functionCalls) {
    // call.name = "detect_intent"
    // call.args = { primary_skill: "Sneaking", ... }
  }
}
```

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

Use Gemini tool calling with dedicated low-temp (~0.1) call for intent parsing:

```typescript
import { FunctionDeclaration, Type } from "@google/genai";

export const detectIntentTool: FunctionDeclaration = {
  name: "detect_intent",
  description: "Analyze player action to determine skill check requirements",
  parameters: {
    type: Type.OBJECT,
    properties: {
      primary_skill: { type: Type.STRING, enum: SKILL_NAMES },
      power_words: { type: Type.ARRAY, items: { type: Type.STRING } },
      tier: { type: Type.NUMBER, enum: [1, 2, 3] },
      bonus: { type: Type.NUMBER },
      requires_roll: { type: Type.BOOLEAN },
      dc: { type: Type.NUMBER },
    },
    required: ["primary_skill", "requires_roll"],
  },
};
```

Example tool call response:

```json
{
  "name": "detect_intent",
  "args": {
    "primary_skill": "Sneaking",
    "power_words": ["sneak", "quietly"],
    "tier": 1,
    "bonus": 1,
    "requires_roll": true,
    "dc": 12
  }
}
```

- Aliases resolve to parent skill (e.g., "tiptoe" → Sneaking)
- Ambiguous words: LLM picks best fit from context
- Multi-skill actions: pick dominant intent, note secondary
- Schema-enforced: no JSON parsing failures

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
| Turn count threshold (e.g., 100 turns) | Compress oldest turns into summary             |
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

- After 100 turns, compress oldest 95 into summary
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

Events are proposed via tool calls, not JSON in narration. Each event type has its own tool:

**Tool: `propose_stat_change`**

```json
{ "stat": "gold", "delta": -5, "reason": "Bought a drink" }
```

**Tool: `propose_inventory_add`**

```json
{
  "item_name": "Rusty Key",
  "item_type": "quest",
  "rarity": "common",
  "reason": "found in chest"
}
```

**Tool: `propose_relationship_change`**

```json
{ "npc": "Glimmer", "delta": -1, "reason": "startled" }
```

**Tool: `propose_quest_progress`**

```json
{ "quest_id": "q1", "new_progress": 2, "reason": "Found the hidden entrance" }
```

**Tool: `propose_npc_discovered`**

```json
{ "name": "Old Fisherman", "role": "Hermit", "location": "Ash Coast" }
```

Benefits over JSON-in-prompt:

- Schema-enforced (no malformed events)
- Enum-constrained values (rarity, item types)
- Each event is a separate tool call (easier to validate individually)

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
