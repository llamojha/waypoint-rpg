# Turn Pipeline (Actual Implementation)

This documents the actual flow of a turn as implemented in `app/api/turn/route.ts`.

## Overview

The route.ts acts as the pipeline controller, calling agents and code functions in sequence. The "Orchestrator" agent generates proposals but doesn't orchestrate other agents - the route does.

## Turn Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         POST /api/turn                              │
│                         (route.ts)                                  │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 1. CONTENT SENTINEL                                          [code] │
│    filterInput(playerAction)                                        │
│    → blocks/transforms unsafe input                                 │
│    → ~1ms                                                           │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. RUNE MARSHAL                                               [LLM] │
│    runRuneMarshal(playerAction, character, world)                   │
│    → detects skill, DC, power words                                 │
│    → decides if roll needed                                         │
│    → ~150-300ms                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌───────────┴───────────┐
                    │   requires_roll?      │
                    └───────────┬───────────┘
                          │           │
                         YES          NO
                          │           │
                          ▼           │
┌─────────────────────────────────┐   │
│ Return pending roll to UI       │   │
│ (wait for player to click Roll) │   │
└─────────────────────────────────┘   │
                          │           │
                          ▼           │
┌─────────────────────────────────┐   │
│ ROLL RESOLUTION          [code] │   │
│ resolveSkillCheck()             │   │
│ → d20 + modifier vs DC          │   │
└─────────────────────────────────┘   │
                          │           │
                          └─────┬─────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. QUEST CONTEXT                                             [code] │
│    runQuestAgent(characterId)                                       │
│    → DB query for active quests                                     │
│    → DB query for NPC quest hooks                                   │
│    → ~50-100ms                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. ORCHESTRATOR                                               [LLM] │
│    runOrchestrator(action, character, world, turns, roll, quest)    │
│    │                                                                │
│    │  Context injected:                                             │
│    │  - SKILL_TREE (for power word detection)                       │
│    │  - Character state                                             │
│    │  - World context                                               │
│    │  - Recent turns                                                │
│    │  - Quest context                                               │
│    │  - Roll outcome (if any)                                       │
│    │                                                                │
│    │  Read tools available:                                         │
│    │  - get_power_word_tier(word, skill)                            │
│    │  - get_skill_level(skill)                                      │
│    │                                                                │
│    │  Proposal tools:                                               │
│    │  - propose_stat_change                                         │
│    │  - propose_inventory_add/remove                                │
│    │  - propose_relationship_change                                 │
│    │  - propose_location_change                                     │
│    │  - propose_quest_start/progress                                │
│    │  - propose_npc_discovered                                      │
│    │                                                                │
│    └─→ Returns: proposals[]                                         │
│    → ~1500-2500ms                                                   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. PARALLEL: ARBITER + LOREKEEPER                                   │
│                                                                     │
│    ┌─────────────────────────┐    ┌─────────────────────────┐       │
│    │ ARBITER          [code] │    │ LOREKEEPER        [LLM] │       │
│    │ runArbiter(proposals)   │    │ runLorekeeper(action)   │       │
│    │                         │    │                         │       │
│    │ Validates:              │    │ Fetches:                │       │
│    │ - Relationship caps     │    │ - NPCs at location      │       │
│    │ - HP/gold bounds        │    │ - Codex snippets        │       │
│    │ - Item rarity limits    │    │ - NPC voices            │       │
│    │ - Quest progression     │    │ - Atmosphere            │       │
│    │ - Location validity     │    │                         │       │
│    │ - Inventory exists      │    │                         │       │
│    │                         │    │                         │       │
│    │ → approved[], rejected[]│    │ → lore context          │       │
│    └─────────────────────────┘    └─────────────────────────┘       │
│                                                                     │
│    → ~300-500ms (parallel)                                          │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌───────────┴───────────┐
                    │  rejections > 0 AND   │
                    │  retries < 2?         │
                    └───────────┬───────────┘
                          │           │
                         YES          NO
                          │           │
                          ▼           │
              ┌───────────────────┐   │
              │ Re-run Orchestrator│   │
              │ with rejection     │   │
              │ context            │   │
              └─────────┬─────────┘   │
                        │             │
                        └──── loop ───┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 6. COLLECTOR (First Pass)                                    [code] │
│    collectParallelOutputs(arbiter, lorekeeper)                      │
│    → merges approved events + lore context                          │
│    → ~1ms                                                           │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 7. APPLY STATE                                               [code] │
│    applyEvents(character, world, approvedEvents)                    │
│    │                                                                │
│    │  Applies:                                                      │
│    │  - HP/gold changes                                             │
│    │  - Inventory add/remove                                        │
│    │  - World updates (location, time)                              │
│    │  - Relationship changes (collected for DB)                     │
│    │  - Quest changes (collected for DB)                            │
│    │                                                                │
│    └─→ Returns: diffs[], consequences[], DB updates                 │
│    → ~1-5ms                                                         │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 8. COLLECTOR (Second Pass)                                   [code] │
│    buildChroniclerContext(collected, applyResult)                   │
│    → merges lore + events + consequences                            │
│    → prepares full context for Chronicler                           │
│    → ~1ms                                                           │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 9. CHRONICLER                                                 [LLM] │
│    generateTurn(prompt)                                             │
│    │                                                                │
│    │  Context provided:                                             │
│    │  - Approved events to narrate                                  │
│    │  - Roll outcome                                                │
│    │  - NPCs present + voice data                                   │
│    │  - Atmosphere descriptors                                      │
│    │  - Codex snippets                                              │
│    │  - Consequences (NPC died, quest completed)                    │
│    │  - Recent turns (for continuity)                               │
│    │                                                                │
│    └─→ Returns: narration, suggested_actions[]                      │
│    → ~2000-4000ms                                                   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 10. CONTENT SENTINEL (Output)                                [code] │
│     filterOutput(narration)                                         │
│     → blocks/transforms unsafe output                               │
│     → ~1ms                                                          │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 11. DATABASE WRITES                                          [code] │
│     - Update character (HP, gold, inventory, equipment)             │
│     - Update world state (location, time)                           │
│     - Upsert NPC relationships                                      │
│     - Upsert quest progress                                         │
│     - Insert turn record                                            │
│     → ~50-100ms                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 12. RESPONSE                                                        │
│     {                                                               │
│       turn: { narration, diffs, suggestedActions, mechanics },      │
│       trace: AgentTrace[]                                           │
│     }                                                               │
└─────────────────────────────────────────────────────────────────────┘
```

## Timing Breakdown

| Step | Agent | Type | Typical Duration |
|------|-------|------|------------------|
| 1 | Content Sentinel | Code | ~1ms |
| 2 | Rune Marshal | LLM | ~150-300ms |
| 3 | Quest Context | Code/DB | ~50-100ms |
| 4 | Orchestrator | LLM | ~1500-2500ms |
| 5 | Arbiter + Lorekeeper | Code + LLM | ~300-500ms (parallel) |
| 6 | Collector | Code | ~1ms |
| 7 | Apply State | Code | ~1-5ms |
| 8 | Collector | Code | ~1ms |
| 9 | Chronicler | LLM | ~2000-4000ms |
| 10 | Content Sentinel | Code | ~1ms |
| 11 | DB Writes | Code/DB | ~50-100ms |
| **Total** | | | **~4-7 seconds** |

## LLM Calls Breakdown

There are **4 LLM calls** per turn (minimum), potentially more with retries:

### LLM Call 1: Rune Marshal (~150-300ms)

**Purpose**: Detect player intent before full processing

**Why**: Quick check to determine if a skill check is needed, avoiding full pipeline for simple actions

**Input**:
- Player action text
- Character skills (names only)
- Current location

**Output**:
- `primary_skill`: Which skill applies
- `requires_roll`: Boolean
- `dc`: Difficulty class (if roll needed)
- `power_words`: Detected power words
- `intent`: Brief description

**Example**:
```
Input: "I sneak past the guards"
Output: { primary_skill: "Sneaking", requires_roll: true, dc: 14, power_words: ["sneak"] }
```

---

### LLM Call 2: Orchestrator (~1500-2500ms)

**Purpose**: Generate proposals for state changes

**Why**: Core decision-making - what should happen as a result of the player's action

**Input** (large prompt ~3-5k tokens):
- Full SKILL_TREE JSON (for power word detection)
- Character state (HP, gold, inventory, skills)
- World context (location, time, weather, nearby POIs)
- Recent turns (last 5, for continuity)
- Quest context (active quests, NPC quest hooks)
- Roll outcome (if applicable)
- Tool definitions (10+ tools)

**Output**:
- Array of `propose_*` tool calls

**Why it's slow**:
1. Large context to process
2. Tool calling mode requires structured output
3. May make multiple internal calls if read tools are used:

```
Scenario A: Simple action (1 LLM call)
─────────────────────────────────────
LLM call: 1200ms
  → propose_location_change("Captain's Hall")
Total: 1200ms

Scenario B: Action needing skill lookup (2 LLM calls)  
─────────────────────────────────────────────────────
LLM call 1: 800ms
  → get_skill_level("Melee")  ← read tool
  
[Code handles read tool, returns skill level]

LLM call 2: 900ms
  → propose_stat_change(hp: -5)
  → propose_relationship_change(npc: "Guard", delta: -1)
Total: 1700ms
```

---

### LLM Call 3: Lorekeeper (~200-400ms, parallel with Arbiter)

**Purpose**: Fetch contextual lore for the Chronicler

**Why**: Provides NPCs present, their voice/personality, atmosphere for rich narration

**Input**:
- Player action
- Current location
- Character ID (for relationship lookup)

**Output**:
- `npcsPresent`: NPCs at this location with personality/dialogue hints
- `codexSnippets`: Relevant lore entries
- `npcVoices`: How each NPC speaks
- `atmosphere`: Scene descriptors (sounds, smells, mood)

**Note**: Runs in parallel with Arbiter (code), so doesn't add to total time

---

### LLM Call 4: Chronicler (~2000-4000ms)

**Purpose**: Generate the narrative response

**Why**: This is the creative writing step - turning approved events into prose

**Input**:
- Approved events (from Arbiter)
- Roll outcome (skill, rolled, total, DC, success/failure)
- NPCs present with voice data
- Atmosphere descriptors
- Codex snippets
- Consequences (NPC died, quest completed, etc.)
- Recent turns (for continuity)
- Character and world state

**Output**:
- `narration`: The prose response (500-1500 chars)
- `suggested_actions`: 3-4 follow-up options

**Why it's the slowest**:
1. Generates longest output (~200-400 tokens)
2. Creative writing requires more "thinking"
3. Must incorporate multiple elements naturally

---

### Retry LLM Calls (if proposals rejected)

If Arbiter rejects proposals, the Orchestrator is called again:

```
Turn with retry:
────────────────
1. Rune Marshal:     200ms
2. Orchestrator:    1500ms  → proposes location_change("Mordor")
3. Arbiter:          50ms   → REJECTS (invalid location)
4. Orchestrator:    1200ms  → proposes location_change("Captain's Hall")  ← RETRY
5. Arbiter:          50ms   → approves
6. Lorekeeper:      300ms   (parallel with step 5)
7. Chronicler:     2500ms
────────────────────────────
Total:             ~5800ms  (vs ~4500ms without retry)
```

Max 2 retries, then proceeds with whatever was approved.

---

## Summary: Where Time Goes

```
Total turn: ~5000ms typical

  Rune Marshal:    200ms   ████
  Orchestrator:   1800ms   ████████████████████████████████████
  Arbiter:          50ms   █
  Lorekeeper:      300ms   ██████  (parallel, doesn't add)
  Chronicler:     2500ms   ██████████████████████████████████████████████████
  DB/Code:         150ms   ███
                          ─────
                          ~5000ms

LLM time:    ~4500ms (90%)
Code/DB:      ~500ms (10%)
```

## Key Files

- `app/api/turn/route.ts` - Pipeline controller
- `lib/agents/orchestrator.ts` - Proposal generation
- `lib/agents/arbiter/` - Validation (pure code)
- `lib/agents/lorekeeper/` - Lore fetching (LLM)
- `lib/agents/rune-marshal.ts` - Intent detection (LLM)
- `lib/agents/quest-agent.ts` - Quest context (DB queries)
- `lib/agents/collector.ts` - Context merging (code)
- `lib/turn/apply.ts` - State application (code)
- `lib/gemini/prompts.ts` - Chronicler prompt building
- `lib/gemini/turn.ts` - Chronicler LLM call
- `lib/safety/` - Content filtering (code)
