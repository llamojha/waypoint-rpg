# MVP Roadmap (Agile)

## Overview

This roadmap follows an agile approach with playable checkpoints every ~10-15 hours of work. Each checkpoint delivers testable functionality, allowing early validation and iteration.

**Key Principle:** Get a playable turn working ASAP, then layer complexity.

## Phase Overview

```
Phase 0: Project Setup                 [~8-12 hours]   — 1 spec ✅ COMPLETE
         ↓
Phase 1A: Minimal Wiring               [~7-10 hours]   — 2 specs
         ↓
🎮 CHECKPOINT 1: Play real turns with Gemini!
         ↓
Phase 1B: Authentication               [~4-6 hours]    — 1 spec
         ↓
Phase 2A: Mechanics                    [~7-10 hours]   — 2 specs
         ↓
🎮 CHECKPOINT 2: Skill checks working!
         ↓
Phase 2B: Streaming & Safety           [~6-9 hours]    — 2 specs
         ↓
🎮 CHECKPOINT 3: Polished narration experience!
         ↓
Phase 3: Demo Polish                   [~8-12 hours]   — 1 spec
         ↓
🎮 DEMO READY
         ↓
Phase 4: Gameplay Systems              [~28-38 hours]  — 5 specs
         ↓
Phase 5: Final Polish                  [~8-12 hours]   — 1 spec
         ↓
MVP COMPLETE                           [Total: ~76-109 hours]
```

---

## Complete Spec List

### Phase 0: Setup ✅ COMPLETE

| ID  | Spec Name          | Estimate | Status      |
| --- | ------------------ | -------- | ----------- |
| 0.1 | `nextjs-migration` | 8-12h    | ✅ COMPLETE |

### Phase 1A: Minimal Wiring

| ID  | Spec Name             | Estimate | Status      |
| --- | --------------------- | -------- | ----------- |
| 1.1 | `supabase-setup`      | 4-6h     | ✅ COMPLETE |
| 1.5 | `wire-character-crud` | 3-4h     | 📋 TODO     |
| 1.6 | `single-llm-turn`     | 4-6h     | 📋 TODO     |

**🎮 CHECKPOINT 1** after 1.6:

- Create character → saved to Supabase
- Play turns → Gemini generates narration
- State persists between sessions
- No auth yet (test user)

### Phase 1B: Authentication

| ID  | Spec Name        | Estimate | Status  |
| --- | ---------------- | -------- | ------- |
| 1.2 | `authentication` | 4-6h     | 📋 TODO |

### Phase 2A: Mechanics (with Tool Calling)

| ID  | Spec Name                | Estimate | Status  |
| --- | ------------------------ | -------- | ------- |
| 2.1 | `gemini-integration`     | 4-5h     | 📋 TODO |
| 2.2 | `skill-checks-mechanics` | 5-7h     | 📋 TODO |

**🎮 CHECKPOINT 2** after 2.2:

- Skill checks with roll button
- Power word detection via tool calling
- DC and modifiers working
- Tool calling foundation for future agents

### Phase 2B: Streaming & Safety

| ID  | Spec Name              | Estimate | Status  |
| --- | ---------------------- | -------- | ------- |
| 2.3 | `chronicler-streaming` | 4-6h     | 📋 TODO |
| 2.4 | `content-sentinel`     | 2-3h     | 📋 TODO |

**🎮 CHECKPOINT 3** after 2.4:

- Streaming narration (text appears as it generates)
- Content safety filtering in place

### Phase 2C: Full Agent Pipeline (Post-Demo, Tool Calling)

| ID  | Spec Name              | Estimate | Status      |
| --- | ---------------------- | -------- | ----------- |
| 2.5 | `lorekeeper`           | 4-6h     | ⏸️ DEFERRED |
| 2.6 | `orchestrator-arbiter` | 6-8h     | ⏸️ DEFERRED |
| 2.7 | `agent-pipeline`       | 4-6h     | ⏸️ DEFERRED |

All deferred agents will use tool calling, building on the foundation from 2.1/2.2.

### Phase 3: Demo Polish

| ID  | Spec Name         | Estimate | Status  |
| --- | ----------------- | -------- | ------- |
| 3.1 | `demo-experience` | 8-12h    | 📋 TODO |

**🎮 DEMO READY** after 3.1

### Phase 4: Gameplay Systems

| ID  | Spec Name             | Estimate | Status  |
| --- | --------------------- | -------- | ------- |
| 4.1 | `skill-system`        | 6-8h     | 📋 TODO |
| 4.2 | `combat-system`       | 8-10h    | 📋 TODO |
| 4.3 | `inventory-equipment` | 4-6h     | 📋 TODO |
| 4.4 | `quest-npc-system`    | 6-8h     | 📋 TODO |
| 4.5 | `world-systems`       | 4-6h     | 📋 TODO |

### Phase 5: Final Polish

| ID  | Spec Name    | Estimate | Status  |
| --- | ------------ | -------- | ------- |
| 5.1 | `mvp-polish` | 8-12h    | 📋 TODO |

---

## Dependency Graph

```
0.1 nextjs-migration ✅
         │
         ▼
    1.1 supabase-setup ✅
         │
         ▼
    1.5 wire-character-crud
         │
         ▼
    1.6 single-llm-turn
         │
    🎮 CHECKPOINT 1 ────────────────────┐
         │                              │
         ▼                              │
    1.2 authentication                  │
         │                              │
         ▼                              │
    2.1 gemini-integration              │
         │                              │
         ▼                              │
    2.2 skill-checks-mechanics          │
         │                              │
    🎮 CHECKPOINT 2                     │
         │                              │
         ▼                              │
    2.3 chronicler-streaming            │
         │                              │
         ▼                              │
    2.4 content-sentinel                │
         │                              │
    🎮 CHECKPOINT 3                     │
         │                              │
         ▼                              │
    3.1 demo-experience ◄───────────────┘
         │
    🎮 DEMO READY
         │
         ▼
    ┌────┼────┬────┐
    ▼    ▼    ▼    ▼
   4.1  4.2  4.3  4.4  (parallel)
    └────┼────┴────┘
         ▼
       4.5 world-systems
         │
         ▼
    5.1 mvp-polish
         │
    🎮 MVP COMPLETE
```

---

## Checkpoint Details

### 🎮 Checkpoint 1: First Playable (~30h total)

**What works:**

- Character creation saves to Supabase
- Playing a turn calls Gemini and gets real narration
- Turn history persists
- Basic state updates (inventory, stats)

**What's missing:**

- No auth (hardcoded test user)
- No skill checks (LLM decides outcomes)
- No streaming (wait for full response)
- No safety filtering

**Test scenario:**

1. Create character "Test Hero"
2. Play 5 turns exploring
3. Refresh page → character and turns persist

---

### 🎮 Checkpoint 2: Mechanics Working (~45h total)

**What works:**

- Everything from Checkpoint 1
- Real authentication
- Skill checks with roll button
- Power word detection (+1/+2/+3 bonuses)
- DC and modifiers displayed

**What's missing:**

- No streaming (still wait for full response)
- No safety filtering
- No codex/lore queries

**Test scenario:**

1. Sign in with magic link
2. Type "I sneak past the guard"
3. See Sneaking check with DC
4. Click Roll → see outcome affect narration

---

### 🎮 Checkpoint 3: Polished Experience (~55h total)

**What works:**

- Everything from Checkpoint 2
- Streaming narration (text appears progressively)
- Content safety filtering
- Smooth UX

**What's missing:**

- Full agent pipeline (Lorekeeper, Orchestrator, Arbiter)
- Advanced validation

**Test scenario:**

1. Play a turn
2. See narration stream in character by character
3. Try inappropriate input → get filtered response

---

### 🎮 Demo Ready (~65h total)

**What works:**

- 20+ turn playthrough without issues
- All core mechanics functional
- Polished UI/UX
- Error handling

---

## Spec Descriptions

### 1.5 `wire-character-crud`

Connect character API routes to Supabase.

- GET /api/character → fetch from waypoint_characters
- POST /api/character → insert new character
- PATCH /api/character → update character
- Use hardcoded test user_id (skip auth for now)
- Update App.tsx to load/save real data

### 1.6 `single-llm-turn`

Implement turn processing with a single Gemini call.

- POST /api/turn receives player action + current state
- Call Gemini with combined prompt (narration + diffs)
- Parse response for narration and proposed changes
- Basic validation (HP bounds, inventory exists)
- Save turn to waypoint_turns
- Update character state
- Return narration + diffs to client

### 2.1 `gemini-integration`

Add tool calling support to Gemini client.

- Add `generateWithTools()` function for tool calling
- Add tool declaration types and helpers
- Add retry logic with exponential backoff
- Add token counting utilities
- Add temperature configuration

### 2.2 `skill-checks-mechanics`

Extract mechanics detection using tool calling.

- Define `detect_intent` tool declaration
- Dedicated low-temp call for intent parsing
- Power word detection against SKILL_TREE
- Skill check determination (when to roll)
- DC calculation based on context
- Modifier calculation (skill level + power word bonus)
- Wire roll button to resolve checks

### 2.3 `chronicler-streaming`

Add SSE streaming for narration.

- Convert /api/turn to stream response
- Chunk narration as it generates
- Update CenterColumn to display streaming text
- Send final diffs after narration complete

### 2.4 `content-sentinel`

Add safety filtering.

- Input filtering (block explicit content)
- Output filtering (rewrite unsafe LLM output)
- PG-13 content rating enforcement
- Logging for review

---

## Removed/Merged Specs

| Original Spec                      | Disposition                                          |
| ---------------------------------- | ---------------------------------------------------- |
| 1.3 `api-routes-foundation`        | ❌ Merged into 1.5 + 1.6                             |
| 2.2 `agent-lorekeeper-runemarshal` | 🔀 Split: Rune Marshal logic → 2.2, Lorekeeper → 2.5 |
| 2.3 `agent-orchestrator-arbiter`   | ⏸️ Deferred to 2.6                                   |
| 2.4 `agent-chronicler-sentinel`    | 🔀 Split: Chronicler → 2.3, Sentinel → 2.4           |
| 2.5 `agent-pipeline`               | ⏸️ Deferred to 2.7                                   |

---

## Time Estimates by Checkpoint

| Checkpoint             | Cumulative Hours | New Work |
| ---------------------- | ---------------- | -------- |
| Start (0.1 + 1.1 done) | ~16-20h          | —        |
| Checkpoint 1           | ~26-32h          | ~8-10h   |
| Checkpoint 2           | ~40-50h          | ~12-16h  |
| Checkpoint 3           | ~48-60h          | ~6-9h    |
| Demo Ready             | ~58-72h          | ~8-12h   |
| MVP Complete           | ~94-122h         | ~36-50h  |

---

## Next Actions

1. ✅ Update roadmap (this file)
2. Create spec 1.5 `wire-character-crud`
3. Create spec 1.6 `single-llm-turn`
4. Implement 1.5 → 1.6 → reach Checkpoint 1
5. Celebrate playing real turns!

---

## Risk Mitigation

| Risk                | Mitigation                                    |
| ------------------- | --------------------------------------------- |
| Gemini latency      | Start without streaming, add later            |
| Auth complexity     | Skip until Checkpoint 1 works                 |
| Scope creep         | Each checkpoint is testable, stop anytime     |
| LLM inconsistency   | Tool calling provides schema-enforced outputs |
| Tool calling issues | Fallback to JSON mode if needed               |
