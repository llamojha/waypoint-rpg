# Phase 5 Final Testing Checklist

Manual cross-feature integration testing for Phase 5 gameplay systems.

## Prerequisites

1. Run automated tests first:
   ```bash
   npm run test:integration
   ```
   All tests should pass before manual testing.

2. Start dev server: `npm run dev`
3. Create fresh character or reset existing one
4. Open TurnTrace panel (terminal icon in header)

---

## Test Group A: Combat + Progression

| # | Scenario | Steps | Expected Result | Pass? |
|---|----------|-------|-----------------|-------|
| A1 | Combat starts | "I attack the wolf" (when enemy present) | `propose_combat_start` in trace, enemy appears in `activeCombat` | ☐ |
| A2 | Damage dealt | "I strike at the wolf" | Enemy HP decreases, `combat_damage` diff shown | ☐ |
| A3 | XP from combat | Complete attack (success) | Melee XP gained, shown in skill diff | ☐ |
| A4 | Level up | Gain enough XP to level | Level up notification in diffs | ☐ |
| A5 | Enemy defeat | Reduce enemy HP to 0 | Enemy removed from combat, narration describes defeat | ☐ |
| A6 | Player death | Get HP to 0 (let enemy hit you) | Respawn at Waystone with 1 HP, narration explains | ☐ |

---

## Test Group B: Equipment Effects

| # | Scenario | Steps | Expected Result | Pass? |
|---|----------|-------|-----------------|-------|
| B1 | Weapon damage | Equip weapon → attack | Weapon's damage dice used (check trace) | ☐ |
| B2 | Armor AC | Equip armor → get attacked | Defense calculation uses armor AC | ☐ |
| B3 | Skill bonus | Equip item with skill bonus → use that skill | Bonus applied to roll modifier | ☐ |

---

## Test Group C: Time Progression

| # | Scenario | Steps | Expected Result | Pass? |
|---|----------|-------|-----------------|-------|
| C1 | Turn-based advance | Play 5 turns | Time phase advances (e.g., Morning → Afternoon) | ☐ |
| C2 | Travel advance | "I travel to Nomante Outpost" | Time advances +1 phase | ☐ |
| C3 | Rest advance | "I rest and make camp" | Time advances +2 phases | ☐ |
| C4 | Day rollover | Advance from Night | Day increments, phase becomes Dawn | ☐ |

---

## Test Group D: Weather System

| # | Scenario | Steps | Expected Result | Pass? |
|---|----------|-------|-----------------|-------|
| D1 | Weather display | Check header | Weather icon + text visible | ☐ |
| D2 | Weather in narration | "I look around" | Chronicler mentions weather/atmosphere | ☐ |
| D3 | Weather consistency | Play multiple turns | Same weather throughout session (changes daily) | ☐ |

---

## Test Group E: DM Chat

| # | Scenario | Steps | Expected Result | Pass? |
|---|----------|-------|-----------------|-------|
| E1 | Ask mechanics | "What are my skills?" via DM Chat | Answer explains skill system, no turn consumed | ☐ |
| E2 | Ask lore | "Tell me about this location" via DM Chat | Answer uses world context, no turn consumed | ☐ |
| E3 | Turn count unchanged | Note turn count → ask DM → check count | Turn count identical before/after | ☐ |

---

## Test Group F: Cross-Feature Edge Cases

| # | Scenario | Steps | Expected Result | Pass? |
|---|----------|-------|-----------------|-------|
| F1 | Combat + Travel | Try to travel while in combat | Should be blocked or combat ends first | ☐ |
| F2 | Death + Inventory | Die with items equipped | Items remain equipped after respawn | ☐ |
| F3 | Rest + Combat | "I rest" while in combat | Should not advance time (combat blocks rest) | ☐ |
| F4 | XP + Power words | Use tier 1 power word at skill level 0 | No bonus (tier not unlocked until level 1) | ☐ |

---

## Execution Instructions

1. **Run automated tests first** - All must pass before manual testing

2. **For each manual test:**
   - Execute the action in the game
   - Copy trace from TurnTrace panel
   - Paste to Kiro if unexpected behavior
   - Mark pass/fail in checklist

3. **Document failures:**
   - Screenshot or trace
   - Steps to reproduce
   - Expected vs actual

---

## Completion Criteria

- [ ] All automated tests pass (`npm run test:integration`)
- [ ] Groups A-F manual tests executed
- [ ] No critical bugs (combat, death, XP)
- [ ] Minor issues documented for Phase 6

---

## Results

**Date tested:** _______________

**Tester:** _______________

**Automated tests:** ☐ Pass / ☐ Fail

**Manual tests passed:** ___ / 20

**Critical bugs found:** 

**Notes:**
