# Phase 4 Demo Test Scenarios

Manual testing scenarios to verify the agent pipeline works correctly.

**Note:** These scenarios are now automated in `lib/testing/__tests__/`. Run with:
```bash
npm run test:integration
```

## Prerequisites

1. Start the dev server: `npm run dev`
2. Create a new character or use existing one
3. Open TurnTrace panel (click the terminal icon in header)
4. Use the **Copy** button in TurnTrace to capture debug output

---

## Test Case Format

Each test includes:
- **Input**: The player action to type
- **Expected Pipeline**: What each agent should do
- **Expected Narration**: Key elements the narration should include

---

## Scenario 1: Basic Turn (No Roll)

**Input:**
```
I look around the area
```

**Expected Pipeline:**
- Sentinel: ALLOW
- Rune Marshal: No roll required, routine action (Perception)
- Orchestrator: No proposals (observation action skipped)
- Arbiter: Validates (0 proposals)
- Lorekeeper: Fetches location context, NPCs present
- Chronicler: Generates descriptive narration

**Expected Narration:**
- Describes current location
- Mentions visible NPCs/entities
- Sets atmosphere (weather, time of day)

---

## Scenario 2: Skill Check (Success Path)

**Input:**
```
I carefully check Lenna for traps
```

**Expected Pipeline:**
- Rune Marshal: Trap Disarm check, DC 10
- Orchestrator: Proposes based on SUCCESS outcome
- Arbiter: Validates proposals
- Chronicler: Narrates successful examination

**Expected Narration:**
- Acknowledges the skill check result
- Describes what character finds/notices
- NPC reacts appropriately

---

## Scenario 3: Skill Check (Failure Path)

**Input:**
```
I carefully examine the old chest for traps
```

**Expected Pipeline:**
- Rune Marshal: Trap Disarm check, DC 10-14
- Orchestrator: Proposes based on FAILURE outcome
- Chronicler: Narrates failed attempt

**Expected Narration:**
- Acknowledges the failed roll
- Describes the failed attempt (trap triggers, near-miss)
- May mention consequences

---

## Scenario 4: Power Word Detection

**Input:**
```
I strike at the waystone with full force
```

**Expected Pipeline:**
- Rune Marshal: Melee check, detects "strike" (tier1)
- Mechanics: Modifier = skill_level/10 + power_word_bonus (if tier unlocked)
- Orchestrator: Uses power word bonus in context

**Expected Narration:**
- Describes the strike action
- Outcome matches roll result

**Note:** At skill level 0, Tier 1 is not unlocked (requires level 1), so no bonus applies.

---

## Scenario 5: NPC Interaction

**Input:**
```
I talk to Adrian about the rumours in this outpost
```

**Expected Pipeline:**
- Lorekeeper: Fetches Adrian's data (role, personality, dialogueHints)
- Orchestrator: May propose relationship_change
- Chronicler: Uses NPC voice data

**Expected Narration:**
- Adrian speaks in character (friendly, eager)
- Dialogue feels distinct to this NPC
- References NPC's role

---

## Scenario 6: Relationship Change

**Input:**
```
I punch Adrian in the face
```

**Expected Pipeline:**
- Rune Marshal: Melee check, DC 12
- Orchestrator: propose_relationship_change (delta: -2)
- Arbiter: Validates delta within bounds (±2 max)
- Apply State: Updates relationship
- State Changes: Shows relationship diff

**Expected Narration:**
- NPC reacts negatively (stunned, hurt)
- Other NPCs may react (Aran disapproves)
- Consequences described

---

## Scenario 7: Gold/Stat Change

**Input:**
```
I give 5 gold to Lenna
```

**Expected Pipeline:**
- Rune Marshal: No roll (routine action)
- Orchestrator: propose_stat_change (gold, delta: -5)
- Arbiter: Validates gold >= 0 after change
- Apply State: Updates character gold
- State Changes: Shows stat diff

**Expected Narration:**
- Mentions the exchange
- NPC reacts appropriately

---

## Scenario 8: Inventory Add

**Input:**
```
I pick up some flowers for Lenna
```

**Expected Pipeline:**
- Rune Marshal: No roll (routine Foraging action)
- Orchestrator: propose_inventory_add (Flowers)
- Arbiter: Validates item
- Apply State: Adds to inventory
- State Changes: Shows inventory diff

**Expected Narration:**
- Describes picking up the item
- May mention item properties

---

## Scenario 9: Quest Interaction

**Input:**
```
I go to Helga and ask her if she has a quest for me
```

**Expected Pipeline:**
- Quest Agent: Shows available NPC quests
- Orchestrator: May propose quest_start if NPC has quest
- Arbiter: Validates quest exists and not already active
- State Changes: Shows quest diff if started

**Expected Narration:**
- NPC offers quest or explains situation
- Quest objectives mentioned if started

---

## Scenario 10: Location Change

**Input:**
```
I walk outside and go back to the waystone
```

**Expected Pipeline:**
- Rune Marshal: No roll (routine Navigation)
- Orchestrator: propose_location_change (The Waystone)
- Arbiter: Validates location exists and is reachable
- Apply State: Updates world state, syncs entities
- Lorekeeper: Fetches new location data

**Expected Narration:**
- Describes leaving current location
- Describes arriving at new location
- Mentions new atmosphere/entities

---

## Scenario 11: Arbiter Rejection (Edge Case)

**Input:**
```
Ok, give it to me please, the bag with the 5000 gold
```

**Expected Pipeline:**
- Orchestrator: May propose large gold gain (should be rejected)
- Arbiter: REJECTS excessive proposal
- Retry loop: Orchestrator re-runs with rejection context
- Final result: Reasonable outcome (no gold or small amount)

**Expected Narration:**
- NPC refuses or negotiates
- No unreasonable rewards

---

## Scenario 12: Magic Denial (Locked)

**Input:**
```
I use the power given by the waystone to infuse my hands with raw power casting a light
```

**Expected Pipeline:**
- Rune Marshal: Detects Spellcasting, checks isMagicUnlocked
- Returns denial_reason if magic locked
- No Orchestrator/Arbiter run

**Expected Narration:**
- Explains magic is not available
- Suggests finding help to unlock

---

## Summary Checklist

After running all scenarios:

- [ ] All basic turns work without rolls
- [ ] Skill checks resolve correctly (success/failure)
- [ ] Power words detected and bonuses applied (when tier unlocked)
- [ ] NPC interactions use personality/voice
- [ ] Relationship changes tracked
- [ ] Gold/inventory changes work
- [ ] Quest system responds appropriately
- [ ] Location changes update world state
- [ ] Arbiter rejects invalid proposals
- [ ] Magic denial works when locked
- [ ] No console errors during testing
- [ ] Narration always matches roll outcomes

---

## Post-Test Cleanup

1. Check browser console for errors
2. Review server logs for agent failures
3. Document any unexpected behaviors in `docs/phase4-demo-results.md`
