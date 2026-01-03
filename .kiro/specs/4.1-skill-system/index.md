# Spec 4.1: Skill System

## Status: 📋 NOT STARTED

## Overview

Implement skill checks, power word detection, and XP progression. Builds on the tool calling foundation from Phase 2.

## Roadmap Reference

See #[[file:.kiro/steering/mvp-roadmap.md]] — Phase 4

## Mechanics Reference

See #[[file:.kiro/steering/game-mechanics.md]]
See #[[file:.kiro/steering/progression-system.md]]

## Estimate

6-8 hours

## Dependencies

- 3.1 demo-experience (complete)
- 2.2 skill-checks-mechanics (tool calling foundation)

## Scope Summary

- Power word detection in player input (via `detect_intent` tool)
- Skill check UI (roll button, results display)
- XP calculation (OSRS formula)
- Skill level progression
- Tier unlock system (1/4/7)
- Skill modifiers by level

## Tool Calling Integration

This spec extends the `detect_intent` tool from 2.2:

```typescript
// Already defined in 2.2, used here for XP awards
const intentResult = await detectIntent(playerAction, character);

// Award XP based on skill check outcome
if (rollOutcome.success) {
  const xpGain = calculateXP(intentResult.dc, intentResult.tier);
  await awardSkillXP(character, intentResult.primary_skill, xpGain);
}
```

## Deliverables

- [ ] Power words detected correctly (via tool calling)
- [ ] Roll button triggers server roll
- [ ] Results display in narration
- [ ] XP awarded and tracked
- [ ] Level ups work
- [ ] Tier unlocks function

---

## Spec Documents

> Created when spec is started

- [ ] requirements.md
- [ ] design.md
- [ ] tasks.md

---

## Post-Implementation Review

> Completed after spec is done

- [ ] Review: Did implementation match design?
- [ ] Review: Any pivots or changes made?
- [ ] Update: Reflect changes in steering docs (game-mechanics.md, progression-system.md)
- [ ] Update: Update roadmap status
