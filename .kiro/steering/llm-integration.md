# LLM Integration Guidelines

## LLM Provider

Google Gemini (`gemini-2.5-flash-lite` primary, `gemini-3-flash-preview` optional)

**SDK**: `@google/genai`

## Core Principle: Never Lose Context

**Waypoint maintains complete conversation history. We NEVER trim, summarize, or forget.**

Unlike competitors who limit context to 5-8 messages for cost savings, we leverage Gemini's 1M token context window to maintain full narrative history. This is our competitive advantage - narrative quality that others cannot match.

| Competitor Practice | Waypoint Approach |
|--------------------|-------------------|
| 5-8 recent messages | Full turn history |
| Memory compression | No compression |
| Atomic fact extraction | Complete narration |
| Context budgets | Use full 1M tokens |

## Prompt Engineering Requirements

### Success Examples (REQUIRED)

**Every agent prompt MUST include a "Success Examples" section** showing what good output looks like. This is non-negotiable for all new prompts.

Prompts that only list restrictions ("don't do X", "never do Y") without positive examples lead to inconsistent LLM behavior. Success examples provide:
- Clear model of expected output format
- Concrete guidance on decision-making
- Reduced ambiguity in edge cases

**Required format:**

```
## Success Examples

### Example 1: [Scenario name]
Player: "[example input]"
Good output:
- [expected tool call or output]
- [reasoning if helpful]

### Example 2: [Scenario name]
...
```

**Minimum requirements:**
- At least 3-4 examples per prompt
- Cover common cases AND edge cases
- Show both "do something" and "do nothing" scenarios where applicable
- Include expected tool calls with realistic parameters

See existing prompts for reference:
- `lib/agents/orchestrator.ts` - 6 examples
- `lib/agents/rune-marshal.ts` - 6 examples
- `lib/prompts/turn.ts` (Chronicler) - 4 examples
- `lib/agents/lorekeeper/index.ts` - 4 examples

## Hybrid Architecture: LLM + Code

Waypoint uses a hybrid approach where LLMs handle judgment/creativity and code handles deterministic operations:

| Layer | Responsibility | Examples |
|-------|----------------|----------|
| LLM (judgment) | Decide what to do | Intent detection, context relevance, narrative |
| LLM Read Tools | Fetch data for decisions | `query_codex()`, `get_npcs_at_location()` |
| LLM Proposal Tools | Structured output for changes | `propose_stat_change()`, `propose_relationship_change()` |
| Code Layer | Execute deterministic logic | Dice rolls, modifier calculation, validation rules |
| Code Layer | Apply state changes | DB updates after Arbiter approval |

**Key principle**: LLM proposes, code disposes. All state mutations happen in code after validation.

## Tool Calling Architecture

Waypoint uses Gemini's tool calling (function calling) for structured outputs. This provides schema-enforced responses and eliminates JSON parsing failures.

### Tool Categories

| Category | Purpose | Who Executes |
|----------|---------|--------------|
| Read Tools | Fetch data for LLM decisions | Code executes query, returns to LLM |
| Proposal Tools | Structured output from LLM | LLM outputs, code processes |
| Code Layer | Deterministic game logic | Code only, no LLM |

### When to Use Each Approach

| Use Case | Approach | Reason |
|----------|----------|--------|
| Power word lookup | Read tool | LLM decides what to look up |
| NPC/location queries | Read tool | LLM decides what's relevant |
| Intent detection | Proposal tool | Structured output from LLM |
| Event proposals | Proposal tool | Schema-enforced changes |
| Dice rolls | Code layer | Must be deterministic |
| Modifier calculation | Code layer | Pure math |
| Validation rules | Code layer | Enforced consistently |
| Narration | JSON mode | Free-form prose |
| Safety filtering | Code layer | Pattern matching |

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
    tools: [{ functionDeclarations: [detectIntentTool, getPowerWordTierTool] }],
    toolConfig: {
      functionCallingConfig: { mode: FunctionCallingConfigMode.ANY },
    },
  },
});

// Handle read tool calls - execute and return results
if (response.functionCalls) {
  for (const call of response.functionCalls) {
    if (call.name === "get_power_word_tier") {
      // Execute code, return result to LLM
      const result = lookupPowerWordTier(call.args.word, call.args.skill);
      // Continue conversation with result...
    }
    if (call.name === "detect_intent") {
      // This is a proposal - process the structured output
      const intent = call.args;
      // Pass to code layer for mechanics resolution...
    }
  }
}
```

## Context Injection

Agents receive static context via prompt injection (not tool calls):

| Agent | Injected Context |
|-------|------------------|
| Orchestrator | SKILL_TREE (full), character state, current location, recent turns |
| Lorekeeper | Current location, entity refs from Orchestrator |
| Arbiter | Game rules (ITEM_BOUNDS, relationship caps) |
| Chronicler | Validated events, roll outcomes, scene direction |

```typescript
// Example: Orchestrator system prompt includes SKILL_TREE
const orchestratorPrompt = `
You are the Orchestrator for Waypoint RPG.

## SKILL_TREE (use for power word detection)
${JSON.stringify(SKILL_TREE, null, 2)}

## Current Character
${JSON.stringify(character, null, 2)}

## Current Location
${JSON.stringify(worldContext, null, 2)}

## Recent Events
${JSON.stringify(recentTurns, null, 2)}

## Available Tools
- get_power_word_tier(word, skill): Look up tier/bonus for a power word
- get_skill_level(character_id, skill): Get current skill progression
- detect_intent(...): Output skill check requirements
- propose_stat_change(...): Propose HP/gold changes
- propose_relationship_change(...): Propose NPC relationship delta
`;
```

## Temperature Guidelines

Temperature controls LLM output randomness. Use the right temperature for each task:

| Agent/Task           | Temperature | Reason                                      |
| -------------------- | ----------- | ------------------------------------------- |
| Orchestrator         | 0.1         | Deterministic intent detection & proposals  |
| Lorekeeper           | 0.1         | Factual canon retrieval                     |
| World Arbiter        | 0.1         | Strict rule validation                      |
| Chronicler           | 0.8         | Creative prose narration                    |
| Content Sentinel     | N/A         | Pure code (no LLM)                          |
| Compression summaries| 0.2         | Factual but readable summaries              |

**Key principle**: Mechanical decisions (intent, DC, event proposals, validation) should be deterministic (0.1). Creativity belongs only in the Chronicler (0.8).

## Agent Pipeline with Code Layers

```
User Input
    │
    ▼
┌─────────────────┐
│  Orchestrator   │ ◄── Read tools + proposal tools (temp 0.1)
│                 │     get_power_word_tier(), detect_intent, propose_*
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Code: Mechanics│ ◄── Roll dice, calculate modifiers, resolve checks
│     Layer       │     Pure code, no LLM
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
Lorekeeper  Arbiter    ◄── PARALLEL (read tools + validation)
    │         │
    └────┬────┘
         ▼
┌─────────────────┐
│  Code: Apply    │ ◄── Apply approved changes to DB
│  State Changes  │     Pure code, no LLM
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Chronicler    │ ◄── Read tools + narration (temp 0.8)
│                 │     get_npc_voice(), get_atmosphere()
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│Content Sentinel │ ◄── Safety filter (pure code)
└────────┬────────┘
         │
    UI / Client
```

## Code Layer: Mechanics Resolution

The code layer runs between Orchestrator and the parallel spokes:

```typescript
// After Orchestrator outputs intent
const intent = orchestratorResult.detect_intent;

if (intent.requires_roll) {
  // Code layer handles the roll - NOT the LLM
  const roll = rollD20();
  const skillLevel = character.skills[intent.primary_skill]?.level || 0;
  const modifier = Math.floor(skillLevel / 10);
  const bonus = intent.bonus || 0;
  
  const total = roll + modifier + bonus;
  const success = total >= intent.dc;
  
  // Result passed to Chronicler for narration
  rollOutcome = {
    skill: intent.primary_skill,
    rolled: roll,
    modifier,
    bonus,
    dc: intent.dc,
    total,
    success,
  };
}
```

## Orchestrator: Read Tools + Proposals

The Orchestrator can call read tools to gather data, then output proposals:

```typescript
// Read tools (LLM calls these to get data)
export const getPowerWordTierTool: FunctionDeclaration = {
  name: "get_power_word_tier",
  description: "Look up the tier and bonus for a power word in a skill",
  parameters: {
    type: Type.OBJECT,
    properties: {
      word: { type: Type.STRING },
      skill: { type: Type.STRING, enum: SKILL_NAMES },
    },
    required: ["word", "skill"],
  },
};

// Proposal tools (LLM outputs these as structured data)
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

export const proposeStatChangeTool: FunctionDeclaration = { ... };
export const proposeInventoryAddTool: FunctionDeclaration = { ... };
export const proposeRelationshipChangeTool: FunctionDeclaration = { ... };
```

Example flow:
1. LLM calls `get_power_word_tier({ word: "strike", skill: "Melee" })`
2. Code returns `{ tier: 1, bonus: 1 }`
3. LLM uses this to output `detect_intent({ primary_skill: "Melee", bonus: 1, dc: 12, ... })`
4. Code layer rolls dice, resolves check

## Validation Flow

### Hybrid Validation (Code First + LLM Fallback)

**Step 1: Code Validation (deterministic)**

```typescript
const codeValidations = {
  validateRelationshipCap: (current, delta) => {
    if (Math.abs(delta) > 2) return { valid: false, capped: Math.sign(delta) * 2 };
    return { valid: true };
  },
  
  validateItemBounds: (rarity, stats) => {
    const bounds = ITEM_BOUNDS[rarity];
    // Check damage, AC, value against bounds
    return { valid: true } | { valid: false, reason: '...' };
  },
  
  validateQuestProgression: (current, proposed) => {
    if (proposed > current + 1) return { valid: false, reason: 'Cannot skip steps' };
    return { valid: true };
  },
};
```

**Step 2: LLM Validation (contextual) - only if code passes**

- Is this item contextually appropriate?
- Does this NPC behavior match their personality?
- Is this action consistent with the scene?

**On Validation Failure:**

1. Log rejection reason
2. Notify user: "Refining the story..."
3. Re-run Orchestrator with rejection context in prompt
4. Max 2 retries, then graceful fallback narration

## Item Generation Rules

No strict loot table, but Orchestrator must follow:

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

Item details should come from:
1. Pre-seeded loot tables
2. Context from Lorekeeper
3. Minimal LLM generation (validated by Arbiter)

## NPC Discovery & Persistence

### Pre-seeded NPCs

- Core story NPCs exist in database
- Tied to specific locations/quests

### LLM-Generated NPCs

1. Orchestrator proposes NPC via `propose_npc_discovered` tool
2. Arbiter validates NPC data (name, role, location)
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

Compress conversation history when player changes locations.

### Compression Triggers

| Trigger                               | Action                                         |
| ------------------------------------- | ---------------------------------------------- |
| Location change (POI → POI)           | Generate summary of previous location's events |
| Turn count threshold (e.g., 100 turns) | Compress oldest turns into summary             |
| Token budget exceeded (~80% of limit) | Emergency compression of oldest content        |
| Session end                           | Generate session summary for next load         |

### Living Summary Format

```typescript
interface LocationSummary {
  location: string;
  visitNumber: number;
  turnRange: { start: number; end: number };
  summary: string;
  keyEvents: string[];
  npcsEncountered: string[];
  itemsGained: string[];
  itemsLost: string[];
  questProgress: string[];
  timestamp: number;
}
```

### Token Budget Estimation

```typescript
const TOKEN_ESTIMATES = {
  systemPrompt: 2000,
  skillTree: 1500,        // Injected context
  characterState: 500,
  worldContext: 300,
  perSummary: 200,
  perVerbatimTurn: 150,
  playerAction: 50,
  buffer: 500,
};

const MAX_CONTEXT = 30000; // Gemini flash limit
```

### Compression Prompt

Low-temp (0.2) call to generate summary:

```
Summarize the following adventure segment in 2-3 sentences.
Preserve: key decisions, NPCs met, items gained/lost, quest progress.
Omit: combat blow-by-blow, routine exploration, failed checks.

Location: {location}
Turns: {turns_json}

Output JSON: { "summary": "...", "keyEvents": [...] }
```

## Prompt Engineering Principles

### Context Window Management

- Inject SKILL_TREE for power word detection
- Summarize older turns, keep recent 3-5 verbatim
- Include only relevant character stats for current action
- World context: current POI + nearby POIs + present entities

### Narration Style

- PG-13 fantasy tone
- Second person ("You step forward...")
- Vivid but concise descriptions
- Must acknowledge skill check outcomes accurately

### Proposed Events Format

Events are proposed via tool calls, not JSON in narration:

**Tool: `propose_stat_change`**
```json
{ "stat": "gold", "delta": -5, "reason": "Bought a drink" }
```

**Tool: `propose_inventory_add`**
```json
{ "item_name": "Rusty Key", "item_type": "quest", "rarity": "common", "reason": "found in chest" }
```

**Tool: `propose_relationship_change`**
```json
{ "npc": "Glimmer", "delta": -1, "reason": "startled" }
```

Benefits:
- Schema-enforced (no malformed events)
- Enum-constrained values
- Each event is a separate tool call (easier to validate)

## Safety Guardrails

### Input Filtering (Code Layer)

- Reject explicit sexual content
- Reject hate speech / slurs
- Reject real-world violence instructions

### Output Filtering (Code Layer)

- Pattern matching for unsafe content
- Rewrite/block unsafe LLM outputs
- Maintain PG-13 fantasy rating

## SSE Streaming Format

```
event: narration
data: {"chunk": "You step into the shadows...", "index": 0}

event: narration
data: {"chunk": " The air grows cold.", "index": 1}

event: complete
data: {"diffs": [...], "suggested_actions": [...]}
```
