# Phase 5 Final Test Scenarios

Manual testing scenarios to verify all Phase 5 features work together correctly.

## Prerequisites

1. Start the dev server: `npm run dev`
2. Create a new character or use existing one
3. Open TurnTrace panel (click terminal icon in header)
4. Use **Copy** button in TurnTrace to capture debug output
5. Paste traces to Kiro for validation

---

## Test Case Format

Each test includes:
- **Input**: The player action to type
- **Expected Features**: Which Phase 5 systems should activate
- **Expected Results**: Key outcomes to verify
- **Validation**: What to check in the trace

---

## Combat System Tests

### Test 1: Equipment-Enhanced Combat

**Setup**: Equip a weapon from inventory

**Input**: "I attack the bandit with my sword"

**Expected Features**:
- Combat system: HP tracking, damage calculation
- Skill system: XP gain for Melee skill
- Inventory system: Weapon stats affect damage

**Expected Results**:
- Enemy takes damage based on weapon stats
- Player gains Melee XP (15-50 points)
- Combat narration mentions equipped weapon
- Enemy HP tracked and displayed

**Validation**:
- Check `propose_stat_change` for enemy HP reduction
- Check `skill_xp_gained` diff for Melee skill
- Verify weapon damage bonus applied

### Test 2: Combat Death Handling

**Setup**: Fight enemy until near death

**Input**: "I deliver a finishing blow"

**Expected Features**:
- Combat system: Death detection and loot drops
- Inventory system: Loot added to inventory

**Expected Results**:
- Enemy dies when HP reaches 0
- Loot drops and gets added to inventory
- Combat ends properly

**Validation**:
- Check enemy HP reaches 0
- Check `propose_inventory_add` for loot
- Verify combat state cleared

---

## World Systems Tests

### Test 3: Time Progression Effects

**Input**: "I rest until evening"

**Expected Features**:
- World systems: Time advancement
- World systems: Time affects NPC availability/behavior

**Expected Results**:
- Time advances from current phase to evening
- World description reflects time change
- NPCs may have different availability

**Validation**:
- Check `world_change` diff for time update
- Verify world context reflects new time
- Check if NPC schedules affected

### Test 4: Weather Impact on Skills

**Setup**: Ensure rainy weather (or trigger weather change)

**Input**: "I try to sneak past the guards in the rain"

**Expected Features**:
- World systems: Weather affects skill checks
- Skill system: Modified DC due to weather

**Expected Results**:
- Weather mentioned in narration
- Skill check DC modified (rain helps stealth)
- Appropriate skill XP gained

**Validation**:
- Check weather context in world state
- Verify DC adjustment in skill check
- Check `skill_xp_gained` diff

---

## DM Chat Tests

### Test 5: Information Query

**Input**: "DM: What do I know about this location?"

**Expected Features**:
- DM chat: Responds without consuming turn
- DM chat: Context-aware information

**Expected Results**:
- Response provides location information
- No turn counter increment
- No game state changes
- Seamless return to gameplay

**Validation**:
- Check no `TurnDiff` entries generated
- Verify turn counter unchanged
- Confirm response is informational only

### Test 6: Equipment Advice

**Setup**: Have multiple weapons in inventory

**Input**: "DM: Which weapon should I use against armored enemies?"

**Expected Features**:
- DM chat: Equipment analysis
- DM chat: Tactical advice

**Expected Results**:
- Advice based on current inventory
- Weapon stats comparison
- No equipment changes made

**Validation**:
- Check inventory remains unchanged
- Verify advice references actual items
- Confirm no state mutations

---

## Cross-Feature Integration Tests

### Test 7: Weather Combat Integration

**Setup**: Rainy weather + combat encounter

**Input**: "I fight the orc in the pouring rain"

**Expected Features**:
- Combat system: Damage calculation
- World systems: Weather affects combat
- Skill system: XP with weather modifiers

**Expected Results**:
- Weather impacts combat (visibility, footing)
- Skill checks modified appropriately
- Combat narration includes weather effects

**Validation**:
- Check weather context in combat resolution
- Verify skill check modifiers applied
- Check narration mentions weather

### Test 8: Skill Progression Affecting World

**Setup**: High-level skill (e.g., Perception 15+)

**Input**: "I examine the ancient ruins"

**Expected Features**:
- Skill system: High skill level provides bonuses
- World systems: Skill level unlocks new discoveries
- Inventory system: Skill-gated items found

**Expected Results**:
- High skill reveals hidden details
- Possible discovery of secret areas/items
- Skill-appropriate narration depth

**Validation**:
- Check skill level used in DC calculation
- Verify skill-gated content unlocked
- Check for discovery-related diffs

### Test 9: Time-Sensitive Equipment Usage

**Setup**: Evening/night time + stealth equipment

**Input**: "I use my cloak to blend into the shadows"

**Expected Features**:
- World systems: Time affects stealth effectiveness
- Inventory system: Equipment provides bonuses
- Skill system: Combined modifiers

**Expected Results**:
- Time bonus + equipment bonus stacked
- Stealth check with multiple modifiers
- Narration reflects both time and equipment

**Validation**:
- Check multiple modifier sources
- Verify time context affects skill check
- Check equipment bonus applied

---

## Validation Checklist

After running all tests, verify:

### Combat System ✅
- [ ] HP tracking works correctly
- [ ] Weapon stats affect damage
- [ ] Death handling functions
- [ ] Loot drops properly

### World Systems ✅
- [ ] Time progression works
- [ ] Weather affects gameplay
- [ ] Location changes tracked
- [ ] World state persists

### DM Chat ✅
- [ ] No turn consumption
- [ ] Context-aware responses
- [ ] No state mutations
- [ ] Smooth gameplay transition

### Skill System Integration ✅
- [ ] XP gained from all activities
- [ ] Skill levels affect world interactions
- [ ] Power words work in all contexts
- [ ] Level-up notifications appear

### Cross-Feature Integration ✅
- [ ] Multiple systems work together
- [ ] No conflicts between features
- [ ] Modifiers stack correctly
- [ ] Narration reflects all active systems

---

## 🎮 CHECKPOINT 4 Criteria

Verify all criteria met:

- [ ] Combat tracks enemy HP
- [ ] Death/incapacitation handling
- [ ] Quest log UI with progress tracking
- [ ] NPC dialogue reflects relationship level
- [ ] Time progresses (day/phase changes)
- [ ] Weather affects gameplay
- [ ] DM chat answers questions without turns

---

## Kiro Validation Process

1. **Execute each test scenario**
2. **Copy trace from TurnTrace panel**
3. **Paste to Kiro with prompt**:
   ```
   Please validate this Phase 5 test trace:
   
   Test: [Test Name]
   Expected: [Expected behavior]
   
   [PASTE TRACE HERE]
   
   Does this trace show the expected Phase 5 features working correctly?
   ```
4. **Document any issues found**
5. **Retest after fixes**
