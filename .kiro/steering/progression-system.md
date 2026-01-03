# Progression System

## Overview

Progression is skill-based only. There is no character-level XP — your "level" is the sum of all your skill levels, displayed in the UI but not stored.

## XP Formula (OSRS-Based)

Skill levels 0-99 with exponential scaling:

```typescript
// XP required for a given level
const xpForLevel = (level: number): number => {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += Math.floor(i + 300 * Math.pow(2, i / 7));
  }
  return Math.floor(total / 4);
};

// Simplified lookup table for key levels
const XP_TABLE = {
  1: 0,
  2: 83,
  3: 174,
  4: 276,
  5: 388,
  10: 1154,
  15: 2411,
  20: 4470,
  25: 8740,
  30: 13363,
  40: 37224,
  50: 101333,
  60: 273742,
  70: 737627,
  80: 1986068,
  90: 5346332,
  99: 13034431,
};
```

## Overall Level (UI Only)

The "overall level" shown in the UI is calculated, not stored:

```typescript
const getOverallLevel = (skills: Record<string, SkillProgression>): number => {
  return Object.values(skills).reduce((sum, s) => sum + s.level, 0);
};
```

This gives players a sense of total progression without needing separate character XP.

## Skill Progression

Each skill in the SKILL_TREE has its own level (0-99).

### Skill Data Structure

```typescript
interface SkillProgression {
  level: number; // 0-99
  xp: number; // Current XP in this level
  nextLevel: number; // XP needed for next level
  verbs: string[]; // Unlocked power words
}
```

### Skill XP Sources

| Action                   | XP Amount                             |
| ------------------------ | ------------------------------------- |
| Use power word (success) | 15-50 (based on DC)                   |
| Use power word (failure) | 5-15 (reduced)                        |
| Use alias (success)      | 10-35 (slightly less than power word) |
| Training with NPC        | 100-500 (costs gold/time)             |
| Quest reward             | 50-200 (specific skill)               |

### Skill Level Benefits

**Tier Unlocks:**

| Skill Level | Unlock                       |
| ----------- | ---------------------------- |
| 1           | Tier 1 power words available |
| 4           | Tier 2 power words available |
| 7           | Tier 3 power words available |

**Passive Bonuses:**

| Skill Level     | Bonus                         |
| --------------- | ----------------------------- |
| Every 10 levels | +1 to skill checks            |
| 25              | Reduced failure penalty       |
| 50              | Chance for critical success   |
| 75              | Mastery perk (skill-specific) |
| 99              | Master title + unique ability |

## HP Progression

HP does not increase with "level" since there's no character level. Instead:

- Base HP: 20
- HP increases through:
  - Quest rewards (+2-5 max HP)
  - Rare items (permanent HP boost)
  - Training with specific NPCs

## Skill Check Modifiers

```typescript
const getSkillModifier = (skillLevel: number): number => {
  if (skillLevel < 10) return 0;
  if (skillLevel < 20) return 1;
  if (skillLevel < 30) return 2;
  if (skillLevel < 40) return 3;
  if (skillLevel < 50) return 4;
  if (skillLevel < 60) return 5;
  if (skillLevel < 70) return 6;
  if (skillLevel < 80) return 7;
  if (skillLevel < 90) return 8;
  return 9; // 90-99
};
```

## XP Calculation Examples

### Combat Example

```
Player defeats a wolf using "strike"
- Melee skill XP: 35 (DC 12 check passed)

Player defeats a bandit leader using "cleave"
- Melee skill XP: 50 (DC 16 check passed, tier 2 word)
```

### Non-Combat Example

```
Player successfully sneaks past guards
- Sneaking skill XP: 40 (DC 15 check passed)

Player discovers hidden cave
- Navigation skill XP: 25
```

## Database Schema

Skills are stored as JSONB on the character:

```sql
-- Skills JSONB structure
{
  "Melee": { "level": 5, "xp": 450, "nextLevel": 500, "verbs": ["strike", "slash"] },
  "Sneaking": { "level": 3, "xp": 200, "nextLevel": 300, "verbs": ["sneak", "creep"] },
  "Perception": { "level": 2, "xp": 100, "nextLevel": 200, "verbs": ["notice", "spot"] }
}
```

## UI Display

### Character Panel

- Show "Overall Level" (sum of all skill levels)
- Show HP bar

### Skills Panel

- Show each trained skill with level + XP bar
- Highlight recently gained XP
- Show unlocked power words per skill
- Group by pillar (Combat, Stealth, etc.)

## Anti-Grinding Measures

To prevent tedious grinding:

- Diminishing returns on repeated identical actions
- XP caps per session (soft cap, not hard block)
- Bonus XP for variety (using different skills)
- Quest XP significantly higher than grinding
