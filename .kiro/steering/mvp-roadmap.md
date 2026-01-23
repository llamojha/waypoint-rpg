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

### Phase 4: Agent Pipeline ✅ COMPLETE

| ID  | Spec Name                  | Status      |
| --- | -------------------------- | ----------- |
| 4.1 | `orchestrator-arbiter`     | ✅ COMPLETE |
| 4.2 | `lorekeeper`               | ✅ COMPLETE |
| 4.3 | `agent-pipeline`           | ✅ COMPLETE |
| 4.4 | `quest-agent`              | ✅ COMPLETE |
| 4.5 | `rules-engine`             | ✅ COMPLETE |
| 4.6 | `constrained-orchestrator` | ✅ COMPLETE |
| 4.7 | `phase4-final-testing`     | ✅ COMPLETE |

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

**4.5 `rules-engine`** ✅ COMPLETE
- Created Rules Engine with DB-backed rules and caching
- Quest goal validation (exploration requires location_change, etc.)
- Skill check patterns and DC ranges
- Relationship delta bounds
- Location travel graph
- Loot tables by location type
- Integrated into Arbiter for proposal validation
- Issues discovered during testing → led to Phase 4.6

**4.6 `constrained-orchestrator`** 📋 TODO
- See `docs/phase-4.5-constrained-orchestrator.md` for full spec
- Fix state synchronization bug (audit awaits, add debouncing)
- Enhance Rune Marshal to output `action_type`
- Create proposal constraint layer (action_type → allowed_tools)
- Refactor Orchestrator to receive dynamic tool list
- Wire together in route.ts
- Handle edge cases (mixed actions, ambiguous actions)
- Estimate: ~8 hours

**4.7 `phase4-final-testing`** 📋 TODO
- Re-run manual testing after constrained orchestrator
- Verify: conversation → 0 proposals
- Verify: travel → only location_change
- Verify: interaction → only relationship_change
- 20+ turns without invalid proposals

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
- [ ] State sync bug fixed (agents receive fresh data)
- [ ] Rune Marshal outputs action_type
- [ ] Orchestrator receives constrained tools per action_type
- [ ] Conversation actions produce 0 proposals
- [ ] NPCs appear correctly at their locations
- [ ] Invalid location changes rejected
- [ ] 50+ turns without invalid proposals

### Phase 5: Gameplay Systems (Current)

**CURRENT TASK: 5.1 `inventory-equipment`**

| ID  | Spec Name             | Status      |
| --- | --------------------- | ----------- |
| 5.0 | `automated-testing`   | ✅ COMPLETE |
| 5.1 | `inventory-equipment` | 📋 TODO     |
| 5.2 | `skill-system`        | 📋 TODO     |
| 5.3 | `combat-system`       | 📋 TODO     |
| 5.4 | `world-systems`       | 📋 TODO     |
| 5.5 | `dm-chat`             | 📋 TODO     |

**5.0 `automated-testing`** ✅ COMPLETE
- Created `lib/testing/` framework with executeTurn, validateTrace, validateWithGemini
- Three validation modes: deterministic (default), Gemini QA (--gemini-qa), Kiro mode (steering doc)
- First integration test: "I look around" scenario
- CI configured with manual trigger (workflow_dispatch)
- Kiro steering doc at `.kiro/prompts/test-mode.md`

**IMPORTANT: All future specs must include integration tests.** See "Testing Requirements" section below.

**🎮 CHECKPOINT 4**: Full gameplay systems.

#### Checkpoint 4 Checklist:
- [x] Automated tests passing in CI
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
    4.5 rules-engine ✅
         │
         ▼
    4.6 constrained-orchestrator 📋
         │
         ▼
    4.7 phase4-final-testing
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

1. **4.6 `constrained-orchestrator`** - Fix state sync + constrain Orchestrator tools
2. **4.7 `phase4-final-testing`** - Re-run manual testing after fixes
3. Start 5.0 `automated-testing` - CI pipeline for turn tests
4. Phase 5 gameplay specs can run in parallel after testing gate

1. Start Phase 5 gameplay specs (5.1-5.5 can run in parallel)
2. Each spec must include integration tests

---

## Testing Requirements

**All future specs MUST include integration tests.** This is enforced starting from Phase 5.

### Adding Tests for New Features

1. **Create test scenario** in `lib/testing/__tests__/`
2. **Add expectations** to `lib/testing/validate.ts` if needed
3. **Document scenario** in `docs/phase4-demo-testing.md`
4. **Run tests** with `npm run test:integration`

### Test Structure

```typescript
import { resetJourney, executeTurn, validateTrace, TEST_CONFIG } from "@/lib/testing";

describe("Feature: Your Feature", () => {
  let characterId: string;

  beforeAll(async () => {
    const result = await resetJourney(getTestUserId());
    characterId = result.characterId;
  }, TEST_CONFIG.turnTimeout);

  it("should do the thing", async () => {
    const result = await executeTurn(characterId, "player action");
    
    // Assert on traces, diffs, narration
    expect(result.narration).toBeTruthy();
    expect(result.diffs.some(d => d.type === "expected_type")).toBe(true);
  }, TEST_CONFIG.turnTimeout);
});
```

### Validation Modes

- **Deterministic** (default): Code assertions on trace structure
- **Gemini QA** (`--gemini-qa`): LLM evaluates narration quality
- **Kiro mode**: Interactive evaluation via `.kiro/prompts/test-mode.md`

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
