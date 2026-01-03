# Waypoint Architecture

## Core Principle: Mechanics-First Consistency

The LLM cannot directly mutate game state. All state changes flow through validated diffs.

## Data Flow

```
Player Input → Backend Mechanics → LLM Narration → Validator → State Diffs → UI Update
```

## Two-Pass LLM Generation

1. **Pass A (Narration)**: LLM generates narrative + `proposed_events`
2. **Pass B (Validator)**: Extracts validated diffs only, rejects impossible changes

## State Authority

- Backend state is **authoritative** (single source of truth)
- UI panels reflect backend state, never LLM output directly
- Narration must match validated state, not the other way around

## Module Boundaries

| Module    | Responsibility                                      |
| --------- | --------------------------------------------------- |
| World     | Location, time, weather, POIs, entities present     |
| Character | HP, gold, inventory, equipment, skills, conditions  |
| Adventure | Turns, quests, rumors, session history              |
| Rules     | Skill checks, power word detection, roll resolution |
| Memory    | NPC relationships, world memories, codex entries    |
| Streaming | SSE segments for narration delivery                 |
| UI        | React components reflecting validated state         |

## Key Types (from types.ts)

- `GameState`: Root state container
- `Turn`: Player action + narration + mechanics + diffs
- `TurnDiff`: Atomic state change (news/quest/relationship/inventory/stat/world/skill)
- `Character`: Simplified model (name, gender?, hp, gold, skills, equipment, inventory, conditions)
- `WorldContext`: Current location, time, weather, memories

Note: Character no longer has stats (STR/DEX/etc.), level, xp, race, class, or background.

## Anti-Patterns to Avoid

- LLM directly setting HP, gold, inventory
- Narration mentioning items player doesn't have
- Quest progress without validated diff
- NPC relationship changes without tracking
