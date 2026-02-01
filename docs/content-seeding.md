# Content Seeding: Summerland Island

## Overview

**Island:** Summerland - a tutorial-sized island with 4 regions. Large enough to explore for 4-8 hours, small enough to feel contained.

**Status:** ✅ COMPLETE

---

## Current State

### Regions (4)

| Region | Location | Theme | POIs | NPCs |
|--------|----------|-------|------|------|
| The Highlands | central | highlands anchor | 4 | 6 |
| Stormwall Coast | north | Aran Islands-inspired | 5 | 8 |
| Caledonia | west-south | Sark-inspired | 5 | 15 |
| Dunamar | south-east | La Graciosa-inspired | 5 | 8 |
| **Total** | | | **19** | **37** |

### POIs (19)

| Region | POI | Type |
|--------|-----|------|
| The Highlands | The Waystone | landmark |
| The Highlands | Nomante Outpost | outpost |
| The Highlands | Highlands Wilderness | wilderness |
| The Highlands | The Needleback | mountain |
| Stormwall Coast | Stormwall Coast Wilderness | wilderness |
| Stormwall Coast | Black Fort Ruins | ruins |
| Stormwall Coast | Storm Beach | coastal |
| Stormwall Coast | Brecan Hills | hills |
| Stormwall Coast | The Flotsam Hold | tavern |
| Caledonia | Caledonia Wilderness | wilderness |
| Caledonia | Caledonia City | city |
| Caledonia | The Windmill | landmark |
| Caledonia | The Howling-Spine | isthmus |
| Caledonia | Forel | settlement |
| Dunamar | Dunamar Wilderness | wilderness |
| Dunamar | Caleta de Pedro | settlement |
| Dunamar | Arenales del Sur | dunes |
| Dunamar | Lomas del Sol | hills |
| Dunamar | La Cueva de Aris | cave |

### NPCs (37)

See `docs/summerland-island.md` for full NPC list with personalities.

### Location Connections (42 rows / 21 bidirectional)

- **Inter-region:** All 4 wilderness areas connect to each other
- **Intra-region:** Hub-and-spoke via wilderness
- **Exception:** Forel ↔ The Howling-Spine ↔ Caledonia Wilderness (linear chain)

### Codex Entries

Not yet seeded. Future work.

---

## Database Tables

Content is stored in:
- `waypoint_locations` - 19 locations
- `waypoint_npcs` - 37 NPCs
- `waypoint_rules_location_connections` - 42 connection rows

---

## Related Documentation

- `docs/summerland-island.md` - Full island map and geography
- `demo_island_content_ledger.md` - Source content ledger
