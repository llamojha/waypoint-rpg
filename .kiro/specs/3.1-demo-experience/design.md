# Demo Experience - Design

## Solution Overview

The demo experience centers on the **Crossroads Inn** — a roadside tavern where three roads meet. Players awaken near an ancient **waystone** in the inn's courtyard with no memory of how they arrived. This setup provides safety, social hooks, and multiple adventure paths.

## Architecture

### Starting Location: Crossroads Inn

```
                    [Northern Forest]
                          |
                    [Hunter's Cache]
                          |
[West Road] ----[Crossroads Inn]---- [East Road]
  (locked)            |                   |
                 [Old Mill]         [Merchant Trail]
                      |
                [Ash Coast]
                 (far, harder)
```

### The Waystone

- **Physical form**: Tall standing stone (2m), weathered, covered in faded runes
- **Location**: Inn's courtyard, visible from common room window
- **Lore**: Ancient travel network, mostly dormant. Player arrived through it mysteriously.
- **Interaction**: Examining it triggers Arcana/History check, reveals lore snippet
- **Future**: Activates as fast-travel once player discovers other waystones

## Data Design

### Seed Data Required

#### Locations

```typescript
const SEED_LOCATIONS = [
  {
    id: "loc-crossroads-inn",
    name: "Crossroads Inn",
    type: "inn",
    region: "The Crossroads",
    description:
      "A weathered roadside inn where three paths meet. Smoke rises from the chimney.",
    is_preseeded: true,
    coordinates: { x: 50, y: 50 },
  },
  {
    id: "loc-northern-forest",
    name: "Northern Forest",
    type: "forest",
    region: "The Crossroads",
    description:
      "Dense woodland stretching north. Locals speak of wolves and old ruins.",
    is_preseeded: true,
    coordinates: { x: 50, y: 30 },
  },
  {
    id: "loc-old-mill",
    name: "Old Mill",
    type: "ruin",
    region: "The Crossroads",
    description:
      "An abandoned watermill, its wheel long still. Something skitters inside.",
    is_preseeded: true,
    coordinates: { x: 40, y: 60 },
  },
  {
    id: "loc-east-road",
    name: "East Road",
    type: "road",
    region: "The Crossroads",
    description: "A well-traveled merchant road leading toward the hills.",
    is_preseeded: true,
    coordinates: { x: 70, y: 50 },
  },
  {
    id: "loc-hunters-cache",
    name: "Hunter's Cache",
    type: "poi",
    region: "Northern Forest",
    description: "A hidden supply stash used by forest hunters.",
    is_preseeded: true,
    coordinates: { x: 45, y: 20 },
  },
];
```

#### NPCs

```typescript
const SEED_NPCS = [
  {
    id: "npc-marta",
    name: "Marta",
    role: "Innkeeper",
    location: "Crossroads Inn",
    personality: ["practical", "motherly", "observant"],
    dialogue_hints: [
      "Knows everyone who passes through",
      "Worried about rats in the cellar",
      "Curious about the waystone",
    ],
    is_preseeded: true,
  },
  {
    id: "npc-garrett",
    name: "Old Garrett",
    role: "Traveler",
    location: "Crossroads Inn",
    personality: ["talkative", "superstitious", "friendly"],
    dialogue_hints: [
      "Tells tall tales, some true",
      "Knows about the forest",
      "Slightly drunk",
    ],
    is_preseeded: true,
  },
  {
    id: "npc-sela",
    name: "Sela",
    role: "Traveling Merchant",
    location: "Crossroads Inn",
    personality: ["shrewd", "fair", "cautious"],
    dialogue_hints: [
      "Sells basic supplies",
      "Worried about bandits on east road",
      "Looking for escort",
    ],
    is_preseeded: true,
  },
];
```

#### Quests

```typescript
const SEED_QUESTS = [
  {
    id: "quest-cellar-trouble",
    title: "Cellar Trouble",
    description: "Marta needs someone to clear the rats from her cellar.",
    total_progress: 2, // 1: Enter cellar, 2: Clear rats
    leads: ["Go to the cellar", "Deal with the rats"],
    is_preseeded: true,
  },
  {
    id: "quest-forest-path",
    title: "The Forest Path",
    description:
      "Old Garrett speaks of a hunter's cache hidden in the northern woods.",
    total_progress: 3, // 1: Enter forest, 2: Find trail, 3: Reach cache
    leads: ["Head into the forest", "Look for trail markers", "Find the cache"],
    is_preseeded: true,
  },
  {
    id: "quest-missing-merchant",
    title: "The Missing Merchant",
    description:
      "A merchant went east three days ago and never arrived. Sela is worried.",
    total_progress: 4, // 1: Take quest, 2: Travel east, 3: Find clues, 4: Resolve
    leads: ["Travel the east road", "Look for signs of trouble"],
    is_preseeded: true,
  },
];
```

#### World News (Initial)

```typescript
const SEED_NEWS = [
  {
    id: "news-waystone-active",
    title: "Waystone Stirs",
    text: "The old waystone at the Crossroads Inn glowed briefly last night. A stranger was found unconscious beside it.",
    news_type: "event",
    status: "rumor",
  },
  {
    id: "news-bandit-trouble",
    title: "Bandits on the East Road",
    text: "Travelers report increased bandit activity on the road to the eastern hills.",
    news_type: "warning",
    status: "canon",
  },
];
```

## Component Design

### First Turn Flow

```
[Character Creation Complete]
         ↓
[Initialize World State]
  - Set location: Crossroads Inn
  - Set time: Day 1, Morning
  - Set weather: Clear
  - Add starter NPCs to entities
         ↓
[Generate Opening Narration]
  - Use Chronicler with special "opening" prompt
  - Include scene description
  - Include Marta's greeting
  - Include suggested actions
         ↓
[Display to Player]
  - Narration in center column
  - World info in header
  - NPCs visible in left column
  - News in right column
```

### Opening Narration Template

```typescript
const OPENING_NARRATION = `
You open your eyes to the smell of woodsmoke and ale.

The common room of the Crossroads Inn stretches before you — a handful of travelers huddle near the hearth, and the innkeeper polishes a mug behind the bar. Through the window, you glimpse the old waystone standing in the courtyard, its surface worn smooth by countless hands.

Outside, three roads meet: one leads north toward the forest, another east toward distant hills, and the third south toward what locals call the Ash Coast.

The innkeeper glances your way. "Finally awake, are you? You've been out cold since they found you by the stone. Don't remember how you got here, I'd wager."

What do you do?
`;

const OPENING_SUGGESTED_ACTIONS = [
  "Talk to the innkeeper",
  "Look around the inn",
  "Examine the waystone",
  "Check my belongings",
  "Head outside",
];
```

## Interface Design

### First Turn UI State

```typescript
const INITIAL_GAME_STATE: GameState = {
  character: createdCharacter,
  quests: [], // Empty until player accepts
  npcs: [], // Populated after first interaction
  turns: [
    {
      id: "t-opening",
      timestamp: Date.now(),
      playerAction: "Awaken",
      narration: OPENING_NARRATION,
      isStreaming: false,
      suggestedActions: OPENING_SUGGESTED_ACTIONS,
      diffs: [{ type: "world", text: "Arrived at Crossroads Inn" }],
    },
  ],
  world: {
    name: "Eldoria",
    region: "The Crossroads",
    poi: "Crossroads Inn",
    time: { day: 1, phase: "Morning" },
    weather: "Clear",
    description: "A weathered roadside inn where three paths meet.",
    tags: [{ name: "Safe Zone", type: "canon" }],
    nearbyPoi: ["Northern Forest", "East Road", "Old Mill"],
    entities: ["npc-marta", "npc-garrett", "npc-sela"],
    memory: [],
  },
  sessions: [
    {
      id: "s-1",
      title: "Awakening",
      date: "Day 1",
      location: "Crossroads Inn",
      summary: "Awakened by the waystone with no memory.",
      status: "active",
    },
  ],
};
```

## Error Handling

### If Opening Narration Fails

- Fall back to static template (above)
- Log error for debugging
- Don't block player from acting

### If Seed Data Missing

- Check on app init
- Run seed migration if tables empty
- Alert admin if seed fails

## Testing Strategy

### Demo Scenario (20 turns)

1. Awaken at inn (turn 1)
2. Talk to Marta (turn 2) — learn about cellar quest
3. Accept quest (turn 3)
4. Go to cellar (turn 4)
5. Fight rats (turns 5-7) — combat tutorial
6. Return to Marta (turn 8) — complete quest, reward
7. Talk to Garrett (turn 9) — learn forest rumor
8. Talk to Sela (turn 10) — learn merchant quest
9. Head to forest (turn 11)
10. Encounter wolves (turns 12-14) — real combat
11. Find hunter's cache (turn 15) — exploration reward
12. Return to inn (turn 16)
13. Rest (turn 17) — healing mechanic
14. Head east (turn 18)
15. Find merchant clues (turn 19)
16. Encounter bandits (turn 20) — harder combat

### Acceptance Test Checklist

- [ ] Character creation → first turn works
- [ ] Opening narration displays correctly
- [ ] All 3 NPCs interactable
- [ ] Cellar quest completable
- [ ] Combat with rats works
- [ ] Forest exploration works
- [ ] Wolf encounter works
- [ ] 20 turns without errors
