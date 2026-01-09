# Phase 4 Demo Test Scenarios

Manual testing scenarios to verify the agent pipeline works correctly.

## Prerequisites

1. Start the dev server: `npm run dev`
2. Create a new character or use existing one
3. Open TurnTrace panel (click the terminal icon in header)

---

## Scenario 1: Basic Turn (No Roll)

**Action:** "Look around the area"

**Expected:**
- Rune Marshal: No roll required (routine action)
- Orchestrator: Processes action, no skill check
- Arbiter: Validates proposals (should pass)
- Chronicler: Generates descriptive narration
- TurnTrace: Shows all agent sections with data

**Verify:**
- [ ] Narration describes the current location
- [ ] No dice roll UI appears
- [ ] TurnTrace shows "State Context" with location info
- [ ] TurnTrace shows "Orchestrator" with player action

---

## Scenario 2: Skill Check (Roll Required)

**Action:** "I sneak past the guards quietly"

**Expected:**
- Rune Marshal: Detects Sneaking skill, sets DC
- Roll UI appears with modifier
- After roll: Orchestrator proposes based on outcome
- Arbiter validates
- Chronicler narrates success/failure

**Verify:**
- [ ] Roll button appears
- [ ] TurnTrace shows "Rune Marshal" with skill and DC
- [ ] After roll, TurnTrace shows rolled value and outcome
- [ ] Narration matches roll outcome (success/failure)

---

## Scenario 3: Power Word Detection

**Action:** "I strike at the goblin with my dagger"

**Expected:**
- Rune Marshal: Detects "strike" (Melee tier1, +1 bonus)
- Modifier includes power word bonus
- Roll resolves with bonus applied

**Verify:**
- [ ] Modifier shows skill level + power word bonus
- [ ] TurnTrace shows detected power word in Orchestrator section

---

## Scenario 4: State Changes (Diffs)

**Action:** "I buy a healing potion from the merchant" (if merchant present)
OR "I pick up the rusty key" (if item available)

**Expected:**
- Orchestrator proposes inventory_add or stat_change
- Arbiter validates item/gold change
- Apply State updates character
- Chronicler mentions the change

**Verify:**
- [ ] TurnTrace "State Changes" section shows diff
- [ ] Character inventory/gold updates in UI
- [ ] Narration acknowledges the change

---

## Scenario 5: NPC Interaction

**Action:** "I talk to Captain Irena about the missing patrol"

**Expected:**
- Lorekeeper fetches NPC data
- Orchestrator may propose relationship change
- Chronicler uses NPC voice/personality

**Verify:**
- [ ] TurnTrace "Lorekeeper" shows entities present
- [ ] Narration reflects NPC personality
- [ ] If relationship changes, diff appears

---

## Scenario 6: Quest Context

**Action:** "I search the cellar for clues about the missing patrol"

**Expected:**
- Quest Agent provides active quest context
- Orchestrator sees "The Silent Tower" quest is active
- May propose quest_progress if action matches goal

**Verify:**
- [ ] TurnTrace "Quest Agent" shows active status
- [ ] If quest progresses, diff shows quest update
- [ ] Narration may reference quest objective

---

## Scenario 7: Arbiter Rejection (Edge Case)

**Action:** Try to trigger an invalid proposal (e.g., gain 1000 gold)

**Expected:**
- Arbiter rejects excessive proposal
- Retry loop re-runs Orchestrator
- Final result is reasonable

**Verify:**
- [ ] No excessive gold/item gains
- [ ] Game state remains consistent

---

## Scenario 8: Location Change

**Action:** "I travel to the Ash Coast Outpost"

**Expected:**
- Orchestrator proposes world_update
- Arbiter validates location exists
- World state updates

**Verify:**
- [ ] World panel shows new location
- [ ] TurnTrace "State Context" updates
- [ ] Narration describes arrival

---

## TurnTrace Verification Checklist

For each scenario, verify TurnTrace shows:

- [ ] **State Context**: Location, time, weather
- [ ] **Rune Marshal**: Skill, DC (if roll required)
- [ ] **Orchestrator**: Player action, roll result (if applicable)
- [ ] **Arbiter**: Validation status, proposal count
- [ ] **Lorekeeper**: Location, entity count
- [ ] **Quest Agent**: Active status
- [ ] **State Changes**: Any diffs from the turn

---

## Known Issues to Watch For

1. **Context overflow**: After 50+ turns, check for degraded responses
2. **NPC voice**: Verify NPCs speak consistently with personality
3. **Quest tracking**: Ensure quest progress persists across turns
4. **Retry loop**: If Arbiter rejects, verify retry doesn't loop infinitely

---

## Post-Test Cleanup

1. Check browser console for errors
2. Review server logs for any agent failures
3. Note any unexpected behaviors for bug tracking
