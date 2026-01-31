# Shared World Vision (Post-MVP)

> **Status**: Planning document — captures future direction without changing MVP scope.
> **Last Updated**: 2026-01-30

## Core Differentiator

Waypoint is a **shared persistent fantasy world** — not instanced story chats. This positions it as a **text MUD/MMO successor** rather than competing with AI Dungeon, Fables.gg, AI Realm, or Old Greg's Tavern (all fully instanced).

**Key insight**: All current AI RPG competitors are instanced story generators. Even "multiplayer" means "friends in the same private campaign." The shared persistent world angle is unoccupied territory.

---

## Global Weather System (Implemented)

Weather is **shared across all players** per region, changing once per real-world day.

| Aspect | How It Works |
|--------|--------------|
| **Weather types** | Clear, Cloudy, Rain, Storm, Foggy, Snow, Wind, Heatwave |
| **Schedule** | Pre-generated weekly forecast with logical transitions |
| **Shared** | All players in same region see same weather |
| **Lazy generation** | Schedule generated on first request of a new day |

**Future enhancement**: Vercel cron job to update weather on schedule (currently lazy-loaded on turn start).

---

## Epoch Time Model

The world runs on **epochs** (real-world weeks), not continuous time. This solves the busy-friendly vs shared-world tension.

| Aspect | How It Works |
|--------|--------------|
| **World time** | Advances in discrete epochs (e.g., every Monday = new in-game epoch) |
| **Personal time** | Your adventure happens "within" the current epoch |
| **Catch-up** | If you miss epochs, you get a "time has passed" summary — no punishment |
| **Events** | Community events tied to epochs ("This epoch: the Harvest Festival") |
| **Busy-friendly** | Play 1 turn or 100 turns — you're still in the same epoch as everyone |

**Story justification**: Eldoria experiences time in "seasons of fate" — adventurers slip in and out of the flow, but the world's major beats happen on a cosmic rhythm.

### Schema Implications (Future)

```sql
-- Global epoch tracking
CREATE TABLE waypoint_epochs (
  id SERIAL PRIMARY KEY,
  epoch_number INT UNIQUE NOT NULL,
  name VARCHAR(100),              -- "The Harvest Moon", "Season of Storms"
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  world_state_snapshot JSONB      -- Major world state at epoch start
);

-- Replace per-character time_day with epoch reference
-- waypoint_world_state.epoch_id instead of time_day/time_phase
```

---

## Shared Presence

Players should feel others exist in the world without real-time multiplayer complexity.

### Phase 1: Soft Presence (Post-MVP)

- Show "X adventurers are in this region" (count only)
- No direct interaction, just awareness

### Phase 2: Location Activity Feed (Post-MVP)

- Shared activity log per location
- Examples:
  - "Kira defeated a dire wolf near the eastern gate"
  - "Marcus discovered a hidden passage in the ruins"
  - "A stranger was seen speaking with the blacksmith"

### Implementation Notes

- Activity feed is **read-only** — no chat, just broadcasts
- Throttle to prevent spam (max 1 entry per player per location per hour)
- Filter for "interesting" events only (combat victories, discoveries, quest progress)

---

## World News (Enhanced)

Evolve the current "News" system into **World News** — a living newspaper of Eldoria.

### Content Types

| Type | Source | Example |
|------|--------|---------|
| **World Events** | Epoch system | "The Harvest Festival begins in Ashford" |
| **NPC Quests** | Lorekeeper | "Rumors say the blacksmith seeks a rare ore" |
| **Player Achievements** | Validated events | "An adventurer slew the Cavern Wyrm" |
| **Discoveries** | Player actions | "A new path was found in the Whispering Woods" |
| **Rumors** | LLM-generated | "Whispers of dark magic in the northern marshes" |

### Display Priority

1. Unread items first
2. Current epoch events
3. Recent player achievements
4. Persistent rumors/quests

---

## Community Events (Post-MVP)

GW2-style events tied to epochs.

### Event Structure

```typescript
interface WorldEvent {
  id: string;
  epoch_id: number;
  title: string;                    // "Bandit Raid on Ashford"
  description: string;
  type: 'defense' | 'gathering' | 'exploration' | 'boss';
  location: string;
  progress: number;                 // 0-100, community-wide
  goal: number;                     // e.g., "Defeat 100 bandits"
  participants: string[];           // character_ids who contributed
  rewards: EventReward[];
  status: 'upcoming' | 'active' | 'completed' | 'failed';
}
```

### Participation Tracking

- Any player action that matches event criteria contributes
- Lorekeeper detects relevance: "Player fought bandits near Ashford during raid event"
- Progress is global — all players contribute to same pool

### Reward Distribution

- **Participation rewards**: Anyone who contributed gets base reward
- **Scaling rewards**: More contribution = better rewards
- **Epoch completion bonus**: If event succeeds, all active players get bonus

**Note**: Reward balancing handled by Lorekeeper to prevent exploitation.

---

## NPC Concurrency

### Problem

Two players talking to the same NPC simultaneously could cause contradictions.

### Solution: Instanced Interactions, Shared World

Players have **instanced experiences** within the shared world — no locking, no queues.

| Layer | Shared or Instanced |
|-------|---------------------|
| World state (epoch, events, major changes) | **Shared** |
| NPCs (existence, base personality, location) | **Shared** |
| Locations (existence, description, discoveries) | **Shared** |
| NPC conversations | **Instanced** |
| Quest progress | **Instanced** (per character) |
| Combat encounters | **Instanced** |

### How It Works

- Player A talks to the blacksmith → their own conversation
- Player B talks to the blacksmith at the same time → their own conversation
- Both can accept the same quest, complete it independently
- **No locking, no queues**

### What Stays Consistent

- If Player A's actions cause a **major world change** (e.g., kills a unique boss), that propagates to shared state
- Lorekeeper ensures **reward consistency** — quest rewards are per-character, not duplicated globally
- NPC **base state** can evolve from aggregate interactions (soft influence over time)

### Future Enhancement

- Post-MVP: Explore **real shared presence** in hub zones only
- Hub zones could have synchronized NPC interactions (one conversation visible to all)
- Rest of world remains instanced for scalability

---

## World State & Canon

### Current Architecture (MVP)

- `waypoint_world_state` is **per-character** (instanced)
- NPCs and locations are **global** (shared)

### Future: Shared World State Layer

```sql
-- Global world state (affects all players)
CREATE TABLE waypoint_global_state (
  id UUID PRIMARY KEY,
  epoch_id INT REFERENCES waypoint_epochs(id),
  key VARCHAR(100) NOT NULL,        -- "ashford_gate_status"
  value JSONB NOT NULL,             -- { "status": "destroyed", "destroyed_by": "player_id" }
  updated_at TIMESTAMPTZ,
  updated_by UUID                   -- character_id who caused change
);
```

### What Affects Global State

| Action Type | Global Impact | Example |
|-------------|---------------|---------|
| **Major events** | Full state change | "Player destroyed the bridge" |
| **NPC interactions** | Soft influence | "NPC disposition shifts slightly toward distrust" |
| **Discoveries** | Permanent unlock | "Hidden cave now known to all" |
| **Quest completion** | World progression | "Bandit leader defeated — raids stop" |

### Canon Conflict Resolution

1. **First-write wins** for major events (Arbiter validates)
2. **Aggregate influence** for soft changes (average of player interactions)
3. **Epoch snapshots** preserve state at epoch boundaries
4. **Lorekeeper** maintains consistency — rejects contradictions

### NPC/Location Evolution

- NPCs and locations have **base state** (from DB)
- **Soft modifiers** accumulate from player interactions
- Major changes require **Arbiter approval** and create **World News**
- Example: "After many adventurers helped him, the blacksmith's disposition improved from 'gruff' to 'friendly'"

---

## Communication Roadmap

### MVP (Current)

- World News system (one-way broadcast)
- No player-to-player communication

### Post-MVP Phase 1: Enhanced World News

- Activity feeds per location
- Player achievement broadcasts
- NPC quest rumors

### Post-MVP Phase 2: Social Hubs

- Specific locations (taverns, guild halls) become **hub zones**
- Hub zones have:
  - Shared chat (text-based, async-friendly)
  - Visible player list ("Who's here")
  - NPC interactions visible to all in hub
  - Bulletin boards for player messages

### Future Consideration: Hub NPCs

- NPCs in hubs can be talked to by multiple players
- Conversation is semi-public (others see summaries)
- NPC state affected by collective interactions

---

## Implementation Priority

| Feature | Priority | Phase | Dependency |
|---------|----------|-------|------------|
| Epoch time model | High | Post-MVP 1 | Schema migration |
| World News enhancement | High | Post-MVP 1 | None |
| Soft presence (counts) | Medium | Post-MVP 1 | None |
| Location activity feed | Medium | Post-MVP 1 | Event tracking |
| Community events | Medium | Post-MVP 2 | Epoch system |
| Social hubs | Low | Post-MVP 3 | Activity feed |
| Hub NPCs | Low | Future | Hub system |

---

## Open Questions

1. **Epoch duration**: 1 real week = 1 epoch? Or shorter for faster progression?
2. **Event frequency**: How many community events per epoch?
3. **Hub locations**: Which POIs become hubs? All taverns? Guild halls only?
4. **Moderation**: How to handle inappropriate player messages in hubs?
5. **NPC memory**: Should NPCs remember individual players or just aggregate sentiment?
