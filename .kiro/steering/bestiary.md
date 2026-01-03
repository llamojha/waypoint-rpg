# Bestiary

## Design Philosophy

Medieval-realistic enemies only for MVP. No fantasy creatures (dragons, goblins, etc.) — those come post-MVP with magic system expansion.

## Enemy Tiers

| Tier    | Difficulty  | Player Level Range | Examples                      |
| ------- | ----------- | ------------------ | ----------------------------- |
| Trivial | Very Easy   | 1+                 | Rat, Rabbit, Snake            |
| Easy    | Easy        | 1-10               | Wolf, Wild Dog, Thief         |
| Medium  | Moderate    | 5-20               | Bandit, Boar, Bear Cub        |
| Hard    | Challenging | 15-40              | Bandit Leader, Bear, Outlaw   |
| Elite   | Dangerous   | 30-60              | Mercenary Captain, Pack Alpha |
| Boss    | Very Hard   | 50+                | Bandit King, Legendary Beast  |

## Enemy Stat Blocks

### Wildlife

#### Rat (Trivial)

```typescript
{
  name: "Rat",
  tier: "trivial",
  hp: 4,
  maxHp: 4,
  defense: 8,
  damage: "1d2",
  xp: 5,
  behavior: "flees when hurt",
  loot: { gold: "0-1", items: [] }
}
```

#### Snake (Trivial)

```typescript
{
  name: "Snake",
  tier: "trivial",
  hp: 6,
  maxHp: 6,
  defense: 10,
  damage: "1d3",
  xp: 8,
  behavior: "ambush, may poison",
  conditions: ["can_poison"],
  loot: { gold: "0", items: ["Snake Fang (common)"] }
}
```

#### Wolf (Easy)

```typescript
{
  name: "Wolf",
  tier: "easy",
  hp: 12,
  maxHp: 12,
  defense: 11,
  damage:  xp: 20,
  behavior: "pack tactics, calls allies",
  loot: { gold: "0", items: ["Wolf Pelt (common)", "Wolf Fang (common)"] }
}
```

#### Wild Boar (Medium)

```typescript
{
  name: "Wild Boar",
  tier: "medium",
  hp: 18,
  maxHp: 18,
  defense: 12,
  damage: "1d8",
  xp: 30,
  behavior: "charges, aggressive when cornered",
  loot: { gold: "0", items: ["Boar Tusk (uncommon)", "Raw Meat (common)"] }
}
```

#### Bear (Hard)

```typescript
{
  name: "Bear",
  tier: "hard",
  hp: 35,
  maxHp: 35,
  defense: 13,
  damage: "2d6",
  xp: 60,
  behavior: "territorial, mauls on crit",
  conditions: ["can_bleed"],
  loot: { gold: "0", items: ["Bear Pelt (uncommon)", "Bear Claw (uncommon)"] }
}
```

#### Pack Alpha Wolf (Elite)

```typescript
{
  name: "Pack Alpha",
  tier: "elite",
  hp: 45,
  maxHp: 45,
  defense: 14,
  damage: "2d6+2",
  xp: 100,
  behavior: "commands pack, howls for reinforcements",
  abilities: ["Howl: summons 1d2 wolves"],
  loot: { gold: "0", items: ["Alpha Pelt (rare)", "Alpha Fang (rare)"] }
}
```

### Humanoids

#### Thief (Easy)

```typescript
{
  name: "Thief",
  tier: "easy",
  hp: 10,
  maxHp: 10,
  defense: 12,
  damage: "1d4",
  xp: 15,
  behavior: "steals items, flees when losing",
  abilities: ["Pickpocket: may steal 1d10 gold on hit"],
  loot: { gold: "5-20", items: ["Lockpick (common)"] }
}
```

#### Bandit (Medium)

```typescript
{
  name: "Bandit",
  tier: "medium",
  hp: 15,
  maxHp: 15,
  defense: 12,
  damage: "1d6+1",
  xp: 25,
  behavior: "demands toll, fights if refused",
  loot: { gold: "10-30", items: ["Rusty Sword (common)", "Leather Scraps (common)"] }
}
```

#### Bandit Archer (Medium)

```typescript
{
  name: "Bandit Archer",
  tier: "medium",
  hp: 12,
  maxHp: 12,
  defense: 11,
  damage: "1d8",
  xp: 25,
  behavior: "keeps distance, retreats if approached",
  loot: { gold: "10-25", items: ["Shortbow (common)", "Arrows x10 (common)"] }
}
```

#### Bandit Leader (Hard)

```typescript
{
  name: "Bandit Leader",
  tier: "hard",
  hp: 30,
  maxHp: 30,
  defense: 14,
  damage: "1d8+2",
  xp: 50,
  behavior: "commands bandits, tactical",
  abilities: ["Rally: nearby bandits gain +2 damage for 1 turn"],
  loot: { gold: "50-100", items: ["Steel Sword (uncommon)", "Bandit's Key (quest)"] }
}
```

#### Outlaw (Hard)

```typescript
{
  name: "Outlaw",
  tier: "hard",
  hp: 25,
  maxHp: 25,
  defense: 13,
  damage: "1d8+1",
  xp: 45,
  behavior: "wanted criminal, fights to death",
  loot: { gold: "30-75", items: ["Bounty Notice (quest)", "Quality Dagger (uncommon)"] }
}
```

#### Mercenary (Elite)

```typescript
{
  name: "Mercenary",
  tier: "elite",
  hp: 40,
  maxHp: 40,
  defense: 15,
  damage: "1d10+2",
  xp: 80,
  behavior: "professional, uses tactics",
  abilities: ["Disarm: may knock weapon from player's hand"],
  loot: { gold: "75-150", items: ["Mercenary Blade (rare)", "Chainmail Scraps (uncommon)"] }
}
```

#### Mercenary Captain (Elite)

```typescript
{
  name: "Mercenary Captain",
  tier: "elite",
  hp: 55,
  maxHp: 55,
  defense: 16,
  damage: "2d6+3",
  xp: 120,
  behavior: "commands squad, strategic",
  abilities: ["Command: allies attack twice", "Parry: +4 defensen"],
  loot: { gold: "150-300", items: ["Captain's Blade (rare)", "Signet Ring (quest)"] }
}
```

### Boss Enemies

#### Bandit King (Boss)

```typescript
{
  name: "Bandit King",
  tier: "boss",
  hp: 100,
  maxHp: 100,
  defense: 17,
  damage: "2d8+4",
  xp: 500,
  behavior: "ruthless leader, multiple phases",
  abilities: [
    "Call Reinforcements: summons 2 bandits",
    "Intimidating Presence: player must pass WIS check or -2 to attacks",
    "Desperate Strike: +50% damageP"
  ],
  loot: {
    gold: "500-1000",
    items: ["Bandit King's Crown (rare)", "Vault Key (quest)", "Royal Decree (lore)"]
  }
}
```

## Enemy Behavior Patterns

### AI Behaviors

| Behavior    | Description                    |
| ----------- | ------------------------------ |
| Aggressive  | Attacks on sight               |
| Territorial | Attacks if player enters area  |
| Defensive   | Only attacks if attacked first |
| Cowardly    | Flees below 25% HP             |
| Pack        | Calls nearby allies            |
| Ambush      | Hidden until player is close   |
| Patrol      | Moves between points           |

### Combat Tactics

| Tactic  | Used By            |
| ------- | ------------------ |
| Charge  | Boar, Bear         |
| Flank   | Wolf pack, Bandits |
| Kite    | Archers            |
| Tank    | Mercenary, Bear    |
| Support | Bandit Leader      |

## Encounter Generation

Orchestrator uses these rules when generating encounters:

```typescript
interface EncounterRules {
  // Match enemy tier to player level
  tierForLevel: (level: number) => EnemyTier;

  // Group size based on tier
  groupSize: {
    trivial: "1d4+1";
    easy: "1d3";
    medium: "1d2";
    hard: "1";
    elite: "1";
    boss: "1";
  };

  // Location influences enemy type
  locationEnemies: {
    forest: ["Wolf", "Boar", "Bear", "Bandit"];
    road: ["Thief", "Bandit", "Bandit Archer"];
    ruins: ["Rat", "Snake", "Outlaw"];
    camp: ["Bandit", "Bandit Leader", "Mercenary"];
  };
}
```

## Loot Tables

### By Tier

| Tier    | Gold Range | Item Rarity          |
| ------- | ---------- | -------------------- |
| Trivial | 0-5        | Common only          |
| Easy    | 5-25       | Common, 10% uncommon |
| Medium  | 15-50      | Common, 25% uncommon |
| Hard    | 40-100     | Uncommon, 10% rare   |
| Elite   | 75-200     | Uncommon, 25% rare   |
| Boss    | 300-1000   | Rare, 10% legendary  |

### Crafting Materials

Enemies drop materials for crafting (post-MVP):

- Wolf Pelt → Leather Armor
- Bear Claw → Weapon upgrade
- Bandit's Key → Access to hideout

## Database Schema

```sql
-- Enemy templates (pre-seeded)
CREATE TABLE enemy_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  tier VARCHAR(20) NOT NULL,
  hp INT NOT NULL,
  defenseNOT NULL,
  damage VARCHAR(20) NOT NULL,
  xp INT NOT NULL,
  behavior TEXT,
  abilities JSONB DEFAULT '[]',
  conditions JSONB DEFAULT '[]',
  loot JSONB DEFAULT '{}',
  locations JSONB DEFAULT '[]'
);

-- Active enemies in combat (per character session)
CREATE TABLE combat_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES characters(id),
  template_id UUID REFERENCES enemy_templates(id),
  current_hp INT NOT NULL,
  conditions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
