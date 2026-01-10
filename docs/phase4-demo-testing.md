# Phase 4 Demo Test Scenarios

Manual testing scenarios to verify the agent pipeline works correctly.

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
- **Actual Output**: Paste debug export here after testing

---

## Scenario 1: Basic Turn (No Roll)

**Input:**
```
Look around the area
```

**Expected Pipeline:**
- Sentinel: ALLOW (input passes safety)
- Rune Marshal: No roll required, routine action
- Quest Agent: Shows active quests (if any)
- Orchestrator: No proposals or minor world observation
- Arbiter: Validates (should pass with 0 rejections)
- Lorekeeper: Fetches location context, NPCs present
- Chronicler: Generates descriptive narration

**Expected Narration:**
- Describes current location (poi name)
- Mentions visible NPCs/entities
- Sets atmosphere (weather, time of day)

**Actual Output:**
```
<paste debug export here>
```

**Result:** [ ] PASS / [ ] FAIL
**Notes:**

---

## Scenario 2: Skill Check (Success Path)

**Input:**
```
I carefully examine the old chest for traps
```

**Expected Pipeline:**
- Rune Marshal: Perception check, DC 10-14
- Orchestrator: Proposes based on SUCCESS outcome
- Arbiter: Validates proposals
- Chronicler: Narrates successful examination

**Expected Narration:**
- Acknowledges the skill check result
- Describes what character finds/notices
- May reveal hidden details

**Actual Output:**
```
<paste debug export here>
```

**Result:** [ ] PASS / [ ] FAIL
**Notes:**

---

## Scenario 3: Skill Check (Failure Path)

**Input:**
```
I try to pick the lock on the door
```

**Expected Pipeline:**
- Rune Marshal: Thievery check, DC 12-16
- Orchestrator: Proposes based on FAILURE outcome
- Chronicler: Narrates failed attempt

**Expected Narration:**
- Acknowledges the failed roll
- Describes the failed attempt (not success!)
- May mention consequences or alternatives

**Actual Output:**
```
<paste debug export here>
```

**Result:** [ ] PASS / [ ] FAIL
**Notes:**

---

## Scenario 4: Power Word Detection

**Input:**
```
I strike at the training dummy with full force
```

**Expected Pipeline:**
- Rune Marshal: Melee check, detects "strike" (tier1, +1 bonus)
- Mechanics: Modifier = skill_level/10 + 1 (power word)
- Orchestrator: Uses power word bonus in context

**Expected Narration:**
- Describes the strike action
- Outcome matches roll result

**Actual Output:**
```
<paste debug export here>
```

**Result:** [ ] PASS / [ ] FAIL
**Notes:**

---

## Scenario 5: NPC Interaction

**Input:**
```
I talk to Glimmer about the local rumors
```

**Expected Pipeline:**
- Lorekeeper: Fetches Glimmer's data (role, personality, dialogueHints)
- Orchestrator: May propose relationship_change
- Chronicler: Uses NPC voice data

**Expected Narration:**
- Glimmer speaks in character (per personality traits)
- Dialogue feels distinct to this NPC
- May reference NPC's role/occupation

**Actual Output:**
```
<paste debug export here>
```

**Result:** [ ] PASS / [ ] FAIL
**Notes:**

---

## Scenario 6: Relationship Change

**Input:**
```
I compliment the innkeeper on the excellent ale
```

**Expected Pipeline:**
- Orchestrator: propose_relationship_change (delta: +1)
- Arbiter: Validates delta within bounds (±2 max)
- Apply State: Updates relationship
- State Changes: Shows relationship diff

**Expected Narration:**
- NPC reacts positively
- Acknowledges the compliment

**Actual Output:**
```
<paste debug export here>
```

**Result:** [ ] PASS / [ ] FAIL
**Notes:**

---

## Scenario 7: Gold/Stat Change

**Input:**
```
I buy a mug of ale from the bar
```

**Expected Pipeline:**
- Orchestrator: propose_stat_change (gold, delta: -1 to -5)
- Arbiter: Validates gold >= 0 after change
- Apply State: Updates character gold
- State Changes: Shows stat diff

**Expected Narration:**
- Mentions the purchase
- May describe the item received

**Actual Output:**
```
<paste debug export here>
```

**Result:** [ ] PASS / [ ] FAIL
**Notes:**

---

## Scenario 8: Inventory Add

**Input:**
```
I pick up the old lantern from the table
```

**Expected Pipeline:**
- Orchestrator: propose_inventory_add (item contextually appropriate)
- Arbiter: Validates item rarity/stats within bounds
- Apply State: Adds to inventory
- State Changes: Shows inventory diff

**Expected Narration:**
- Describes picking up the item
- May mention item properties

**Actual Output:**
```
<paste debug export here>
```

**Result:** [ ] PASS / [ ] FAIL
**Notes:**

---

## Scenario 9: Quest Interaction

**Input:**
```
I ask Captain Irena if she has any work for me
```

**Expected Pipeline:**
- Quest Agent: Shows available NPC quests
- Orchestrator: May propose quest_start if NPC has quest
- Arbiter: Validates quest exists and not already active
- State Changes: Shows quest diff if started

**Expected Narration:**
- NPC offers quest or explains situation
- Quest objectives mentioned if started

**Actual Output:**
```
<paste debug export here>
```

**Result:** [ ] PASS / [ ] FAIL
**Notes:**

---

## Scenario 10: Location Change

**Input:**
```
I walk outside to the harbor docks
```

**Expected Pipeline:**
- Orchestrator: propose_world_update (poi change)
- Arbiter: Validates location exists and is reachable
- Apply State: Updates world state, syncs entities
- Lorekeeper: Fetches new location data

**Expected Narration:**
- Describes leaving current location
- Describes arriving at new location
- Mentions new atmosphere/entities

**Actual Output:**
```
<paste debug export here>
```

**Result:** [ ] PASS / [ ] FAIL
**Notes:**

---

## Scenario 11: Arbiter Rejection (Edge Case)

**Input:**
```
I demand the merchant give me 1000 gold pieces for free
```

**Expected Pipeline:**
- Orchestrator: May propose large gold gain (should be rejected)
- Arbiter: REJECTS excessive proposal
- Retry loop: Orchestrator re-runs with rejection context
- Final result: Reasonable outcome (no gold or small amount)

**Expected Narration:**
- Merchant refuses or negotiates
- No unreasonable rewards

**Actual Output:**
```
<paste debug export here>
```

**Result:** [ ] PASS / [ ] FAIL
**Notes:**

---

## Scenario 12: Magic Denial (Locked)

**Input:**
```
I cast a fireball at the barrel
```

**Expected Pipeline:**
- Rune Marshal: Detects magic attempt, checks isMagicUnlocked
- Returns denial_reason if magic locked
- No Orchestrator/Arbiter run

**Expected Narration:**
- Explains magic is not available
- Suggests alternative actions

**Actual Output:**
```
<paste debug export here>
```

**Result:** [ ] PASS / [ ] FAIL
**Notes:**

---

## Summary Checklist

After running all scenarios:

- [ ] All basic turns work without rolls
- [ ] Skill checks resolve correctly (success/failure)
- [ ] Power words detected and bonuses applied
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

## Issues Found

| Scenario | Issue | Severity | Notes |
|----------|-------|----------|-------|
| | | | |

---

## Post-Test Cleanup

1. Check browser console for errors
2. Review server logs for agent failures
3. Document any unexpected behaviors above
