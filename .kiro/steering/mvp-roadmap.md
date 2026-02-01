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
🎮 DEMO READY
         ↓
Phase 4: Agent Pipeline                [~20-28 hours]  — 7 specs ✅ COMPLETE
         ↓
🎮 CHECKPOINT 3: Full agent architecture!
         ↓
Phase 5: Gameplay Systems              [~31-43 hours]  — 7 specs ✅ COMPLETE
         ↓
🎮 CHECKPOINT 4: Full gameplay systems!
         ↓
Phase 6: Final Polish                  [~8-12 hours]   — 3 specs ✅ COMPLETE
         ↓
🎮 MVP COMPLETE ← YOU ARE HERE         [Total: ~93-132 hours]
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

**4.6 `constrained-orchestrator`** ✅ COMPLETE
- See `docs/phase-4.5-constrained-orchestrator.md` for full spec
- Fixed state synchronization bug
- Enhanced Rune Marshal to output `action_type`
- Created proposal constraint layer (action_type → allowed_tools)
- Refactored Orchestrator to receive dynamic tool list
- Wired together in route.ts
- Handled edge cases (mixed actions, ambiguous actions)

**4.7 `phase4-final-testing`** ✅ COMPLETE
- Manual testing completed
- Verified: conversation → 0 proposals
- Verified: travel → only location_change
- Verified: interaction → only relationship_change
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
- [x] State sync bug fixed (agents receive fresh data)
- [x] Rune Marshal outputs action_type
- [x] Orchestrator receives constrained tools per action_type
- [x] Conversation actions produce 0 proposals
- [x] NPCs appear correctly at their locations
- [x] Invalid location changes rejected
- [x] 50+ turns without invalid proposals

### Phase 5: Gameplay Systems ✅ COMPLETE

| ID  | Spec Name              | Status      |
| --- | ---------------------- | ----------- |
| 5.0 | `automated-testing`    | ✅ COMPLETE |
| 5.1 | `inventory-equipment`  | ✅ COMPLETE |
| 5.2 | `skill-system`         | ✅ COMPLETE |
| 5.3 | `combat-system`        | ✅ COMPLETE |
| 5.4 | `world-systems`        | ✅ COMPLETE |
| 5.5 | `dm-chat`              | ✅ COMPLETE |
| 5.6 | `phase5-final-testing` | ✅ COMPLETE |

**5.0 `automated-testing`** ✅ COMPLETE
- Created `lib/testing/` framework with executeTurn, validateTrace, validateWithGemini
- Three validation modes: deterministic (default), Gemini QA (--gemini-qa), Kiro mode (steering doc)
- First integration test: "I look around" scenario
- CI configured with manual trigger (workflow_dispatch)
- Kiro steering doc at `.kiro/prompts/test-mode.md`

**5.1 `inventory-equipment`** ✅ COMPLETE
- Equip/unequip items from inventory UI
- Item stats affect combat (weapon damage, armor AC)

**5.2 `skill-system`** ✅ COMPLETE
- OSRS-based XP formula with level progression
- XP awarded after skill checks (success: 15-50, failure: 5-15)
- Power word tier bonus (+5 per tier)
- Diminishing returns for anti-grinding (variety bonus +10%, floor 30%)
- Level-up notifications via TurnDiff
- Unit tests (19) and integration tests (4)

**5.3 `combat-system`** ✅ COMPLETE
- Enemy templates from medieval-realistic bestiary (14 enemies, 6 tiers)
- Session-scoped enemy HP tracking in `world.activeCombat`
- `propose_combat_start` tool for spawning enemies
- `propose_combat_damage` tool for dealing damage
- Soft death: player respawns at Waystone with 1 HP
- Chronicler narrates enemy HP status and defeat
- Unit tests (15) and integration tests (5)

**5.4 `world-systems`** ✅ COMPLETE
- Global weather system (shared across all players per region)
- 8 weather types: Clear, Cloudy, Rain, Storm, Foggy, Snow, Wind, Heatwave
- Weather schedule pre-generated weekly with logical transitions
- Personal time progression (Dawn → Morning → High Sun → Dusk → Night)
- Time advances every 5 turns, or on travel (+1 phase), or rest (+2 phases)
- Header UI shows weather icon + text
- Chronicler narrates weather atmosphere
- Unit tests (31) and integration tests (3)

**5.5 `dm-chat`** ✅ COMPLETE
- "Ask DM" button next to Send in CenterColumn
- Modal UI for asking questions (DmChatModal component)
- `/api/dm-chat` endpoint with full game context
- Answers meta questions (mechanics, rules) and in-world questions (lore, location)
- No turn consumption - ephemeral responses
- Question length validation (500 char limit)
- Unit tests (11) and integration tests (4)

**5.6 `phase5-final-testing`** ✅ COMPLETE
- Manual test checklist created (`docs/phase5-final-testing.md`)
- DM fix tools implemented (check_state_consistency, fix_character_state, fix_world_state, explain_state)
- All 283 unit tests pass
- All integration tests pass (including 7 DM chat tests)
- DM can detect/fix state inconsistencies, refuses invalid requests

**🎮 CHECKPOINT 4**: Full gameplay systems.

#### Checkpoint 4 Checklist:
- [x] Automated tests passing in CI
- [x] Equip/unequip items from inventory UI
- [x] Item stats affect combat (weapon damage, armor AC)
- [x] Skills gain XP from use
- [x] Skill level ups with notifications
- [x] Power words unlock at skill thresholds
- [x] Combat tracks enemy HP
- [x] Death/incapacitation handling
- [ ] Quest log UI with progress tracking
- [ ] NPC dialogue reflects relationship level
- [x] Time progresses (day/phase changes)
- [x] Weather affects gameplay
- [x] DM chat answers questions without turns
- [x] DM fix tools for state consistency

### Phase 6: Final Polish ✅ COMPLETE

| ID  | Spec Name                  | Status      |
| --- | -------------------------- | ----------- |
| 6.1 | `conversation-compression` | ✅ COMPLETE |
| 6.2 | `mvp-polish`               | ✅ COMPLETE |
| 6.3 | `e2e-testing`              | ✅ COMPLETE |

**🎮 MVP COMPLETE**

#### MVP Checklist:
- [x] No critical bugs in 100-turn playthrough
- [x] Error states handled gracefully
- [x] Loading states feel polished
- [x] Mobile experience smooth
- [x] Performance acceptable (<3s turn response)
- [x] All UI elements accessible
- [x] Edge cases handled (empty inventory, 0 HP, etc.)
- [x] Auth on all API endpoints verified
- [x] RLS policies reviewed
- [x] E2E tests pass for demo path
- [x] E2E tests validate edge cases

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
    4.6 constrained-orchestrator ✅
         │
         ▼
    4.7 phase4-final-testing ✅
         │
    🎮 CHECKPOINT 3
         │
         ▼
    5.0 automated-testing ✅ (gate)
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

MVP is complete! See `docs/v1-roadmap.md` for post-MVP phases (7-9).

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

> **See `docs/v1-roadmap.md`** for V1 extensions (Phases 7-9) including:
> - Phase 7: User Experience & Polish (mobile, accessibility, performance)
> - Phase 8: Content & World (interactive map, achievements, world events, content seeding)
> - Phase 9: Production Readiness (analytics, rate limiting)
