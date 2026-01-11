# Phase 4 Demo Test Results

Testing completed: 2026-01-11

## Summary

| Category | Count |
|----------|-------|
| Scenarios Tested | 12 |
| Passed | 11 |
| Needs Retest | 1 |
| Failed | 0 |
| Issues Fixed | 18 |

---

## Scenario Results

### Scenario 1: Basic Turn (No Roll) ✅ PASS

**Input:** `I look around the area`

**Result:** Pipeline correctly skipped Orchestrator proposals for observation action. Lorekeeper fetched correct location and NPCs. Chronicler generated appropriate narration without meta terms.

---

### Scenario 2: Skill Check (Success) ✅ PASS

**Input:** `I carefully check the outpost for traps`

**Result:** Rune Marshal detected Trap Disarm check (DC 12). Roll succeeded. Narration reflected success.

---

### Scenario 3: Skill Check (Failure) ✅ PASS

**Input:** `I carefully examine the old chest for traps`

**Result:** Rune Marshal detected Trap Disarm check. Roll failed. Narration described failure appropriately.

---

### Scenario 4: Power Word Detection ✅ PASS

**Input:** `I strike at the training dummy with full force`

**Result:** Rune Marshal detected "strike" power word (Melee, Tier 1). Power word correctly identified.

---

### Scenario 5: NPC Interaction ✅ PASS

**Input:** `I talk to Adrian about the rumours in this outpost`

**Result:** Quest Agent detected "Adrian" from action and found available quest. Relationship change applied (Adrian +1). Dialogue felt in-character.

---

### Scenario 6: Relationship Change ✅ PASS

**Input:** `I punch Adrian in the face`

**Result:** Melee check triggered. Relationship change applied appropriately. NPCs reacted to the action.

---

### Scenario 7: Gold/Stat Change ✅ PASS

**Input:** `I give 5 gold to Helga`

**Result:** Gold change applied (-5). Relationship change applied (+1). No roll required for routine action.

---

### Scenario 8: Inventory Add ✅ PASS

**Input:** `I pick up some flowers`

**Result:** Inventory add approved. No roll required. Item gained correctly.

---

### Scenario 9: Quest Interaction ✅ PASS

**Input:** `I go to Adrian and I ask him if he has a job for me`

**Result:** Quest Agent found Adrian's quest ("The Boar Hunt"). Quest start approved by Arbiter (matched by title). Quest started and relationship +1 applied.

---

### Scenario 10: Location Change ⚠️ NEEDS RETEST

**Input:** `I walk outside and go back to the waystone`

**Result:** Orchestrator proposed wrong destination (current location instead of waystone). Prompt fix applied to clarify destination vs current location.

**Fix Applied:** Strengthened location_change prompt to explicitly state destination must differ from current location and to match partial names.

---

### Scenario 11: Arbiter Rejection (Gold Exploit) ✅ PASS

**Input:** `I've found a bag full of gold, around 5000 gold coins`

**Result:** Gold gain capped from 5000 to 20 (found_loot cap). GOLD_BOUNDS validation working correctly.

**Additional Fix:** Strengthened Orchestrator prompt to reject player claims without valid in-world source.

---

### Scenario 12: Magic Denial ✅ PASS

**Input:** `I cast a fireball`

**Result:** Rune Marshal detected Spellcasting. Magic locked check triggered. Pipeline returned denial message suggesting finding help to unlock magic.

---

## Fixes Applied During Testing

### Critical Fixes
1. **Content Sentinel LLM Classification** - Added Gemini-based input classification with soft redirects
2. **Gold Economy Validation** - Added GOLD_BOUNDS with source-based caps (combat: 25, quest: 100, gift: 5, found: 20, hard cap: 100)
3. **NPC Location Validation** - Strengthened prompts to only reference NPCs present at location

### High Priority Fixes
4. **Rune Marshal Intent Improvements** - Expanded no-roll rules for social interactions with friendly NPCs
5. **HP Loss Validation** - Added validateHpLossContext to reject HP loss without physical danger
6. **Quest Data Fix** - Added giver_npc to seed quests (Lenna, Adrian, Helga)
7. **Quest Agent NPC Parsing** - Now parses NPC name from player action to find available quests
8. **Quest Validation by Title** - Arbiter now matches quest titles, not just IDs
9. **Location Change Prompt** - Strengthened to clarify destination vs current location

### Medium Priority Fixes
10. **Chronicler Meta Terms** - Added rules to never use "NPC", "player", "game" etc.
11. **Smart Retry Logic** - Skip retry for unfixable rejections (NPC not present, invalid location, already at)
12. **Recent Turns Context** - Removed narration from recent turns to prevent location bleeding

### Additional Fixes During Testing
13. **Scene Context** - Added flag to tell Chronicler whether to describe location (new arrival) or focus on action (same location)
14. **Rune Marshal Trace** - Now shows detected intent in trace details
15. **Gold/Inventory Claims** - Strengthened prompts to reject player claims without valid in-world source
16. **Orchestrator Trace** - Shows actual proposal values (e.g., "GOLD +20" instead of "propose stat change")
17. **Arbiter Trace** - Shows actual approved/rejected values with details

---

## Files Modified

| File | Changes |
|------|---------|
| `lib/safety/sentinel.ts` | LLM classification with checkContentSafety() |
| `lib/safety/patterns.ts` | SOFT_REDIRECTS for immersive safety responses |
| `constants.ts` | GOLD_BOUNDS for economy validation |
| `lib/agents/arbiter/code-validation.ts` | validateGoldGain(), validateHpLossContext(), quest title matching |
| `lib/agents/arbiter/index.ts` | Pass playerAction and availableQuestTitles to context |
| `lib/agents/rune-marshal.ts` | Improved no-roll rules for social interactions |
| `lib/agents/orchestrator.ts` | NPC presence, location change, gold/inventory claim rules |
| `lib/prompts/turn.ts` | Meta terms, NPC presence, scene context |
| `lib/gemini/prompts.ts` | Recent turns (actions only), isNewLocation detection |
| `app/api/turn/route.ts` | Smart retry, NPC parsing for Quest Agent, intent in trace |
| `supabase/migrations/20260111_fix_quest_giver_npc.sql` | Quest giver_npc data |

---

## Next Steps

1. Retest Scenario 10 (location change) to confirm fix
2. Run extended playthrough (20+ turns) to verify stability
3. Proceed to Phase 5 (Gameplay Systems) or 5.0 (Automated Testing)
