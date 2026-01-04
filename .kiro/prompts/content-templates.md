# Content Generation Templates

Reference schemas for generating Waypoint RPG content. All generated content must match these structures.

## NPC Schema

```json
{
  "name": "string (required) - Full name or title",
  "role": "string (required) - Occupation or function (e.g., 'Blacksmith', 'Scholar', 'Bandit Leader')",
  "location": "string (required) - Primary location where NPC can be found",
  "personality": ["string array (required) - 3-5 personality traits"],
  "dialogueHints": ["string array (required) - 3-7 conversation hooks and behaviors"],
  "portraitUrl": "string (optional) - Generated portrait URL"
}
```

### NPC Example
```json
{
  "name": "Mira the Fence",
  "role": "Black Market Dealer",
  "location": "Ash Coast Outpost",
  "personality": ["cunning", "greedy", "reliable", "secretive", "pragmatic"],
  "dialogueHints": [
    "Speaks in riddles about her merchandise",
    "Always wants a cut of any deal",
    "Has connections throughout the coast",
    "Never reveals her sources",
    "Respects those who keep secrets"
  ]
}
```

### NPC Database Fields
- `name` VARCHAR(100) NOT NULL
- `role` VARCHAR(100)
- `location` VARCHAR(100)
- `personality` JSONB DEFAULT '[]'
- `dialogue_hints` JSONB DEFAULT '[]'
- `portrait_url` TEXT
- `is_preseeded` BOOLEAN DEFAULT TRUE
- `discovered_by` UUID (null for preseeded)

---

## Location Schema

```json
{
  "name": "string (required) - Location name",
  "type": "string (required) - One of: city, ruin, forest, mountain, poi, outpost, landmark, wilderness",
  "region": "string (required) - Parent region name",
  "description": "string (required) - 2-3 sentence atmospheric description",
  "coordinates": { "x": "number", "y": "number" },
  "nearbyPoi": ["string array - Names of nearby locations"],
  "entities": ["string array - NPC IDs present at this location"],
  "artUrl": "string (optional) - Generated location art URL"
}
```

### Location Example
```json
{
  "name": "The Salted Barrel",
  "type": "poi",
  "region": "Ash Coast",
  "description": "A weathered tavern perched on the cliff's edge, its salt-crusted windows overlooking the churning sea below. The smell of fish stew and cheap ale permeates the air.",
  "coordinates": { "x": 45, "y": 78 },
  "nearbyPoi": ["Ash Coast Docks", "Fisherman's Row"],
  "entities": ["mira", "old-sal"]
}
```

### Location Database Fields
- `name` VARCHAR(100) NOT NULL
- `type` VARCHAR(50)
- `region` VARCHAR(100)
- `description` TEXT
- `coordinates` JSONB
- `art_url` TEXT
- `is_preseeded` BOOLEAN DEFAULT TRUE
- `discovered_by` UUID (null for preseeded)

---

## Quest Schema

```json
{
  "title": "string (required) - Quest name",
  "description": "string (required) - Quest overview and hook",
  "totalProgress": "number (required) - Number of steps to complete",
  "leads": ["string array (required) - Actionable hints for each step"],
  "relatedNpcs": ["string array - NPCs involved in this quest"],
  "relatedLocations": ["string array - Locations involved in this quest"]
}
```

### Quest Example
```json
{
  "title": "The Missing Caravan",
  "description": "A merchant caravan vanished on the coastal road three days ago. The guild is offering a reward for information—or the recovery of their goods.",
  "totalProgress": 3,
  "leads": [
    "Ask around the Salted Barrel for rumors about the road",
    "Investigate the last known location near Widow's Point",
    "Confront whoever is responsible and recover the goods"
  ],
  "relatedNpcs": ["mira", "caravan-master-henrick"],
  "relatedLocations": ["The Salted Barrel", "Widow's Point", "Coastal Road"]
}
```

### Quest Database Fields
- `title` VARCHAR(200) NOT NULL
- `description` TEXT
- `total_progress` INT DEFAULT 1
- `leads` JSONB DEFAULT '[]'
- `is_preseeded` BOOLEAN DEFAULT TRUE

---

## Codex Entry Schema

```json
{
  "title": "string (required) - Entry title",
  "category": "string (required) - One of: Bestiary, Factions, Locations, History, Magic",
  "text": "string (required) - Full entry text (1-3 paragraphs)",
  "status": "string (required) - 'canon' or 'rumor'",
  "tags": ["string array - Searchable tags"],
  "imageUrl": "string (optional) - Illustration URL"
}
```

### Codex Example
```json
{
  "title": "The Ash Coast Trading Company",
  "category": "Factions",
  "text": "The Ash Coast Trading Company controls most legitimate commerce along the eastern seaboard. Founded three generations ago by the Valdris family, the Company maintains a network of outposts, warehouses, and protected trade routes. Their blue-and-silver banners are a common sight in any coastal settlement.\n\nRumors persist of the Company's involvement in less savory dealings—smuggling, protection rackets, and the occasional disappearance of competitors. The current head, Elara Valdris, dismisses such talk as jealous slander.",
  "status": "canon",
  "tags": ["faction", "trade", "ash-coast", "valdris"]
}
```

### Codex Database Fields
- `title` VARCHAR(200) NOT NULL
- `category` VARCHAR(50) NOT NULL
- `text` TEXT
- `status` VARCHAR(20) DEFAULT 'canon'
- `tags` JSONB DEFAULT '[]'
- `image_url` TEXT
- `discovered_by` UUID (null for preseeded)

---

## World News/Event Schema

```json
{
  "title": "string (required) - News headline",
  "text": "string (required) - News content (1-2 paragraphs)",
  "newsType": "string (required) - One of: discovery, event, rumor, announcement",
  "status": "string (required) - 'canon' or 'rumor'",
  "relatedEntityType": "string (optional) - 'npc', 'location', 'quest'",
  "relatedEntityId": "string (optional) - UUID of related entity"
}
```

### World News Example
```json
{
  "title": "Caravan Attacks on the Rise",
  "text": "Merchants traveling the coastal road report an increase in bandit activity over the past fortnight. The Ash Coast Trading Company has doubled its guards, but smaller traders are being forced to travel in convoys or risk losing everything.",
  "newsType": "event",
  "status": "canon",
  "relatedEntityType": "location",
  "relatedEntityId": null
}
```

---

## Interconnection Guidelines

When generating content, always consider connections:

### NPC Connections
- Which location do they primarily inhabit?
- Which other NPCs do they know or interact with?
- Are they involved in any quests?
- Do they belong to any factions mentioned in the codex?

### Location Connections
- Which NPCs can be found here?
- What quests involve this location?
- What's nearby (2-3 other locations)?
- Is there relevant lore in the codex?

### Quest Connections
- Which NPCs give or are involved in this quest?
- Which locations must be visited?
- Does this quest reveal codex-worthy information?
- Does completing this quest generate world news?

### Codex Connections
- Which NPCs are members of described factions?
- Which locations are mentioned?
- Does this lore affect any quests?

---

## Image Prompt Templates

### NPC Portrait Prompt
```
Fantasy portrait of [name], a [role].
Personality: [trait1], [trait2], [trait3].
Setting: [location context].
Style: painterly fantasy art, expressive face, warm lighting.
Aspect: 1:1 square, head and shoulders.
```

### Location Art Prompt
```
Fantasy landscape of [location name].
[Description excerpt].
Time: [day/dusk/night].
Weather: [weather].
Style: painterly fantasy environment, atmospheric, wide shot.
Aspect: 16:9 landscape.
```

---

## Output File Naming

Save generated content to `data/generated/` with this naming convention:
- NPCs: `npc-<kebab-case-name>.json`
- Locations: `location-<kebab-case-name>.json`
- Quests: `quest-<kebab-case-title>.json`
- Codex: `codex-<kebab-case-title>.json`
- News: `news-<kebab-case-title>.json`
