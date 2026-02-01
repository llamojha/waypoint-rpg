# Summerland Island

The demo/tutorial island for Waypoint RPG.

## Island Map

```
                              ╔═══════════════════════════════════════════╗
                              ║            S U M M E R L A N D            ║
                              ╚═══════════════════════════════════════════╝

                                    ┌─────────────────────────────────────┐
                                    │       STORMWALL COAST (north)       │
                                    │                                     │
                                    │         Black Fort Ruins            │
                                    │         Storm Beach                 │
                                    │         Brecan Hills                │
                                    │         The Flotsam Hold            │
                                    │              ↕ all via ↕            │
                                    │     Stormwall Coast Wilderness      │
                                    └───────────────────┬─────────────────┘
                                                        │
                    ┌───────────────────────────────────┼───────────────────────────────────┐
                    │                                   │                                   │
                    ↕                                   ↕                                   ↕
┌───────────────────────────────────┐   ┌───────────────────────────┐   ┌───────────────────────────────────┐
│       CALEDONIA (west-south)      │   │    THE HIGHLANDS (central)│   │        DUNAMAR (south-east)       │
│                                   │   │                           │   │                                   │
│  Forel ←→ The Howling-Spine       │   │      The Needleback       │   │         La Cueva de Aris          │
│              (linear chain)       │   │      The Waystone         │   │         Lomas del Sol             │
│              ↕                    │   │      Nomante Outpost      │   │         Caleta de Pedro           │
│  Caledonia City                   │←─→│           ↕ all via ↕     │←─→│         Arenales del Sur          │
│  The Windmill                     │   │    Highlands Wilderness   │   │           ↕ all via ↕             │
│       ↕ all via ↕                 │   │                           │   │       Dunamar Wilderness          │
│  Caledonia Wilderness             │   │                           │   │                                   │
└───────────────┬───────────────────┘   └─────────────┬─────────────┘   └─────────────────┬─────────────────┘
                │                                     │                                   │
                └─────────────────────────────────────┼───────────────────────────────────┘
                                                      │
                                    (all 4 wilderness areas interconnect)
```

## Regions

| Region | Location | Theme | Description |
|--------|----------|-------|-------------|
| The Highlands | central / uplands | highlands anchor | Upland core region with The Needleback mountain and the island's central landmark (The Waystone). |
| Stormwall Coast | north | Aran Islands-inspired | Glacio-karst coastline: exposed rock, limestone features, harsh wind, cold surf. Flotsam economy. |
| Caledonia | west-south | Sark-inspired | Coastal region with port capital, wind corridor isthmus, windmill landmark, wilderness interior. |
| Dunamar | south-east | La Graciosa-inspired | Arid region: bushes, dry soil, huge sand dunes, isolated hills, cave system. |

## POIs by Region

### The Highlands (4 POIs, 6 NPCs)

| POI | Type | Description |
|-----|------|-------------|
| The Waystone | landmark | Ancient waystone with faded runes. Starting location. |
| Nomante Outpost | outpost | Frontier post run by the Nomante family. |
| Highlands Wilderness | wilderness | Rolling upland prairie, tall grass, wildflowers. Regional hub. |
| The Needleback | mountain | Mountain with sheep farms. |

### Stormwall Coast (5 POIs, 8 NPCs)

| POI | Type | Description |
|-----|------|-------------|
| Stormwall Coast Wilderness | wilderness | Harsh coastal terrain, exposed rock, wind-battered. Regional hub. |
| Black Fort Ruins | ruins | Ancient ruins, no permanent inhabitants. |
| Storm Beach | coastal | Boulder-strewn beach, fishing spot. |
| Brecan Hills | hills | Isolated hills where Ronan lives alone. |
| The Flotsam Hold | tavern | Tavern and storage hub for flotsam hunters. |

### Caledonia (5 POIs, 15 NPCs)

| POI | Type | Description |
|-----|------|-------------|
| Caledonia Wilderness | wilderness | Coastal wilderness interior. Regional hub. |
| Caledonia City | city | Port capital, largest settlement on the island. |
| The Windmill | landmark | Windmill staffed by miller/farmer. |
| The Howling-Spine | isthmus | Wind-corridor isthmus connecting to Forel. |
| Forel | settlement | Land spur with scholar camp at the end of the isthmus. |

### Dunamar (5 POIs, 8 NPCs)

| POI | Type | Description |
|-----|------|-------------|
| Dunamar Wilderness | wilderness | Arid terrain with bushes and dry soil. Regional hub. |
| Caleta de Pedro | settlement | Small coastal settlement. |
| Arenales del Sur | dunes | Massive sand dunes. |
| Lomas del Sol | hills | Arid hills with hunters. |
| La Cueva de Aris | cave | Cave system; Aris appears only after deep exploration. |

## Connection Rules

### Inter-Region (6 connections)
All 4 wilderness areas connect to each other:
- Highlands Wilderness ↔ Stormwall Coast Wilderness
- Highlands Wilderness ↔ Caledonia Wilderness
- Highlands Wilderness ↔ Dunamar Wilderness
- Stormwall Coast Wilderness ↔ Caledonia Wilderness
- Stormwall Coast Wilderness ↔ Dunamar Wilderness
- Caledonia Wilderness ↔ Dunamar Wilderness

### Intra-Region (hub-and-spoke)
Within each region, all POIs connect to the wilderness (hub):

**The Highlands:**
- Highlands Wilderness ↔ The Waystone
- Highlands Wilderness ↔ Nomante Outpost
- Highlands Wilderness ↔ The Needleback

**Stormwall Coast:**
- Stormwall Coast Wilderness ↔ Black Fort Ruins
- Stormwall Coast Wilderness ↔ Storm Beach
- Stormwall Coast Wilderness ↔ Brecan Hills
- Stormwall Coast Wilderness ↔ The Flotsam Hold

**Caledonia (with linear chain exception):**
- Caledonia Wilderness ↔ Caledonia City
- Caledonia Wilderness ↔ The Windmill
- Caledonia Wilderness ↔ The Howling-Spine
- The Howling-Spine ↔ Forel (linear chain, Forel not directly connected to wilderness)

**Dunamar:**
- Dunamar Wilderness ↔ Caleta de Pedro
- Dunamar Wilderness ↔ Arenales del Sur
- Dunamar Wilderness ↔ Lomas del Sol
- Dunamar Wilderness ↔ La Cueva de Aris

## NPC Summary

| Region | NPCs | Count |
|--------|------|-------|
| The Highlands | Lucie, Aran Nomante, Adrian, Helga, The Wanderer, Dave | 6 |
| Stormwall Coast | Morag, Eoin, Domhnall, Finlay, Ian, Dougal, Ciaran, Ronan | 8 |
| Caledonia | Camille Durand, Rémi Lefèvre, Colette Marchand, Élodie Perrin, Luc Renard, Brigitte Lenoir, Tomas Vautrin, Mireille Garnier, Gaspard Morel, Bastien Caron, Jules Boucher, Ansel Renaud, Baroness Solène de Vallois, Thierry Marais, Armand Leclair | 15 |
| Dunamar | Pedro, Alba, Raúl, Héctor "La Voz", Nicolás, Celia, Nerea, Aris | 8 |
| **Total** | | **37** |

## Totals

- **Regions:** 4
- **POIs:** 19
- **NPCs:** 37
- **Connections:** 34 bidirectional
