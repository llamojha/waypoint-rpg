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

| ID  | Spec Name                  | Status      |
| --- | -------------------------- | ----------- |
| 4.1 | `orchestrator-arbiter`     | ✅ COMPLETE |
| 4.2 | `lorekeeper`               | ✅ COMPLETE |
| 4.3 | `agent-pipeline`           | ✅ COMPLETE |
| 4.4 | `quest-agent`              | ✅ COMPLETE |
| 4.5 | `phase4-demo-testing`      | 📋 TODO     |

**🎮 CHECKPOINT 3**: Full agent architecture with proper validation.

#### Spec Details (Hybrid LLM + Code Architecture):

**4.1 `orchestrator-arbiter`**
- Orchestrator becomes central coordinator (the hub)
- Handles intent detection + event proposals in single call (temp 0.1)
- Uses read tools: `get_power_word_tier()`, `get_skill_level()`
- Uses proposal tools: `detect_intent`, `propose_*`
- Code layer handles dice rolls, modifier calculation between agents
- Arbiter: code validation first (bounds, caps), LLM for contextual checks
- Arbiter can modify events (cap damage, fix rarity) not just reject

**4.2 `lorekeeper`**
- Spoke agent: receives targeted queries from Orchestrator
- Uses read tools: `query_codex()`, `get_npcs_at_location()`, `get_location_details()`
- "What do we know about these guards?" not "fetch all canon"
- Returns canon snippets relevant to the specific intent
- Runs in parallel with Arbiter

**4.3 `agent-pipeline`** ✅
- Arbiter revamped to pure code (removed LLM validation)
- Retry loop: re-run Orchestrator on rejections (max 2 retries)
- Lorekeeper enhanced with `get_npc_voice()`, `get_atmosphere()`
- Collector passes enriched context (npcVoices, atmosphere) to Chronicler
- Chronicler prompt updated to use voice/atmosphere data

**4.4 `quest-agent`** ✅
- Quest context pre-fetched before Orchestrator runs
- Provides active quests and NPC quest hooks to Orchestrator prompt
- Orchestrator uses quest context to propose `quest_progress` or `quest_start`
- Not a parallel spoke - feeds into Orchestrator as context injection

**4.5 `phase4-demo-testing`**
- Manual playthrough testing (20+ turns)
- Verify retry loop triggers on invalid proposals
- Verify NPC voice/atmosphere in narration
- Verify quest/NPC interactions work correctly
- Document any bugs found for fixing

#### Checkpoint 3 Checklist:
- [x] Orchestrator uses read tools (`get_power_word_tier`, `get_skill_level`)
- [x] Orchestrator outputs proposals via tool calls (temp 0.1)
- [x] Code layer handles dice rolls and modifier calculation
- [x] SKILL_TREE injected in Orchestrator prompt
- [x] Lorekeeper + Arbiter run in parallel
- [x] Arbiter validates/rejects/modifies events (pure code)
- [x] Retry loop re-runs Orchestrator on rejections
- [x] Chronicler receives NPC voice/atmosphere context
- [x] Quest context pre-fetched and injected into Orchestrator
- [ ] NPCs appear correctly at their locations
- [ ] Invalid location changes rejected
- [ ] 50+ turns without context overflow

### Phase 5: Gameplay Systems

| ID  | Spec Name             | Status  |
| --- | --------------------- | ------- |
| 5.0 | `automated-testing`   | 📋 TODO |
| 5.1 | `inventory-equipment` | 📋 TODO |
| 5.2 | `skill-system`        | 📋 TODO |
| 5.3 | `combat-system`       | 📋 TODO |
| 5.4 | `world-systems`       | 📋 TODO |
| 5.5 | `dm-chat`             | 📋 TODO |

**5.0 `automated-testing`** (First item - gate for Phase 5)
- API-level integration tests hitting `/api/turn` endpoint
- Test scenarios from `docs/phase4-demo-testing.md`
- Assert on trace structure, mechanics, state changes (not narration text)
- Run via separate CI job (long runtime due to LLM calls)
- Consider: GitHub Actions with manual trigger, or separate test runner
- Mock LLM option for fast CI, real LLM for nightly/manual runs

**🎮 CHECKPOINT 4**: Full gameplay systems.

#### Checkpoint 4 Checklist:
- [ ] Automated tests passing in CI
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

| ID  | Spec Name                  | Status  |
| --- | -------------------------- | ------- |
| 6.1 | `conversation-compression` | 📋 TODO |
| 6.2 | `security-review`          | 📋 TODO |
| 6.3 | `mvp-polish`               | 📋 TODO |
| 6.4 | `e2e-testing`              | 📋 TODO |

**6.2 `security-review`**
- Add auth checks to all API endpoints (turn, character, world, etc.)
- Verify user owns character before allowing mutations
- Review RLS policies on all Supabase tables
- Audit `createAdminClient` usage (should be minimal)
- Rate limiting on LLM-calling endpoints
- Input sanitization review

**🎮 MVP COMPLETE**

#### MVP Checklist:
- [ ] No critical bugs in 100-turn playthrough
- [ ] Error states handled gracefully
- [ ] Loading states feel polished
- [ ] Mobile experience smooth
- [ ] Performance acceptable (<3s turn response)
- [ ] All UI elements accessible
- [ ] Edge cases handled (empty inventory, 0 HP, etc.)
- [ ] Auth on all API endpoints verified
- [ ] RLS policies reviewed
- [ ] E2E tests pass for demo path
- [ ] E2E tests validate edge cases

---

## Dependency Graph

```
Phase 0-3: ✅ COMPLETE (Demo Ready)
         │
         ▼
    4.1 orchestrator-arbiter ✅
         │
         ▼
    4.2 lorekeeper ✅
         │
         ▼
    4.3 agent-pipeline ✅
         │
         ▼
    4.4 quest-agent ✅
         │
         ▼
    4.5 phase4-demo-testing
         │
    🎮 CHECKPOINT 3
         │
         ▼
    5.0 automated-testing (gate)
         │
    ┌────┼────┬────┬────┬────┐
    ▼    ▼    ▼    ▼    ▼    ▼
   5.1  5.2  5.3  5.4  5.5  (parallel)
    └────┴────┴────┼────┴────┘
                   ▼
    🎮 CHECKPOINT 4
         │
    ┌────┴────┬────┬────┐
    ▼         ▼    ▼    ▼
   6.1       6.2  6.3  6.4
    └────┬────┴────┴────┘
         │
    🎮 MVP COMPLETE
```

---

## Next Actions

1. Complete 4.5 `phase4-demo-testing` - Manual testing with debug export
2. Start 5.0 `automated-testing` - CI pipeline for turn tests
3. Phase 5 gameplay specs can run in parallel after testing gate

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

> **See `docs/shared-world-vision.md`** for the full shared world vision including epoch time model, instanced interactions within shared world, and community events.

| ID  | Spec Name              | Estimate | Priority |
| --- | ---------------------- | -------- | -------- |
| 8.1 | `world-events`         | 8-10h    | Low      |
| 8.2 | `npc-schedules`        | 6-8h     | Low      |
| 8.3 | `faction-system`       | 10-12h   | Low      |

### Phase 9: Social Features (Future)

> **See `docs/shared-world-vision.md`** for social hubs, shared presence, and communication roadmap.

| ID  | Spec Name              | Estimate | Priority |
| --- | ---------------------- | -------- | -------- |
| 9.1 | `shared-discoveries`   | 6-8h     | Medium   |
| 9.2 | `leaderboards`         | 4-6h     | Low      |
| 9.3 | `story-sharing`        | 6-8h     | Low      |
