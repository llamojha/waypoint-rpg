# Agent System (Hub-and-Spoke Architecture with Tool Calling)

## Overview

Waypoint uses a hub-and-spoke agent architecture where the **Orchestrator** acts as the central coordinator. Agents communicate via Gemini tool calling (function calling) for typed, schema-enforced I/O — no agent can directly mutate game state.

## Hybrid Architecture: LLM + Code

The system uses a hybrid approach where LLMs handle judgment/creativity and code handles deterministic operations:

| Layer | Responsibility | Examples |
|-------|----------------|----------|
| LLM (judgment) | Decide what to do | Intent detection, context relevance, narrative |
| LLM Read Tools | Fetch data for decisions | `query_codex()`, `get_npcs_at_location()` |
| LLM Proposal Tools | Structured output for changes | `propose_stat_change()`, `propose_relationship_change()` |
| Code Layer | Execute deterministic logic | Dice rolls, modifier calculation, validation rules |
| Code Layer | Apply state changes | DB updates after Arbiter approval |

**Key principle**: LLM proposes, code disposes. All state mutations happen in code after validation.

## Tool Categories

### 1. Read Tools (LLM-initiated data retrieval)

LLM decides WHAT to query, code executes the query and returns data.

| Agent | Tool | Purpose |
|-------|------|---------|
| Orchestrator | `get_power_word_tier(word, skill)` | Lookup tier/bonus from SKILL_TREE |
| Orchestrator | `get_skill_level(character_id, skill)` | Fetch current skill progression |
| Lorekeeper | `query_codex(type, refs)` | Fetch canon entries from DB |
| Lorekeeper | `get_npcs_at_location(location)` | Who's present at this POI |
| Lorekeeper | `get_location_details(location)` | POI data, connections, atmosphere |
| Lorekeeper | `search_canon(keywords)` | Semantic search in codex |
| Arbiter | `check_npc_exists(name, location)` | Registry lookup |
| Arbiter | `get_item_bounds(rarity)` | Stat limits for rarity tier |
| Arbiter | `get_quest_state(quest_id)` | Current progress, valid transitions |
| Chronicler | `get_npc_voice(npc_name)` | Dialogue hints, personality traits |
| Chronicler | `get_atmosphere(location, time, weather)` | Scene descriptors for narration |

### 2. Proposal Tools (LLM structured output)

LLM outputs structured proposals, code validates and applies them.

| Tool | Purpose | Applied By |
|------|---------|------------|
| `detect_intent` | Skill check requirements | Code layer (mechanics) |
| `propose_stat_change` | HP/gold changes | Code after Arbiter |
| `propose_inventory_add` | New items | Code after Arbiter |
| `propose_inventory_remove` | Remove items | Code after Arbiter |
| `propose_relationship_change` | NPC relationship delta | Code after Arbiter |
| `propose_quest_progress` | Quest state update | Code after Arbiter |
| `propose_npc_discovered` | Register new NPC | Code after Arbiter |
| `propose_world_update` | Location/time changes | Code after Arbiter |
| `validate_event` | Arbiter approval/rejection | Code applies approved |

### 3. Code Layer (no LLM involvement)

Deterministic operations that run between agents:

| Operation | When | Logic |
|-----------|------|-------|
| Dice rolls | After Orchestrator outputs DC | `d20 + modifier` vs DC |
| Modifier calculation | Before roll resolution | `floor(skill_level / 10) + power_word_bonus` |
| Relationship cap | After Arbiter approval | Enforce ±2 per turn max |
| HP/Gold bounds | After Arbiter approval | `hp <= maxHp`, `gold >= 0` |
| Item stat validation | During Arbiter phase | Check against `ITEM_BOUNDS[rarity]` |
| Quest step validation | During Arbiter phase | No skipping steps |
| Content filtering | After Chronicler | Pattern matching, sanitization |
| State persistence | After all validation | DB writes |

## Context Injection

Agents receive context via prompt injection (not tool calls):

| Agent | Injected Context |
|-------|------------------|
| Orchestrator | SKILL_TREE (full), character state, current location, recent turns |
| Lorekeeper | Current location, entity refs from Orchestrator |
| Arbiter | Game rules, item bounds, relationship caps |
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
`;
```

## Tool Calling Strategy

| Agent            | Read Tools | Proposal Tools | Code Layer |
| ---------------- | ---------- | -------------- | ---------- |
| Orchestrator     | ✅ Yes     | ✅ Yes         | Receives results |
| Lorekeeper       | ✅ Yes     | ❌ No          | Executes queries |
| World Arbiter    | ❌ No      | ❌ No          | Pure code validation |
| Chronicler       | ✅ Yes     | ❌ No (JSON mode) | Receives context |
| Content Sentinel | ❌ No      | ❌ No          | Pure code |
| Rune Marshal     | ❌ No      | ❌ No          | LLM intent detection |

## Agent Pipeline Flow

```
User Input
    │
    ▼
┌─────────────────┐
│Content Sentinel │  ◄── Pure code: filters unsafe user input
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Rune Marshal   │  ◄── LLM: Intent detection (skill, DC, power words)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Quest Context  │  ◄── Code: DB query for active quests (pre-fetch)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Orchestrator   │  ◄── LLM: Proposals (read tools + proposal tools)
│                 │      Context: quest state, character, world
│                 │      Tools: get_power_word_tier(), get_skill_level()
│                 │      Output: propose_* tool calls
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌──────────┐
│Arbiter │ │Lorekeeper│  ◄── PARALLEL (validation + lore fetch)
│ (code) │ │  (LLM)   │
└────┬───┘ └────┬─────┘
     │          │
     └────┬─────┘
          ▼
   ┌─────────────┐
   │  Collector  │  ◄── Code: Gathers approved events + lore context
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │ Apply State │  ◄── Code: DB writes, returns consequences
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │  Collector  │  ◄── Code: Merges lore + events + consequences
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │ Chronicler  │  ◄── LLM: Narration with full context
   └──────┬──────┘
          │
     UI / Client
```

### Quest Context (Pre-fetch)

Quest context is fetched before the Orchestrator runs so it can:
- Know if player action matches a quest goal → propose `quest_progress`
- Know available NPC quests → propose `quest_start` when talking to quest-giver
- Avoid proposing duplicate quests

```typescript
// Fetch quest context before Orchestrator
const questContext = await runQuestAgent(characterId);

// Inject into Orchestrator prompt
const orchestratorResult = await runOrchestrator(
  playerAction, character, world, recentTurns,
  rollOutcome, detectedIntent, questContext  // ◄── quest context injected
);
```

### Collector (Code Layer)

The Collector is a code function (not an LLM agent) that coordinates the pipeline:

1. **First pass**: Gathers outputs from parallel agents (Arbiter + Lorekeeper)
2. **Second pass**: After Apply State, merges in consequences for Chronicler

```typescript
// Collector merges parallel results
const [arbiterResult, lorekeeperResult] = await Promise.all([
  runArbiter(proposals, ctx),
  runLorekeeper(playerAction, world, characterId),
]);

const collectedContext = {
  approvedEvents: arbiterResult.approved,
  lore: lorekeeperResult,
};

// Apply state returns consequences
const applyResult = applyEvents(character, world, collectedContext.approvedEvents);

// Collector adds apply results for Chronicler
const chroniclerContext = {
  ...collectedContext,
  consequences: applyResult.consequences, // "npc_died", "quest_completed", etc.
  finalState: applyResult.updatedState,
};
```

This ensures Chronicler knows the full picture including side effects (e.g., "NPC HP reached 0" → can narrate death).

## Agent Specifications

### 1. Orchestrator (Central Coordinator) — Tool Calling

**Purpose**: Parse player intent, detect power words, dispatch queries to spokes, and propose state changes

**Position**: FIRST — the single entry point for all player actions

**Read Tools Available**:

```typescript
// Lookup power word tier from SKILL_TREE
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

// Get character's current skill level
export const getSkillLevelTool: FunctionDeclaration = {
  name: "get_skill_level",
  description: "Get character's current level and XP in a skill",
  parameters: {
    type: Type.OBJECT,
    properties: {
      character_id: { type: Type.STRING },
      skill: { type: Type.STRING, enum: SKILL_NAMES },
    },
    required: ["character_id", "skill"],
  },
};
```

**Proposal Tools**:

```typescript
// Intent detection output
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

// State change proposals
export const proposeStatChangeTool: FunctionDeclaration = {
  name: "propose_stat_change",
  parameters: {
    type: Type.OBJECT,
    properties: {
      stat: { type: Type.STRING, enum: ["hp", "gold"] },
      delta: { type: Type.NUMBER },
      reason: { type: Type.STRING },
    },
    required: ["stat", "delta", "reason"],
  },
};

export const proposeInventoryAddTool: FunctionDeclaration = {
  name: "propose_inventory_add",
  parameters: {
    type: Type.OBJECT,
    properties: {
      item_name: { type: Type.STRING },
      item_type: { type: Type.STRING, enum: ["weapon", "armor", "consumable", "quest", "trinket", "misc"] },
      rarity: { type: Type.STRING, enum: ["common", "uncommon", "rare", "legendary"] },
      description: { type: Type.STRING },
      reason: { type: Type.STRING },
    },
    required: ["item_name", "item_type", "reason"],
  },
};

export const proposeRelationshipChangeTool: FunctionDeclaration = {
  name: "propose_relationship_change",
  parameters: {
    type: Type.OBJECT,
    properties: {
      npc: { type: Type.STRING },
      delta: { type: Type.NUMBER },
      reason: { type: Type.STRING },
    },
    required: ["npc", "delta", "reason"],
  },
};

export const proposeQuestProgressTool: FunctionDeclaration = {
  name: "propose_quest_progress",
  parameters: {
    type: Type.OBJECT,
    properties: {
      quest_id: { type: Type.STRING },
      new_progress: { type: Type.NUMBER },
      reason: { type: Type.STRING },
    },
    required: ["quest_id", "new_progress", "reason"],
  },
};

export const proposeNpcDiscoveredTool: FunctionDeclaration = {
  name: "propose_npc_discovered",
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      role: { type: Type.STRING },
      location: { type: Type.STRING },
      personality: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ["name", "role", "location"],
  },
};
```

**Input** (via context injection):

```typescript
{
  user_action: string,
  character: Character,           // Full character state
  current_state: GameState,
  recent_events: TurnDiff[],
  skill_tree: SkillTree,          // Injected for power word lookup
  context: string                 // Brief scene context
}
```

**Output** (via tool calls):

```typescript
// Read tools called as needed:
// - get_power_word_tier({ word: 'strike', skill: 'Melee' }) → { tier: 1, bonus: 1 }
// - get_skill_level({ character_id, skill: 'Melee' }) → { level: 5, xp: 450 }

// Proposal tools output:
// - detect_intent({ primary_skill: 'Sneaking', requires_roll: true, dc: 12, ... })
// - propose_stat_change({ stat: 'hp', delta: -5, reason: '...' })
// - propose_relationship_change({ npc: 'Glimmer', delta: 1, reason: '...' })

// Plus scene direction in final response
scene_direction: string;
```

**Rules**:

- Calls read tools to gather data for decisions
- Outputs proposals via proposal tools
- No prose generation
- No direct state mutation
- Each proposal includes reason
- Multiple tools can be called per turn

**Temperature**: 0.1 (deterministic mechanics and proposals)

---

### 2. Lorekeeper (Canon Specialist) — Tool Calling

**Purpose**: Fetch relevant canon facts based on Orchestrator's targeted queries

**Read Tools Available**:

```typescript
export const queryCodexTool: FunctionDeclaration = {
  name: "query_codex",
  description: "Retrieve canon information from the codex",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query_type: { type: Type.STRING, enum: ["location", "npc", "item", "lore", "quest"] },
      entity_refs: { type: Type.ARRAY, items: { type: Type.STRING } },
      context: { type: Type.STRING },
    },
    required: ["query_type"],
  },
};

export const getNpcsAtLocationTool: FunctionDeclaration = {
  name: "get_npcs_at_location",
  description: "Get all NPCs present at a location",
  parameters: {
    type: Type.OBJECT,
    properties: {
      location: { type: Type.STRING },
    },
    required: ["location"],
  },
};

export const getLocationDetailsTool: FunctionDeclaration = {
  name: "get_location_details",
  description: "Get details about a location including connections and atmosphere",
  parameters: {
    type: Type.OBJECT,
    properties: {
      location: { type: Type.STRING },
    },
    required: ["location"],
  },
};

export const searchCanonTool: FunctionDeclaration = {
  name: "search_canon",
  description: "Semantic search across codex entries",
  parameters: {
    type: Type.OBJECT,
    properties: {
      keywords: { type: Type.STRING },
      limit: { type: Type.NUMBER },
    },
    required: ["keywords"],
  },
};
```

**Output**:

```typescript
{
  canon_snippets: CanonSnippet[],
  known_facts: string[],
  npcs_present: NPC[]
}
```

**Rules**:

- Only fetches, never decides
- Returns relevant canon for the specific query
- Runs in parallel with Arbiter

**Temperature**: 0.1 (factual retrieval)

---

### 3. World Arbiter (Reality Guardrail) — Hybrid (Code + LLM)

**Purpose**: Validate proposed events against canon and game rules

**Architecture**: Hybrid — deterministic code checks first, LLM for contextual judgment.

**Code Layer (runs first)**:

```typescript
// These run as pure code, no LLM
const codeValidations = {
  validateRelationshipCap: (current: number, delta: number) => {
    if (Math.abs(delta) > 2) return { valid: false, capped: Math.sign(delta) * 2 };
    const newValue = current + delta;
    if (newValue < -5 || newValue > 5) return { valid: false, capped: Math.max(-5, Math.min(5, newValue)) - current };
    return { valid: true };
  },
  
  validateItemBounds: (rarity: string, stats: ItemStats) => {
    const bounds = ITEM_BOUNDS[rarity];
    // Check damage, AC, value against bounds
    return { valid: true } | { valid: false, reason: '...' };
  },
  
  validateQuestProgression: (questId: string, currentProgress: number, newProgress: number) => {
    // No skipping steps
    if (newProgress > currentProgress + 1) return { valid: false, reason: 'Cannot skip quest steps' };
    return { valid: true };
  },
  
  validateHpBounds: (current: number, delta: number, max: number) => {
    const newHp = Math.max(0, Math.min(max, current + delta));
    return { valid: true, actualDelta: newHp - current };
  },
};
```

**Read Tools (for LLM contextual checks)**:

```typescript
export const checkNpcExistsTool: FunctionDeclaration = {
  name: "check_npc_exists",
  description: "Check if an NPC exists in the registry",
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      location: { type: Type.STRING },
    },
    required: ["name"],
  },
};

export const getItemBoundsTool: FunctionDeclaration = {
  name: "get_item_bounds",
  description: "Get stat bounds for an item rarity tier",
  parameters: {
    type: Type.OBJECT,
    properties: {
      rarity: { type: Type.STRING, enum: ["common", "uncommon", "rare", "legendary"] },
    },
    required: ["rarity"],
  },
};

export const getQuestStateTool: FunctionDeclaration = {
  name: "get_quest_state",
  description: "Get current quest progress and valid transitions",
  parameters: {
    type: Type.OBJECT,
    properties: {
      quest_id: { type: Type.STRING },
    },
    required: ["quest_id"],
  },
};
```

**Validation Tool (output)**:

```typescript
export const validateEventTool: FunctionDeclaration = {
  name: "validate_event",
  description: "Validate a proposed event against game rules and canon",
  parameters: {
    type: Type.OBJECT,
    properties: {
      event_id: { type: Type.STRING },
      approved: { type: Type.BOOLEAN },
      reason: { type: Type.STRING },
      modified_payload: { type: Type.OBJECT },
    },
    required: ["event_id", "approved", "reason"],
  },
};
```

**Validation Flow**:

```typescript
async function validateProposedEvents(events: ProposedEvent[], context: ValidationContext) {
  const results = [];
  
  for (const event of events) {
    // Step 1: Code validation (deterministic)
    const codeResult = runCodeValidation(event);
    if (!codeResult.valid) {
      results.push({ event_id: event.id, approved: false, reason: codeResult.reason, modified_payload: codeResult.modified });
      continue;
    }
    
    // Step 2: LLM validation (contextual) - only if code passes
    const llmResult = await arbiterLLM.validate(event, context);
    results.push(llmResult);
  }
  
  return results;
}
```

**Temperature**: 0.1 (strict validation)

---

### 4. Chronicler (Storyteller) — JSON Mode + Read Tools

**Purpose**: Generate final narration from validated events

**Read Tools Available**:

```typescript
export const getNpcVoiceTool: FunctionDeclaration = {
  name: "get_npc_voice",
  description: "Get dialogue hints and personality for an NPC",
  parameters: {
    type: Type.OBJECT,
    properties: {
      npc_name: { type: Type.STRING },
    },
    required: ["npc_name"],
  },
};

export const getAtmosphereTool: FunctionDeclaration = {
  name: "get_atmosphere",
  description: "Get atmospheric descriptors for a scene",
  parameters: {
    type: Type.OBJECT,
    properties: {
      location: { type: Type.STRING },
      time: { type: Type.STRING },
      weather: { type: Type.STRING },
    },
    required: ["location"],
  },
};
```

**Input** (via context injection):

```typescript
{
  validated_events: ValidatedEvent[],
  updated_state: GameState,
  canon_snippets?: CanonSnippet[],
  scene_direction: string,
  roll_outcome?: { skill: string, rolled: number, modifier: number, dc: number, success: boolean }
}
```

**Output** (JSON mode):

```typescript
{
  prose: string,
  summary: TurnDiff[],
  suggested_actions: string[]
}
```

**Rules**:

- Can call read tools for NPC voice, atmosphere
- Only narrates validated events
- Must acknowledge roll outcomes accurately
- Second person, PG-13 fantasy tone
- Cannot invent state changes

**Temperature**: 0.8 (creative prose)

---

### 5. Content Sentinel (Safety Gate) — Pure Code

**Purpose**: Final safety filter before display

**Implementation**: Pure code, no LLM.

```typescript
const contentSentinel = {
  check: (text: string): SafetyResult => {
    const flags: string[] = [];
    
    // Pattern matching for unsafe content
    for (const pattern of UNSAFE_PATTERNS) {
      if (pattern.regex.test(text)) {
        flags.push(pattern.category);
      }
    }
    
    if (flags.length === 0) {
      return { status: 'allow', output: text };
    }
    
    if (flags.some(f => BLOCK_CATEGORIES.includes(f))) {
      return { status: 'block', output: BLOCKED_MESSAGE, flags };
    }
    
    return { status: 'transform', output: sanitize(text, flags), flags };
  },
  
  sanitize: (text: string, flags: string[]): string => {
    let result = text;
    for (const flag of flags) {
      result = SANITIZERS[flag](result);
    }
    return result;
  },
};
```

**Temperature**: N/A (no LLM)

---

## Code Layer: Mechanics Resolution

The code layer runs between Orchestrator and the parallel spokes, handling all deterministic game mechanics.

```typescript
interface MechanicsLayer {
  // Dice rolling
  rollD20: () => number;
  rollDice: (sides: number, count: number) => number[];
  
  // Modifier calculation
  calculateSkillModifier: (skillLevel: number) => number;  // floor(level / 10)
  calculatePowerWordBonus: (tier: 1 | 2 | 3) => number;    // tier value
  
  // Check resolution
  resolveSkillCheck: (roll: number, modifier: number, bonus: number, dc: number) => {
    total: number;
    success: boolean;
    margin: number;  // How much over/under DC
  };
  
  // Damage calculation
  calculateDamage: (diceNotation: string, bonuses: number[]) => number;
}

// Implementation
const mechanicsLayer: MechanicsLayer = {
  rollD20: () => Math.floor(Math.random() * 20) + 1,
  
  rollDice: (sides, count) => 
    Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1),
  
  calculateSkillModifier: (skillLevel) => Math.floor(skillLevel / 10),
  
  calculatePowerWordBonus: (tier) => tier,
  
  resolveSkillCheck: (roll, modifier, bonus, dc) => {
    const total = roll + modifier + bonus;
    return {
      total,
      success: total >= dc,
      margin: total - dc,
    };
  },
  
  calculateDamage: (diceNotation, bonuses) => {
    // Parse "2d6+3" format and roll
    const [count, sides] = parseDiceNotation(diceNotation);
    const rolls = mechanicsLayer.rollDice(sides, count);
    return rolls.reduce((a, b) => a + b, 0) + bonuses.reduce((a, b) => a + b, 0);
  },
};
```

**Usage in Pipeline**:

```typescript
// After Orchestrator outputs intent
const intent = orchestratorResult.detect_intent;

if (intent.requires_roll) {
  // Code layer handles the roll
  const roll = mechanicsLayer.rollD20();
  const skillLevel = character.skills[intent.primary_skill]?.level || 0;
  const modifier = mechanicsLayer.calculateSkillModifier(skillLevel);
  const bonus = intent.bonus || 0;
  
  const result = mechanicsLayer.resolveSkillCheck(roll, modifier, bonus, intent.dc);
  
  // Result passed to Chronicler
  rollOutcome = {
    skill: intent.primary_skill,
    rolled: roll,
    modifier,
    bonus,
    dc: intent.dc,
    total: result.total,
    success: result.success,
  };
}
```

---

## Parallelization & Latency Optimization

### Dependency Graph

```
User Input
    │
    ▼
Orchestrator (LLM)                 ◄── Read tools + proposals
    │
    ▼
Code: Mechanics Layer              ◄── Dice, modifiers, check resolution
    │
    ├─────────┬─────────┐
    ▼         ▼         ▼
Lorekeeper  Arbiter   (others)     ◄── PARALLEL (read tools + validation)
    │         │         │
    └─────────┴─────────┘
              │
              ▼
Code: Apply State                  ◄── DB writes for approved changes
    │
    ▼
Chronicler (LLM)                   ◄── Read tools + narration
    │
    ▼
Content Sentinel (Code)            ◄── Pattern matching
    │
    ▼
UI / Client
```

### Latency Budget (Target: <3s total)

| Component        | Target    | Notes                                  |
| ---------------- | --------- | -------------------------------------- |
| Orchestrator     | 500ms     | LLM + read tool calls                  |
| Mechanics Layer  | 10ms      | Pure code, instant                     |
| Lorekeeper       | 300ms     | DB queries + LLM (parallel)            |
| Arbiter          | 400ms     | Code validation + LLM (parallel)       |
| State Apply      | 50ms      | DB writes                              |
| Chronicler       | 1000ms    | LLM + read tools, streaming            |
| Content Sentinel | 10ms      | Pure code                              |
| **Total**        | **~2.2s** | With parallel spokes                   |

---

## Error Handling

### Agent Failure

- Timeout: 10s per agent, fallback to safe default
- Retry: Max 2 retries with exponential backoff
- Graceful degradation: Skip optional agents (Lorekeeper), fail on critical (Arbiter)

### Tool Call Failure

- Read tool fails: Return empty/default data, log error
- Proposal tool malformed: Reject proposal, notify Orchestrator
- Code layer exception: Fail turn, return error to user

### Validation Rejection Loop

1. Arbiter rejects events
2. Notify user: "Refining the story..."
3. Re-run Orchestrator with rejection context
4. Max 2 loops, then fallback narration

---

## Observability

Each component logs:

- Input hash (for debugging)
- Output
- Latency
- Token usage (LLM only)
- Tool calls made
- Code layer results

Trace ID links all components in a single turn for debugging.
