# Combat Mechanics

## Overview

Combat in Waypoint is narrative-driven with deterministic mechanics. No tactical grid — actions resolve through skill checks and HP tracking.

## Health System

### HP (Hit Points)

```typescript
interface HealthState {
  hp: number; // Current health
  maxHp: number; // Maximum health (base 20)
}
```

### Starting HP

- All characters start with 20 HP and 20 maxHp
- No automatic HP scaling (no character levels or stats)
- maxHp can increase through:
  - Quest rewards (+2-5 max HP)
  - Rare items (permanent HP boost)
  - Training with specific NPCs

## Damage System

### Damage Sources

| Source        | Calculation         | Example                |
| ------------- | ------------------- | ---------------------- |
| Weapon attack | Weapon dice         | 1d6                    |
| Enemy attack  | Enemy damage rating | 1d8                    |
| Environmental | Fixed or dice       | 1d4 (fall), 2d6 (fire) |
| Poison/DoT    | Per turn damage     | 1d4 per turn           |

### Damage Resolution

1. **Rune Marshal** determines if attack hits (skill check)
2. **Orchestrator** proposes damage event with amount
3. **World Arbiter** validates damage is reasonable
4. **State update** applies HP change
5. **Chronicler** narrates the hit/miss

### Damage Event Format

```typescript
{
  type: 'stat_change',
  payload: {
    stat: 'hp',
    delta: -5,           // Negative for damage
    source: 'Goblin Slash',
    damage_type: 'slashing'
  },
  reason: 'Goblin attack hit (rolled 15 vs Defense 12)'
}
```

## Attack Resolution

### Player Attacks

1. Player describes attack action
2. Rune Marshal detects Combat power words
3. Skill check: d20 + skill modifier + power word bonus
4. Compare to enemy Defense
5. On hit: roll damage dice
6. Apply damage to enemy (tracked in world state)

### Enemy Attacks

1. Orchestrator determines enemy action based on context
2. Enemy rolls attack vs player's Defense
3. Defense = 10 + armor AC (from equipment)
4. On hit: enemy damage applied to player HP

### Defense Calculation

```typescript
const calculateDefense = (equipment: Equipment): number => {
  const baseDef = 10;
  const armorAC = sumArmorAC(equipment); // From equipped armor
  return baseDef + armorAC;
};
```

Note: No DEX modifier since we removed stats. Defense is purely equipment-based.

## Healing

### Healing Sources

| Source              | Amount   | Availability                   |
| ------------------- | -------- | ------------------------------ |
| Healing Potion      | 2d4+2 HP | Consumable item                |
| Rest (short)        | 1d6 HP   | Once per day phase             |
| Rest (long)         | Full HP  | Requires safe location + night |
| NPC Healer          | Variable | Costs gold, requires location  |
| Magic (post-unlock) | Variable | Requires magic unlock          |

### Healing Event Format

```typescript
{
  type: 'stat_change',
  payload: {
    stat: 'hp',
    delta: 8,            // Positive for healing
    source: 'Healing Potion',
    capped_at: 'maxHp'   // Cannot exceed max
  },
  reason: 'Consumed Healing Potion (rolled 2d4+2 = 8)'
}
```

### Healing Rules

- HP cannot exceed maxHp
- Healing items are consumed on use
- Rest healing requires narrative justification

## Death & Incapacitation

### At 0 HP

Character is **incapacitated**, not dead:

- Cannot take actions
- Enemies may ignore or capture
- Allies (NPCs) may help

### Death Conditions

Death occurs if:

- HP drops to negative maxHp (massive damage)
- Incapacitated and enemy delivers "finishing blow"
- Narrative death (rare, story-driven)

### On Death

1. Session ends with death summary
2. Character marked as `status: 'dead'`
3. Player can:
   - Create new character
   - (Post-MVP) Resurrection quest if conditions met

### Incapacitation Recovery

If not killed while incapacitated:

- Stabilize at 1 HP after combat ends
- Or rescued by NPC (relationship check)
- Or enemy captures (new quest hook)

## Combat Flow Example

```
Player: "I strike at the goblin with my dagger"

Rune Marshal:
  - Detects: "strike" (Combat/Melee/tier1)
  - Requires roll: true
  - Roll type: Melee
  - DC: 12 (goblin defense)
  - Modifiers: [{ source: 'skill_level', value: 1 }, { source: 'power_word', value: 1 }]

[Player clicks Roll → Server rolls d20]
Result: 14 + 2 = 16 (Success!)

Orchestrator:
  - Proposes: damage to goblin (1d4 = 3)
  - Proposes: skill XP gain (Melee +15)

World Arbiter:
  - Validates damage reasonable
  - Approves events

Chronicler:
  "Your dagger finds its mark, slicing across the goblin's arm.
   It shrieks in pain, stumbling backward. [Goblin: 9/12 HP]"

[Goblin's turn - Orchestrator decides action]

Orchestrator:
  - Goblin attacks back
  - Roll: 11 vs Player Defense 12
  - Miss!

Chronicler:
  "The goblin swings wildly with its rusty blade, but you
   sidestep the clumsy attack."
```

## Conditions in Combat

### Combat-Relevant Conditions

| Condition  | Effect                 | Duration             |
| ---------- | ---------------------- | -------------------- |
| Bleeding   | -1 HP per turn         | Until healed or rest |
| Stunned    | Skip next action       | 1 turn               |
| Poisoned   | -1d4 HP per turn       | Until cured          |
| Prone      | -2 to defense          | Until stand action   |
| Frightened | Cannot approach source | Until source gone    |

### Condition Application

```typescript
{
  type: 'condition_add',
  payload: {
    condition: {
      id: 'cond-123',
      name: 'Bleeding',
      type: 'debuff',
      description: 'Losing blood from wound',
      duration: 'Until healed'
    }
  },
  reason: 'Critical hit caused bleeding wound'
}
```

## Enemy Tracking

Enemies are tracked in world state during combat:

```typescript
interface CombatEntity {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  defense: number;
  damage: string; // e.g., "1d6"
  conditions: Condition[];
}

// In WorldContext
entities: string[]; // IDs of present entities (NPCs + enemies)
```

## Fleeing Combat

Player can attempt to flee:

1. Declare flee action
2. Athletics or Acrobatics skill check vs DC based on enemy
3. Success: escape, combat ends
4. Failure: enemy gets free attack, still in combat

## Loot & Rewards

After combat victory:

- Orchestrator proposes loot based on enemy type
- World Arbiter validates against item bounds
- Gold and items added to inventory
- Skill XP awarded for combat skills used
