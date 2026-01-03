# Design: Wire Character CRUD

## Overview

This design connects the existing API routes to Supabase, transforming the mock-based frontend into a real data-driven application.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    App.tsx      │────▶│  /api/character │────▶│    Supabase     │
│  (React Client) │◀────│  (Next.js API)  │◀────│  (PostgreSQL)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Data Flow

### On App Mount

```
1. App.tsx mounts
2. Call GET /api/character?user_id=TEST_USER_ID
3. If character exists → load into state, show game
4. If no character → show character creation
```

### On Character Creation

```
1. User completes CharacterCreation form
2. Call POST /api/character with character data
3. API creates character + world_state in Supabase
4. Return created character
5. App.tsx loads character into state, transitions to game
```

## API Design

### GET /api/character

**Request:**

```
GET /api/character?user_id=00000000-0000-0000-0000-000000000001
```

**Response (character exists):**

```json
{
  "character": {
    "id": "uuid",
    "name": "Hero Name",
    "stats": { "STR": 10, ... },
    ...
  }
}
```

**Response (no character):**

```json
{
  "character": null
}
```

### POST /api/character

**Request:**

```json
{
  "name": "Hero Name",
  "gender": "Unknown",
  "description": "A brave adventurer",
  "portraitUrl": "https://..."
}
```

**Response:**

```json
{
  "character": {
    "id": "uuid",
    "name": "Hero Name",
    ...
  },
  "world": {
    "id": "uuid",
    "region": "Eldoria",
    ...
  }
}
```

### PATCH /api/character

**Request:**

```json
{
  "id": "character-uuid",
  "hp": 15,
  "gold": 25
}
```

**Response:**

```json
{
  "character": { ... }
}
```

## Database Mapping

### Character Type → waypoint_characters Table

| TypeScript Field | Database Column   | Notes       |
| ---------------- | ----------------- | ----------- |
| name             | name              | VARCHAR(30) |
| gender           | gender            | VARCHAR(20) |
| portraitUrl      | portrait_url      | TEXT        |
| level            | level             | INT         |
| xp               | xp                | INT         |
| hp               | hp                | INT         |
| maxHp            | max_hp            | INT         |
| gold             | gold              | INT         |
| stats            | stats             | JSONB       |
| skills           | skills            | JSONB       |
| equipment        | equipment         | JSONB       |
| inventory        | inventory         | JSONB       |
| conditions       | conditions        | JSONB       |
| isMagicUnlocked  | is_magic_unlocked | BOOLEAN     |

### WorldContext Type → waypoint_world_state Table

| TypeScript Field | Database Column | Notes        |
| ---------------- | --------------- | ------------ |
| region           | region          | VARCHAR(100) |
| poi              | poi             | VARCHAR(100) |
| time.day         | time_day        | INT          |
| time.phase       | time_phase      | VARCHAR(20)  |
| weather          | weather         | VARCHAR(50)  |
| description      | description     | TEXT         |
| tags             | tags            | JSONB        |
| nearbyPoi        | nearby_poi      | JSONB        |
| entities         | entities        | JSONB        |
| memory           | memories        | JSONB        |

## Type Transformations

```typescript
// Database row → Frontend type
function dbToCharacter(row: Database["waypoint_characters"]): Character {
  return {
    name: row.name,
    race: "Human", // All humans in MVP
    class: "Adventurer", // No classes in MVP
    background: "",
    gender: row.gender || "Unknown",
    portraitUrl: row.portrait_url || undefined,
    level: row.level,
    xp: row.xp,
    maxXp: calculateMaxXp(row.level),
    hp: row.hp,
    maxHp: row.max_hp,
    gold: row.gold,
    stats: row.stats as Record<Attribute, number>,
    inventory: row.inventory as Item[],
    spells: [],
    equipment: row.equipment as Equipment,
    skills: row.skills as Record<string, SkillProgression>,
    conditions: row.conditions as Condition[],
    isMagicUnlocked: row.is_magic_unlocked,
  };
}

// Frontend type → Database insert
function characterToDb(char: Partial<Character>, userId: string) {
  return {
    user_id: userId,
    name: char.name,
    gender: char.gender,
    description: char.description,
    portrait_url: char.portraitUrl,
    stats: char.stats || {
      STR: 10,
      DEX: 10,
      CON: 10,
      INT: 10,
      WIS: 10,
      CHA: 10,
    },
    // ... other fields with defaults
  };
}
```

## Initial World State

When creating a character, also create their world state:

```typescript
const INITIAL_WORLD_STATE = {
  region: "Eldoria",
  poi: "The Crossroads Inn",
  time_day: 1,
  time_phase: "Morning",
  weather: "Clear",
  description: "A well-worn tavern at the intersection of trade routes.",
  tags: [],
  nearby_poi: ["Market Square", "City Gates", "Temple District"],
  entities: [],
  memories: [],
};
```

## Frontend Changes

### App.tsx State

```typescript
// Add loading state
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

// Load character on mount
useEffect(() => {
  loadCharacter();
}, []);

async function loadCharacter() {
  setIsLoading(true);
  try {
    const res = await fetch(`/api/character?user_id=${TEST_USER_ID}`);
    const data = await res.json();
    if (data.character) {
      setGameState((prev) => ({ ...prev, character: data.character }));
      setView("game");
    } else {
      setView("creation");
    }
  } catch (err) {
    setError("Failed to load character");
  } finally {
    setIsLoading(false);
  }
}
```

### CharacterCreation Integration

```typescript
const handleCharacterComplete = async (charData: Partial<Character>) => {
  const res = await fetch("/api/character", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(charData),
  });
  const data = await res.json();
  setGameState((prev) => ({
    ...prev,
    character: data.character,
    world: data.world,
  }));
  setView("game");
};
```

## Error Handling

```typescript
// Consistent error response format
interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

// Example error response
return NextResponse.json(
  { error: "Character not found", code: "NOT_FOUND" },
  { status: 404 }
);
```

## Test User Setup

For development without auth, we need to handle RLS:

**Option A: Disable RLS temporarily (not recommended)**

**Option B: Create test user in auth.users**

```sql
INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000001', 'test@waypoint.dev');
```

**Option C: Use service role key (bypasses RLS)**

- Use SUPABASE_SERVICE_KEY for API routes
- This is acceptable for development

We'll use Option C for simplicity.

## File Changes

| File                               | Change                                      |
| ---------------------------------- | ------------------------------------------- |
| `app/api/character/route.ts`       | Implement GET, POST, PATCH with Supabase    |
| `app/api/world/route.ts`           | Implement GET, PATCH with Supabase          |
| `App.tsx`                          | Add loading state, fetch character on mount |
| `components/CharacterCreation.tsx` | Call API on completion                      |
| `lib/supabase/transforms.ts`       | New file for type transformations           |
| `constants.ts`                     | Add TEST_USER_ID                            |
