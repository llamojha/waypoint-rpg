# Demo Content Reference

This document contains the original demo content that was migrated to the database. It serves as a reference for the seed data structure.

> **Note:** This content now lives in the database tables `waypoint_npcs` and `waypoint_locations`. Do not use these constants in code - query the database instead.

## NPCs

### Lenna (Scholar)
- **Location:** The Waystone
- **Personality:** shy, enthusiastic, curious, kind, slightly awkward
- **Dialogue Hints:**
  - Researching the waystone for months with no results
  - Sent by an academy but feels undervalued
  - Excited by new discoveries
  - Speaks quickly when passionate
  - Blushes easily
  - Has a handmade token she gives to friends (relationship >= 2)
  - Knows the way to Nomante Outpost

### Aran Nomante (Outpost Captain)
- **Location:** Nomante Outpost
- **Personality:** grizzled, practical, honorable, stern but fair, protective
- **Dialogue Hints:**
  - His family has run this outpost for three generations
  - Takes duty seriously
  - Respects those who prove themselves
  - Provides equipment to travelers in need
  - Speaks in short direct sentences

### Adrian (Ranger)
- **Location:** Nomante Outpost
- **Personality:** eager, young, enthusiastic, wants to prove himself, friendly
- **Dialogue Hints:**
  - Aran's right hand and protégé
  - Assigned to the outpost recently
  - Knows the wilderness well
  - Hunts boar for the outpost's food supply
  - Offers hunting quests
  - Rewards helpers with his spare hunting bow

### Helga (Caravan Trader)
- **Location:** Nomante Outpost
- **Personality:** strong, seasoned, practical, warm underneath gruffness, loves blueberries
- **Dialogue Hints:**
  - Runs a trading caravan that stops at the outpost
  - Has traveled many roads
  - Secretly loves blueberry pie
  - Calls rare berries 'mysterious' but they're just blueberries
  - Rewards helpers with her famous pie

### The Wanderer (Mystery)
- **Location:** Windhollow Wilderness (appears randomly, 15% chance)
- **Personality:** enigmatic, cryptic, friendly but distant, all-knowing, vanishes when pressed
- **Dialogue Hints:**
  - Appears randomly on the prairie
  - Wears a hooded cloak that obscures their face
  - Speaks in riddles and hints
  - Knows things they shouldn't
  - Leaves abruptly if questioned too directly
  - Never gives straight answers

---

## Locations

### The Waystone
- **Type:** landmark
- **Region:** Windhollow Vale
- **Description:** An ancient waystone rises from the prairie grass, its weathered surface etched with faded runes. The air around it shimmers faintly.
- **NPCs Present:** Lenna
- **Nearby POIs:** Nomante Outpost, Windhollow Wilderness
- **Image:** `/location_waypoint.png`

### Nomante Outpost
- **Type:** outpost
- **Region:** Windhollow Vale
- **Description:** A sturdy frontier post built from timber and stone. The Nomante family banner flies above the gate - three crossed spears on a field of green.
- **NPCs Present:** Aran Nomante, Adrian, Helga
- **Nearby POIs:** The Waystone, Windhollow Wilderness
- **Image:** `/location_outpost.png`

### Windhollow Wilderness
- **Type:** wilderness
- **Region:** Windhollow Vale
- **Description:** Rolling prairie stretches in every direction, tall grass swaying in the gentle breeze. Wildflowers dot the landscape.
- **NPCs Present:** The Wanderer (random encounter)
- **Nearby POIs:** The Waystone, Nomante Outpost
- **Image:** `/location_wilderness.png`

---

## Database Tables

This content is stored in:
- `waypoint_npcs` - NPC definitions with personality and dialogue hints
- `waypoint_locations` - Location definitions with descriptions and nearby POIs
- `waypoint_character_npcs` - Per-character NPC relationships

See `supabase/migrations/20260104_demo_seed_data.sql` for the seed data.
