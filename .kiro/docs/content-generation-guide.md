# Content Generation Guide

How to use the Waypoint Content Generator agent to create game content.

## Quick Start

1. Switch to the content generator agent:
   ```
   /agent content-generator
   ```

2. Tell it what you want to generate:
   ```
   > I want to create some NPCs for the Ash Coast region
   ```

3. Answer the agent's questions about the content

4. Review and approve the generated content

5. Seed to database:
   ```
   npx tsx scripts/seed-content.ts
   ```

---

## Example Sessions

### Generating an NPC

```
You: I need to create a new NPC for the Ash Coast

Agent: I'd be happy to help create an NPC for the Ash Coast! Let me ask a few questions:

1. What role should this NPC fill? (merchant, guard, quest-giver, etc.)
2. Should they be connected to any existing NPCs or factions?
3. What's their general disposition? (friendly, suspicious, neutral)

You: A shady information broker who hangs out at the docks. Should know Mira the Fence.

Agent: Here's the NPC I've created:

{
  "name": "Whisper",
  "role": "Information Broker",
  "location": "Ash Coast Docks",
  "personality": ["secretive", "observant", "mercenary", "well-connected", "paranoid"],
  "dialogueHints": [
    "Never uses real names, only nicknames",
    "Charges for every piece of information",
    "Has eyes and ears throughout the docks",
    "Knows Mira the Fence - they have a professional arrangement",
    "Speaks in hushed tones, always watching the door"
  ]
}

Should I save this to data/generated/npc-whisper.json?

You: Yes, and can you generate a portrait?

Agent: I'll save the NPC and generate a portrait...
[Saves file]
[Runs image generation]

Portrait generated! The image URL has been saved. Would you like to create any related content - perhaps a quest involving Whisper, or flesh out the Ash Coast Docks location?
```

### Generating a Location

```
You: Create a location - the tavern where Whisper operates

Agent: I'll create a tavern for the Ash Coast Docks area. A few questions:

1. What's the atmosphere? (rough dive, respectable establishment, hidden speakeasy)
2. Any other NPCs who should be present here?
3. What makes this place notable?

You: Rough dive bar, sailors and dockworkers. Known for not asking questions.

Agent: Here's the location:

{
  "name": "The Drowned Anchor",
  "type": "poi",
  "region": "Ash Coast",
  "description": "A salt-stained tavern wedged between two warehouses, its sign depicting a barnacle-encrusted anchor. The air inside is thick with pipe smoke and the smell of cheap rum. Sailors, dockworkers, and those who prefer not to be noticed crowd the dim interior.",
  "coordinates": { "x": 52, "y": 81 },
  "nearbyPoi": ["Ash Coast Docks", "Fisherman's Row", "The Salted Barrel"],
  "entities": ["whisper"]
}

Save to data/generated/location-the-drowned-anchor.json?
```

### Generating a Quest

```
You: Create a quest that involves Whisper and leads to discovering something about the missing caravans

Agent: A quest connecting Whisper to the caravan mystery. Let me ask:

1. How many steps should this quest have?
2. What's the reward or outcome?
3. Should it be a main quest or side quest?

You: 3 steps, side quest, leads to information about who's behind the attacks

Agent: Here's the quest:

{
  "title": "Whispers on the Wind",
  "description": "The information broker known as Whisper claims to know something about the caravan disappearances—but information has a price.",
  "totalProgress": 3,
  "leads": [
    "Find Whisper at The Drowned Anchor and negotiate a price for information",
    "Complete Whisper's task: retrieve a ledger from a rival's office",
    "Return to Whisper to learn what they know about the caravan attacks"
  ],
  "relatedNpcs": ["whisper"],
  "relatedLocations": ["The Drowned Anchor", "Ash Coast Docks"]
}

This quest connects to the existing "Missing Caravan" storyline. Save it?
```

---

## Content Types Reference

| Type | Command Example | Output File |
|------|-----------------|-------------|
| NPC | "Create an NPC..." | `npc-<name>.json` |
| Location | "Create a location..." | `location-<name>.json` |
| Quest | "Create a quest..." | `quest-<title>.json` |
| Codex | "Create a codex entry..." | `codex-<title>.json` |
| News | "Create a world event..." | `news-<title>.json` |

---

## Tips for Effective Generation

### Be Specific About Connections
Instead of: "Create an NPC"
Say: "Create an NPC who works with Mira the Fence and operates in the Ash Coast"

### Provide Tone Guidance
Instead of: "Create a tavern"
Say: "Create a seedy dockside tavern where criminals meet"

### Build Incrementally
1. Start with a location
2. Add NPCs who inhabit it
3. Create quests that involve them
4. Add codex entries for factions/lore
5. Generate world news about events

### Review Before Seeding
Always use `--dry-run` first:
```bash
npx tsx scripts/seed-content.ts --dry-run
```

---

## Seeding Commands

```bash
# Preview all content
npx tsx scripts/seed-content.ts --dry-run

# Seed everything
npx tsx scripts/seed-content.ts

# Seed only specific type
npx tsx scripts/seed-content.ts --type=npc
npx tsx scripts/seed-content.ts --type=location
npx tsx scripts/seed-content.ts --type=quest
```

---

## Troubleshooting

### Image Generation Fails
- Make sure the dev server is running: `npm run dev`
- Check that `GEMINI_API_KEY` is set in `.env.local`

### Content Not Matching Schema
- Reference `.kiro/prompts/content-templates.md` for exact field requirements
- Ask the agent to validate the content before saving

### Seeding Fails
- Check Supabase credentials in `.env.local`
- Ensure `SUPABASE_SERVICE_KEY` is set (not just the anon key)
- Run with `--dry-run` to see what would be inserted
