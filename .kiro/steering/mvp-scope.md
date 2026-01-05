# MVP Scope & Acceptance Criteria

## In Scope (MVP)

### Character System

- Simple creation: Name + optional Gender + Portrait
- All humans (other races exist as NPCs in world)
- No stats (STR/DEX/CON/INT/WIS/CHA removed)
- No character-level XP (overall level = sum of skill levels)
- Skill progression with power words (emergent "class" from playstyle)
- Equipment slots (8 slots)
- Inventory management
- Conditions (buffs/debuffs)
- Magic locked by default (`isMagicUnlocked: false`)

### Turn-Based Gameplay

- Player text input → DM narration response
- SSE streaming for narration
- Skill checks with d20 rolls
- Suggested actions after each turn
- Turn history with diffs

### Mechanics

- Power word detection and bonuses
- Skill checks (DM triggers, player rolls)
- Inventory equip/unequip
- Quest progression (rumor → active → complete)
- NPC relationship tracking (-5 to +5)

### World

- Single persistent world (Eldoria)
- Location/POI system
- Time progression (day/phase)
- Weather system
- World memories (canon/news)

### Safety

- PG-13 content rating
- Input/output filtering
- Refusal/rewrite for unsafe content

## Acceptance Criteria (Demo-Ready)

- [ ] Create character with Name + Portrait
- [ ] Start adventure in persistent world
- [ ] Play 20+ turns with SSE streaming
- [ ] Complete ≥3 skill checks end-to-end
- [ ] Equip/unequip items reflected in narration
- [ ] Interact with ≥2 NPCs
- [ ] Change 1 NPC relationship (persists)

## Deferred to Phase 4 (Post-Demo)

- [ ] Discover ≥2 rumors
- [ ] Convert 1 rumor to quest
- [ ] Advance/complete 1 quest

## Shared World Features (MVP)

### News System ("World Newspaper")

When players discover significant content, it propagates to all players:

| Discovery Type   | News Entry                                                           |
| ---------------- | -------------------------------------------------------------------- |
| New NPC          | "A mysterious figure known as [Name] has been spotted in [Location]" |
| New Location     | "Explorers report finding [Location] in the [Region]"                |
| Major Event      | "Word spreads of [Event] at [Location]"                              |
| Quest Completion | "Tales tell of an adventurer who [Achievement]"                      |

**Implementation:**

- Discoveries insert to global `world_news` table
- Players see unread news in RightColumn "News" section
- News has `created_at`, players track `last_read_at`
- News can be marked as `canon` (verified) or `rumor` (unverified)

**What triggers news:**

- NPC discovered (via `npc_discovered` event)
- Location first visited
- Quest completed
- Significant world state change

### Shared Discovery Pattern

1. Player discovers NPC/location via gameplay
2. World Arbiter validates and registers in global DB
3. News entry created with timestamp
4. Other players see news on next session load
5. Discovered content becomes available for all players

## Explicit Non-Goals (Post-MVP)

- Multiplayer / co-op (real-time)
- Character stats (STR/DEX/CON/INT/WIS/CHA)
- Character-level XP progression
- Full tactical combat with maps
- Community marketplace
- Long-term vector memory
- Voice input/output
- Mobile native apps

## Post-MVP Considerations

### Living World (Future)

Features to explore after MVP stability:

**Time-Based World Events**

- Weather shifts on schedule (not just per-turn)
- NPC movements between locations
- Seasonal changes affecting gameplay
- World events triggered by calendar

**Consequences Between Sessions**

- Actions have delayed effects
- NPCs remember and react over time
- Quest deadlines that progress without player
- Reputation spreading to other regions

**Async Multiplayer Effects**

- Player actions affecting shared world state
- Faction standings influenced by collective player choices
- World bosses / events requiring community effort

These features require careful design to avoid:

- Players feeling punished for not playing
- State conflicts between concurrent players
- Runaway world state divergence

## Demo Talking Points

1. "AI + real game state" - visible diffs prove consistency
2. Deterministic mechanics - rolls happen server-side
3. Streamed narration - feels responsive
4. Not just a chat log - structured panels show truth
5. Skill-based progression - your playstyle defines your character
