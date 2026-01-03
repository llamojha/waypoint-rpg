# Demo Experience - Tasks

## Task Breakdown

### Phase 1: Decisions & Seed Data

#### Task 1.1: Finalize Design Decisions

- [ ] Confirm waystone as starting point mechanism
- [ ] Confirm "Crossroads Inn" as starting location name
- [ ] Confirm 3 starter NPCs (Marta, Garrett, Sela)
- [ ]3 starter quests
- [ ] Decide free-tier model (recommend: area-based)

#### Task 1.2: Create Database Seed Script

- [ ] Create `supabase/seed.sql` with:
  - [ ] Starter locations (5)
  - [ ] Starter NPCs (3)
  - [ ] Starter quests (3)
  - [ ] Initial world news (2)
  - [ ] Enemy templates for tutorial (rats, wolves, bandits)
- [ ] Test seed script runs without errors
- [ ] Document seed data in README

#### Task 1.3: Create Seed Data Constants

- [ ] Add `SEED_LOCATIONS` to constants.ts
- [ ] Add `SEED_NPCS` to constants.ts
- [ ] Add `SEED_QUESTS` to constants.ts
- [ ] Add `OPENING_NARRATION` template
- [ ] Add `OPENING_SUGGESTED_ACTIONS`

---

### Phase 2: Character Creation → First Turn

#### Task 2.1: Update Character Creation Flow

- [ ] Remove race selection (humans only)
- [ ] Simplify to: Name → Description → Portrait → Confirm
- [ ] Add portrait generation integration
- [ ] Add loading state during portrait generation
- [ ] Handle portrait generation failure gracefully

#### Task 2.2: Implement First Turn Initialization

- [ ] Create `initializeNewGame()` function
- [ ] Set initial world state (Crossroads Inn)
- [ ] Set initial time (Day 1, Morning)
- [ ] Add starter NPCs to world entities
- [ ] Create opening turn with narration

#### Task 2.3: Opening Narration

- [ ] Create opening narration template
- [ ] Integrate with Chronicler for variations (optional)
- [ ] Display suggested actions as clickable chips
- [ ] Ensure narration displays before player can act

---

### Phase 3: Starter NPCs

#### Task 3.1: NPC Interaction System

- [ ] Implement "Talk to [NPC]" action handling
- [ ] Create NPC dialogue generation via Chronicler
- [ ] Track NPC relationship changes
- [ ] Display NPC info in left column when interacting

#### Task 3.2: Marta (Innkeeper)

- [ ] Pre-seed Marta NPC data
- [ ] Implement cellar quest offer dialogue
- [ ] Implement quest completion dialogue
- [ ] Track relationship progression

#### Task 3.3: Old Garrett (Traveler)

- [ ] Pre-seed Garrett NPC data
- [ ] Implement rumor dialogue (forest cache)
- [ ] Implement wolf warning dialogue
- [ ] Add drunk personality flavor

#### Task 3.4: Sela (Merchant)

- [ ] Pre-seed Sela NPC data
- [ ] Implement shop interface (basic)
- [ ] Implement missing merchant quest hook
- [ ] Track relationship for escort quest

---

### Phase 4: Starter Quests

#### Task 4.1: Quest System Integration

- [ ] Implement quest acceptance flow
- [ ] Implement quest progress tracking
- [ ] Implement quest completion flow
- [ ] Display active quests in left column

#### Task 4.2: "Cellar Trouble" Quest

- [ ] Create cellar as sub-location of inn
- [ ] Spawn 3-4 rats when entering cellar
- [ ] Track rat kills as quest progress
- [ ] Trigger completion when all rats dead
- [ ] Award: 10 gold, +1 Marta relationship

#### Task 4.3: "The Forest Path" Quest

- [ ] Create forest exploration flow
- [ ] Implement trail-finding (Tracking check)
- [ ] Create Hunter's Cache location
- [ ] Award: 25 gold, Hunter's Bow, location discovery

#### Task 4.4: "The Missing Merchant" Quest

- [ ] Create east road exploration
- [ ] Implement clue discovery (Investigation check)
- [ ] Create bandit encounter
- [ ] Multiple resolution paths (fight, negotiate, sneak)
- [ ] Award: 50 gold, reputation

---

### Phase 5: Tutorial Combat

#### Task 5.1: Rat Combat (Tutorial)

- [ ] Spawn rats with trivial stats
- [ ] Implement basic attack flow
- [ ] Show damage numbers in narration
- [ ] Track enemy HP in world state
- [ ] Award XP on kill

#### Task 5.2: Wolf Combat (Easy)

- [ ] Spawn wolves in forest
- [ ] Implement pack behavior (multiple enemies)
- [ ] Higher damage, requires strategy
- [ ] Fleeing option available

#### Task 5.3: Bandit Combat (Medium)

- [ ] Spawn bandits on east road
- [ ] Implement humanoid combat
- [ ] Dialogue option before combat
- [ ] Loot drops (gold, items)

---

### Phase 6: Polish & Testing

#### Task 6.1: Demo Flow Testing

- [ ] Test complete 20-turn scenario
- [ ] Verify all quests completable
- [ ] Verify combat works correctly
- [ ] Verify XP/progression works
- [ ] Fix any blocking bugs

#### Task 6.2: Opening Experience Polish

- [ ] Refine opening narration
- [ ] Add atmospheric details
- [ ] Ensure smooth character creation → game transition
- [ ] Add loading states where needed

#### Task 6.3: Error Handling

- [ ] Handle agent failures gracefully
- [ ] Fallback narration for errors
- [ ] Retry mechanisms for transient failures
- [ ] User-friendly error messages

---

## Dependencies

```
Task 1.1 ──► Task 1.2 ──► Task 1.3
                │
                ▼
Task 2.1 ──► Task 2.2 ──► Task 2.3
                │
                ▼
        ┌───────┴───────┐
        ▼               ▼
    Phase 3         Phase 4
    (NPCs)          (Quests)
        │               │
        └───────┬───────┘
                ▼
            Phase 5
            (Combat)
                │
                ▼
            Phase 6
            (Polish)
```

## Estimates

| Phase     | Tasks  | Estimate        |
| --------- | ------ | --------------- |
| Phase 1   | 3      | 2-3 hours       |
| Phase 2   | 3      | 4-6 hours       |
| Phase 3   | 4      | 4-6 hours       |
| Phase 4   | 4      | 6-8 hours       |
| Phase 5   | 3      | 4-6 hours       |
| Phase 6   | 3      | 3-4 hours       |
| **Total** | **20** | **23-33 hours** |

## Definition of Done

- [ ] New player can create character and enter world
- [ ] Opening narration displays correctly
- [ ] All 3 starter NPCs are interactable
- [ ] At least 1 quest is completable end-to-end
- [ ] Combat works with rats (tutorial)
- [ ] 20-turn demo scenario passes without errors
- [ ] No critical bugs in happy path
