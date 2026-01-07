# MVP Roadmap (Agile)

## Overview

This roadmap follows an agile approach with playable checkpoints every ~10-15 hours of work. Each checkpoint delivers testable functionality, allowing early validation and iteration.

**Key Principle:** Get a playable turn working ASAP, then layer complexity.

## Phase Overview

```
Phase 0: Project Setup                 [~8-12 hours]   — 1 spec ✅ COMPLETE
         ↓
Phase 1: Minimal Wiring                [~11-16 hours]  — 3 specs ✅ COMPLETE
         ↓
🎮 CHECKPOINT 1: Play real turns with Gemini!
         ↓
Phase 2: Core Mechanics                [~15-21 hours]  — 4 specs ✅ COMPLETE
         ↓
🎮 CHECKPOINT 2: Skill checks & streaming working!
         ↓
Phase 3: Demo Polish                   [~8-12 hours]   — 1 spec ✅ COMPLETE
         ↓
🎮 DEMO READY ← YOU ARE HERE
         ↓
Phase 4: Agent Pipeline                [~20-28 hours]  — 4 specs
         ↓
🎮 CHECKPOINT 3: Full agent architecture!
         ↓
Phase 5: Gameplay Systems              [~31-43 hours]  — 6 specs
         ↓
Phase 6: Final Polish                  [~8-12 hours]   — 1 spec
         ↓
MVP COMPLETE                           [Total: ~93-132 hours]
```

---

## Complete Spec List

### Phase 0: Setup ✅ COMPLETE

| ID  | Spec Name          | Estimate | Status      |
| --- | ------------------ | -------- | ----------- |
| 0.1 | `nextjs-migration` | 8-12h    | ✅ COMPLETE |

### Phase 1: Minimal Wiring ✅ COMPLETE

| ID  | Spec Name             | Estimate | Status      |
| --- | --------------------- | -------- | ----------- |
| 1.1 | `supabase-setup`      | 4-6h     | ✅ COMPLETE |
| 1.2 | `wire-character-crud` | 3-4h     | ✅ COMPLETE |
| 1.3 | `single-llm-turn`     | 4-6h     | ✅ COMPLETE |

**🎮 CHECKPOINT 1**: Create character, play turns, state persists.

### Phase 2: Core Mechanics ✅ COMPLETE

| ID  | Spec Name              | Estimate | Status      |
| --- | ---------------------- | -------- | ----------- |
| 2.1 | `authentication`       | 4-6h     | ✅ COMPLETE |
| 2.2 | `gemini-tool-calling`  | 4-5h     | ✅ COMPLETE |
| 2.3 | `skill-checks`         | 5-7h     | ✅ COMPLETE |
| 2.4 | `streaming-safety`     | 2-3h     | ✅ COMPLETE |

**🎮 CHECKPOINT 2**: Auth, skill checks, streaming narration, safety filtering.

### Phase 3: Demo Polish ✅ COMPLETE

| ID  | Spec Name         | Estimate | Status      |
| --- | ----------------- | -------- | ----------- |
| 3.1 | `demo-experience` | 8-12h    | ✅ COMPLETE |

**🎮 DEMO READY**: 20+ turns, NPCs, quests, combat events, gold.

---

### Phase 4: Agent Pipeline (Current)

| ID  | Spec Name                  | Estimate | Status  |
| --- | -------------------------- | -------- | ------- |
| 4.1 | `orchestrator-arbiter`     | 6-8h     | 📋 TODO |
| 4.2 | `lorekeeper`               | 4-6h     | 📋 TODO |
| 4.3 | `agent-pipeline`           | 4-6h     | 📋 TODO |
| 4.4 | `conversation-compression` | 6-8h     | 📋 TODO |

**🎮 CHECKPOINT 3**: Full agent architecture with proper validation.

#### Spec Details (Hub-and-Spoke Architecture):

**4.1 `orchestrator-arbiter`**
- Orchestrator becomes central coordinator (the hub)
- Receives intent from Rune Marshal, dispatches targeted queries to spokes
- Arbiter validates proposed events against rules/canon
- Arbiter can modify events (cap damage, fix rarity) not just reject
- Rune Marshal no longer returns `denial_reason` - only mechanics

**4.2 `lorekeeper`**
- Spoke agent: receives targeted queries from Orchestrator
- "What do we know about these guards?" not "fetch all canon"
- Returns canon snippets relevant to the specific intent
- Runs in parallel with Arbiter (Phase 3 of pipeline)

**4.3 `agent-pipeline`**
- Wire up hub-and-spoke flow:
  1. Rune Marshal (intent) → 
  2. Orchestrator (dispatch) → 
  3. [Lorekeeper, Arbiter] parallel → 
  4. Orchestrator (collect) → 
  5. Chronicler (narrate)
- Chronicler only narrates approved events
- No more meta-commentary in narration

**4.4 `conversation-compression`**
- Compress turn history when changing locations
- Generate summaries for context management
- Stay within token budget for long sessions

#### Checkpoint 3 Checklist:
- [ ] Rune Marshal detects intent without denying actions
- [ ] Orchestrator dispatches targeted queries to spokes
- [ ] Lorekeeper + Arbiter run in parallel
- [ ] Orchestrator collects responses and proposes events
- [ ] Arbiter validates/rejects/modifies events
- [ ] Chronicler only narrates approved events (no meta-commentary)
- [ ] NPCs appear correctly at their locations
- [ ] Invalid location changes rejected
- [ ] Conversation compression working for long sessions
- [ ] 50+ turns without context overflow

### Phase 5: Gameplay Systems

| ID  | Spec Name             | Estimate | Status  |
| --- | --------------------- | -------- | ------- |
| 5.1 | `inventory-equipment` | 4-6h     | 📋 TODO |
| 5.2 | `skill-system`        | 6-8h     | 📋 TODO |
| 5.3 | `combat-system`       | 8-10h    | 📋 TODO |
| 5.4 | `quest-npc-system`    | 6-8h     | 📋 TODO |
| 5.5 | `world-systems`       | 4-6h     | 📋 TODO |
| 5.6 | `dm-chat`             | 3-5h     | 📋 TODO |

**🎮 CHECKPOINT 4**: Full gameplay systems.

#### Checkpoint 4 Checklist:
- [ ] Equip/unequip items from inventory UI
- [ ] Item stats affect combat (weapon damage, armor AC)
- [ ] Skills gain XP from use
- [ ] Skill level ups with notifications
- [ ] Power words unlock at skill thresholds
- [ ] Combat tracks enemy HP
- [ ] Death/incapacitation handling
- [ ] Quest log UI with progress tracking
- [ ] NPC dialogue reflects relationship level
- [ ] Time progresses (day/phase changes)
- [ ] Weather affects gameplay
- [ ] DM chat answers questions without turns

### Phase 6: Final Polish

| ID  | Spec Name    | Estimate | Status  |
| --- | ------------ | -------- | ------- |
| 6.1 | `mvp-polish` | 8-12h    | 📋 TODO |
| 6.2 | `e2e-testing` | 6-10h   | 📋 TODO |

**🎮 MVP COMPLETE**

#### MVP Checklist:
- [ ] No critical bugs in 100-turn playthrough
- [ ] Error states handled gracefully
- [ ] Loading states feel polished
- [ ] Mobile experience smooth
- [ ] Performance acceptable (<3s turn response)
- [ ] All UI elements accessible
- [ ] Edge cases handled (empty inventory, 0 HP, etc.)
- [ ] E2E tests pass for demo path
- [ ] E2E tests validate edge cases

---

## Dependency Graph

```
Phase 0-3: ✅ COMPLETE (Demo Ready)
         │
         ▼
    4.1 orchestrator-arbiter
         │
         ▼
    4.2 lorekeeper
         │
         ▼
    4.3 agent-pipeline
         │
         ▼
    4.4 conversation-compression
         │
    🎮 CHECKPOINT 3
         │
         ▼
    ┌────┼────┬────┬────┬────┐
    ▼    ▼    ▼    ▼    ▼    ▼
   5.1  5.2  5.3  5.4  5.5  5.6  (parallel)
    └────┴────┴────┼────┴────┘
                   ▼
              6.1 mvp-polish
                   │
                   ▼
              6.2 e2e-testing
                   │
              🎮 MVP COMPLETE
```

---

## Remaining Work Summary

| Phase | Specs | Hours | Focus |
|-------|-------|-------|-------|
| 4 Agent Pipeline | 4 | 20-28h | Proper validation & context |
| 5 Gameplay | 6 | 31-43h | Full game systems |
| 6 Polish | 2 | 14-22h | Bug fixes, UX & E2E tests |
| **Total** | **12** | **~65-93h** | |

---

## Next Actions

1. Start 4.1 `orchestrator-arbiter` - Foundation for all event validation
2. Then 4.2 `lorekeeper` - Feeds canon/NPC data to arbiter
3. Then 4.3 `agent-pipeline` - Wire agents together
4. Then 4.4 `conversation-compression` - Manage context window

---

## Risk Mitigation

| Risk                | Mitigation                                    |
| ------------------- | --------------------------------------------- |
| Gemini latency      | Start without streaming, add later            |
| Auth complexity     | Skip until Checkpoint 1 works                 |
| Scope creep         | Each checkpoint is testable, stop anytime     |
| LLM inconsistency   | Tool calling provides schema-enforced outputs |
| Tool calling issues | Fallback to JSON mode if needed               |

---

## Post-MVP Roadmap

Features to consider after MVP is stable and launched.

### Phase 7: Map & World Visualization

| ID  | Spec Name              | Estimate | Priority |
| --- | ---------------------- | -------- | -------- |
| 7.1 | `interactive-map`      | 8-12h    | High     |
| 7.2 | `location-art`         | 4-6h     | Medium   |
| 7.3 | `travel-system`        | 6-8h     | Medium   |

#### 7.1 `interactive-map`
- Visual map showing full world/region artwork
- POI markers only appear once discovered in adventure
- Click discovered POI to see details, travel option
- Show current location indicator
- Undiscovered POIs hidden (map terrain still visible)
- Region boundaries and labels

#### 7.2 `location-art`
- Generate/display art for each location
- Store in Supabase Storage
- Show in map popover and world panel
- Cache generated images

#### 7.3 `travel-system`
- Travel time between POIs
- Random encounters during travel
- Resource consumption (food, supplies)
- Fast travel to visited locations

### Phase 8: Living World (Future)

| ID  | Spec Name              | Estimate | Priority |
| --- | ---------------------- | -------- | -------- |
| 8.1 | `world-events`         | 8-10h    | Low      |
| 8.2 | `npc-schedules`        | 6-8h     | Low      |
| 8.3 | `faction-system`       | 10-12h   | Low      |

### Phase 9: Social Features (Future)

| ID  | Spec Name              | Estimate | Priority |
| --- | ---------------------- | -------- | -------- |
| 9.1 | `shared-discoveries`   | 6-8h     | Medium   |
| 9.2 | `leaderboards`         | 4-6h     | Low      |
| 9.3 | `story-sharing`        | 6-8h     | Low      |
