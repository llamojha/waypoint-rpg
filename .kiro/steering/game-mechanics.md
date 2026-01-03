# Game Mechanics

## Power Words System

Power words are verbs/actions in player input that trigger skill checks with bonuses.

### Detection Flow

1. Parse player input for power words
2. Match against `SKILL_TREE` (pillar → skill → tier)
3. Apply tier bonus: tier1=+1, tier2=+2, tier3=+3
4. Trigger roll if context requires check

### Skill Progression

- Unlock tiers at skill levels: tier1=1, tier2=4, tier3=7
- XP gained from successful use of power words
- `SkillProgression.verbs` tracks unlocked words per skill

### Example

Player: "I **strike** at the goblin"
→ Detects "strike" (Combat/Melee/tier1)
→ Melee check with +1 bonus

## Skill Checks

```typescript
mechanics: {
  type: 'check',
  skill: string,    // e.g., 'Perception'
  dc: number,       // Difficulty class
  rolled?: number,  // Result after roll
  modifier?: number,
  outcome?: 'success' | 'failure'
}
```

### Modifier Calculation

Modifiers come from:

1. **Skill level bonus**: +1 per 10 skill levels (0-9 = +0, 10-19 = +1, etc.)
2. **Power word bonus**: +1/+2/+3 based on tier used
3. **Equipment bonuses**: Some items grant skill bonuses

Note: No stat modifiers (STR/DEX/etc.) — those were removed from the game.

```typescript
const getSkillModifier = (skillLevel: number): number => {
  return Math.floor(skillLevel / 10);
};
```

### Resolution

1. DM (LLM) proposes check with DC
2. Player clicks Roll button
3. Server rolls d20 + modifier
4. Outcome determines narration branch + diffs

## Inventory & Equipment

### Equipment Slots

mainHand | offHand | head | chest | arms | legs | cloak | trinket

### Rules

- Equip/unequip must produce `TurnDiff` of type 'inventory'
- Narration cannot reference items not in `character.inventory`
- Item stats (AC, damage) affect combat deterministically

## Defense Calculation

Defense = 10 + armor AC (from equipped items)

No DEX modifier since stats were removed.

## Quests

### Lifecycle

rumor → active quest → progress updates → completed/failed

### Structure

- `leads`: Actionable hints for player
- `progress/totalProgress`: Numeric tracker
- Status changes require validated diff

## NPC Relationships

- Scale: -5 (hostile) to +5 (devoted)
- Changes tracked in `TurnDiff` type 'relationship'
- `NPC.history` logs significant interactions
- Max change per turn: ±2
