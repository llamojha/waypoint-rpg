# Character Creation

## Design Philosophy: Pure MUD Style

Inspired by MUD1/MUD2 — maximum simplicity:

- **No classes** — you're just "an adventurer"
- **No races** — all humans (other races exist in world as NPCs)
- **No backgrounds** — your story emerges from play
- **No stats** — no STR/DEX/CON/INT/WIS/CHA
- Your "class" emerges from how you play via power words and skill progression

## MVP Creation Flow

### Step 1: Name Your Character

- 2-30 characters
- No special symbols
- Unique per user

### Step 2: Gender (Optional)

- Free-form text field
- Can be skipped entirely
- Used for portrait generation hints and narration pronouns

### Step 3: Generate Portrait

- Enter physical description for the AI
- Call image generation API (Gemini)
- Show preview, allow regenerate
- Must generate before proceeding

### Step 4: Confirm & Enter World

- Review name, gender, portrait
- All skills start at level 0
- First turn begins immediately

## Character Data Model

```typescript
interface Character {
  id?: string;
  name: string;
  gender?: string; // Optional, free-form
  portraitUrl?: string;
  hp: number; // Default 20
  maxHp: number; // Default 20
  gold: number; // Default 10
  skills: Record<string, SkillProgression>; // All skills at 0
  equipment: Equipment;
  inventory: Item[];
  conditions: Condition[];
  isMagicUnlocked: boolean; // Default false
}
```

## What's NOT in Character

- No `race`, `class`, `background`
- No `stats` (STR/DEX/CON/INT/WIS/CHA)
- No `level`, `xp`, `maxXp` (character-level progression)
- No `spells` array (magic is locked by default)

## Starting Equipment

All characters start with:

- Iron Dagger → mainHand
- Leather Tunic → chest
- Healing Potion → inventory
- 10 gold

No class-specific gear — you find/earn everything through play.

## Starting Skills

All skills from SKILL_TREE start at:

```typescript
{ level: 0, xp: 0, nextLevel: 100, verbs: [] }
```

- No pre-unlocked power words
- First tier unlocks at skill level 1
- Players discover skills by attempting actions

## "Overall Level" Display

The UI can show an "overall level" as the sum of all skill levels, but this is calculated on-the-fly, not stored:

```typescript
const getOverallLevel = (skills: Record<string, SkillProgression>): number => {
  return Object.values(skills).reduce((sum, s) => sum + s.level, 0);
};
```

## Magic System Unlock

Magic pillar is locked at start (`isMagicUnlocked: false`).

**Unlock conditions (any one):**

- Discover a magical artifact (quest reward)
- Train with a magic-using NPC (relationship ≥ 3)
- Complete "Awakening" quest line
- Find and read a Tome of Initiation (rare item)

## Validation Rules

- Name: 2-30 characters, alphanumeric + spaces
- Gender: optional, max 20 characters
- Portrait: must be generated before completion

## Database Schema

```sql
CREATE TABLE waypoint_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name VARCHAR(30) NOT NULL,
  gender VARCHAR(20),
  portrait_url TEXT,
  hp INT DEFAULT 20,
  max_hp INT DEFAULT 20,
  gold INT DEFAULT 10,
  skills JSONB DEFAULT '{}',
  equipment JSONB DEFAULT '{}',
  inventory JSONB DEFAULT '[]',
  conditions JSONB DEFAULT '[]',
  is_magic_unlocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## UI Flow

```
[Landing] → [Sign In]
              ↓
         [Name + Gender (optional)]
              ↓
         [Portrait Description + Generate]
              ↓
         [Confirm] → "Your skills will develop through your actions"
              ↓
         [Enter World] → first turn begins
```

## Post-MVP: Races & Archetypes

Future additions (not MVP):

- **Races as NPCs**: Elves, Dwarves, Orcs exist in world
- **Race unlock quests**: Complete storylines to unlock playable races
- **Archetype quests**: "Path of the Warrior" quest line grants class-like bonuses
- **Hybrid builds**: Mix archetypes freely based on completed quests
