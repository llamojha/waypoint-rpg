# Waypoint Architecture

## Core Principles

### 1. LLM Proposes, Code Disposes

The LLM cannot directly mutate game state. All state changes flow through validated diffs, with deterministic code handling mechanics.

### 2. Never Lose Context (Competitive Advantage)

**Waypoint NEVER trims, summarizes, or forgets conversation history.**

Unlike competitors who limit context to 5-8 messages for cost savings, Waypoint leverages Gemini's 1M token context window to maintain complete narrative history. This enables:

- Narrative callbacks to events from hours ago
- Character development arcs spanning the entire adventure  
- Story coherence that competitors cannot match
- NPCs that truly "remember" everything

> **This is our key differentiator.** Competitors sacrifice narrative quality for cost. We don't.

## Hybrid Architecture: LLM + Code

| Layer | Responsibility | Examples |
|-------|----------------|----------|
| LLM (judgment) | Decide what to do | Intent detection, context relevance, narrative |
| LLM Read Tools | Fetch data for decisions | `query_codex()`, `get_npcs_at_location()` |
| LLM Proposal Tools | Structured output for changes | `propose_stat_change()`, `propose_relationship_change()` |
| Code Layer | Execute deterministic logic | Dice rolls, modifier calculation, validation rules |
| Code Layer | Apply state changes | DB updates after Arbiter approval |

## Data Flow

```
Player Input
    │
    ▼
┌─────────────────┐
│Content Sentinel │  ◄── Filters unsafe user input
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Rune Marshal   │ ◄── Intent detection (skill, DC, power words)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Orchestrator   │ ◄── LLM: Read tools + proposal tools
│                 │     Outputs: intent, proposed_events
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌──────────┐
│Arbiter │ │Lorekeeper│  ◄── PARALLEL (validation + lore fetch)
└────┬───┘ └────┬─────┘
     │          │
     └────┬─────┘
          ▼
   ┌─────────────┐
   │  Collector  │  ◄── Gathers: approved events + lore context
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │ Apply State │  ◄── DB writes, returns consequences
   └──────┬──────┘      (NPC died, quest completed, etc.)
          │
          ▼
   ┌─────────────┐
   │  Collector  │  ◄── Merges: lore + events + consequences
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │ Chronicler  │  ◄── LLM: Narration with full context
   └──────┬──────┘
          │
     UI / Client
```

### Collector (Code Layer)

The Collector is a pure code function that coordinates the pipeline:

1. **First pass**: Gathers outputs from parallel agents (Arbiter + Lorekeeper)
2. **Second pass**: After Apply State, merges in consequences for Chronicler

This ensures Chronicler knows the full picture including side effects (e.g., "NPC HP reached 0" → can narrate death).

## Tool Categories

### Read Tools (LLM-initiated data retrieval)

LLM decides WHAT to query, code executes and returns data:

| Tool | Agent | Purpose |
|------|-------|---------|
| `get_power_word_tier()` | Orchestrator | Lookup tier/bonus from SKILL_TREE |
| `get_skill_level()` | Orchestrator | Fetch current skill progression |
| `query_codex()` | Lorekeeper | Fetch canon entries |
| `get_npcs_at_location()` | Lorekeeper | Who's present |
| `check_npc_exists()` | Arbiter | Registry lookup |
| `get_npc_voice()` | Chronicler | Dialogue hints |

### Proposal Tools (LLM structured output)

LLM outputs structured proposals, code validates and applies:

| Tool | Purpose |
|------|---------|
| `detect_intent` | Skill check requirements |
| `propose_stat_change` | HP/gold changes |
| `propose_inventory_add` | New items |
| `propose_relationship_change` | NPC relationship delta |
| `propose_quest_progress` | Quest state update |
| `propose_npc_discovered` | Register new NPC |
| `validate_event` | Arbiter approval/rejection |

### Code Layer (no LLM involvement)

| Operation | When |
|-----------|------|
| Dice rolls | After Orchestrator outputs DC |
| Modifier calculation | Before roll resolution |
| Relationship cap (±2) | After Arbiter approval |
| HP/Gold bounds | After Arbiter approval |
| Item stat validation | During Arbiter phase |
| Content filtering | After Chronicler |
| State persistence | After all validation |

## Context Injection

Agents receive static context via prompt (not tool calls):

| Agent | Injected Context |
|-------|------------------|
| Orchestrator | SKILL_TREE, character state, location, recent turns |
| Lorekeeper | Current location, entity refs |
| Arbiter | Game rules, item bounds |
| Chronicler | Validated events, roll outcomes |

## State Authority

- Backend state is **authoritative** (single source of truth)
- UI panels reflect backend state, never LLM output directly
- Narration must match validated state, not the other way around
- All mutations happen in code after Arbiter approval

## Module Boundaries

| Module    | Responsibility                                      |
| --------- | --------------------------------------------------- |
| World     | Location, time, weather, POIs, entities present     |
| Character | HP, gold, inventory, equipment, skills, conditions  |
| Adventure | Turns, quests, rumors, session history              |
| Rules     | Skill checks, power word detection, roll resolution |
| Memory    | NPC relationships, world memories, codex entries    |
| Mechanics | Dice rolls, modifier calculation, bounds checking   |
| Streaming | SSE segments for narration delivery                 |
| UI        | React components reflecting validated state         |

## Key Types (from types.ts)

- `GameState`: Root state container
- `Turn`: Player action + narration + mechanics + diffs
- `TurnDiff`: Atomic state change (news/quest/relationship/inventory/stat/world/skill)
- `Character`: Simplified model (name, gender?, hp, gold, skills, equipment, inventory, conditions)
- `WorldContext`: Current location, time, weather, memories

Note: Character no longer has stats (STR/DEX/etc.), level, xp, race, class, or background.

## Shared World Model

> **See `docs/shared-world-vision.md`** for full details on the shared world vision.

Waypoint is a **shared persistent world** with **instanced interactions**:

| Layer | Shared or Instanced |
|-------|---------------------|
| World state (epoch, events, major changes) | **Shared** |
| NPCs (existence, base personality, location) | **Shared** |
| Locations (existence, description, discoveries) | **Shared** |
| NPC conversations | **Instanced** (per character) |
| Quest progress | **Instanced** (per character) |
| Combat encounters | **Instanced** (per character) |

This means:
- Players exist in the same world and see the same NPCs/locations
- Individual interactions (conversations, quests, combat) don't block other players
- Major world changes propagate to all players via World News
- No locking or queues for NPC interactions

## Anti-Patterns to Avoid

- LLM directly setting HP, gold, inventory
- LLM rolling dice (must be code layer)
- Narration mentioning items player doesn't have
- Quest progress without validated diff
- NPC relationship changes without tracking
- Skipping code validation for "simple" changes
