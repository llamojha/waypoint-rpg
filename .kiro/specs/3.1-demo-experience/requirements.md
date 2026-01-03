# Demo Experience - Requirements

## Overview

Define the initial player experience for Waypoint's demo/free-tier, including the starting location, first-turn narration, starter NPCs, and onboarding flow.

## Problem Statement

New players need a compelling, guided-but-free introduction to Waypoint that:

- Teaches core mechanics naturally
- Establishes the world's tone (medieval, grounded)
- Offers multiple paths without overwhelming
- Demonstrates the "AI + real game state" differentiator

## User Stories

### US-1: New Player Arrival

As a new player, I want to understand where I am and what I can do when I first enter the world, so that I feel oriented without reading a manual.

**Acceptance Criteria:**

- [ ] Opening narration establishes location, atmosphere, and immediate options
- [ ] At least 3 suggested actions are presented
- [ ] Player can act freely (not forced into tutorial)

### US-2: Tutorial Through Play

As a new player, I want to learn game mechanics by doing them, so that I don't have to read instructions.

**Acceptance Criteria:**

- [ ] First 5 turns naturally introduce: NPC interaction, skill checks, combat
- [ ] Starter quest available that teaches combat basics
- [ ] No explicit "tutorial mode" — just good quest design

### US-3: Multiple Paths

As a player, I want to choose my own direction from the start, so that I feel agency over my adventure.

**Acceptance Criteria:**

- [ ] At least 3 distinct paths/directions available from starting location
- [ ] Each path has different content (exploration, social, combat)
- [ ] No path is "required" — all are optional

### US-4: Social Hub

As a player, I want NPCs to talk to at the start, so that I can learn about the world and get quests.

**Acceptance Criteria:**

- [ ] At least 3 starter NPCs with distinct roles
- [ ] NPCs provide rumors, quests, and lore
- [ ] Relationships can be built from turn 1

## Functional Requirements

### FR-1: Starting Location

- Must be a safe zone (no random combat)
- Must have the Waypoint (waystone) visible/accessible
- Must connect to multiple regions/paths
- Must have NPCs present

### FR-2: Waypoint/Waystone

- Physical object in the world (not abstract)
- Lore significance (how player arrived)
- Future: fast travel network (post-MVP)

### FR-3: Starter NPCs (Pre-seeded)

- Minimum 3 NPCs at starting location
- Each has: name, role, personality, dialogue hooks
- At least 1 offers a starter quest
- At least 1 provides rumors/lore

### FR-4: Starter Quests (Pre-seeded)

- Minimum 2 quests available at start
- 1 tutorial-style quest (teaches combat)
- 1 exploration/social quest (teaches other mechanics)
- Rewards appropriate for level 1

### FR-5: Opening Narration

- Sets scene (location, atmosphere)
- Introduces mystery (how did I get here?)
- Presents NPC interaction opportunity
- Ends with open prompt ("What do you do?")

### FR-6: Suggested Actions

- First turn shows 3-5 suggested actions
- Actions cover different playstyles (talk, explore, examine, leave)
- Actions are clickable shortcuts (optional)

## Non-Functional Requirements

### NFR-1: Tone

- Medieval-realistic (no high fantasy yet)
- Grounded but with mystery
- PG-13, welcoming

### NFR-2: Pacing

- First turn: orientation (30 seconds to read)
- Turns 2-5: natural tutorial
- Turn 6+: full freedom

### NFR-3: Replayability

- Starting experience should feel fresh on replay
- Minor variations in NPC dialogue
- Different paths lead to different early content

## Dependencies

- #[[file:.kiro/steering/character-creation.md]] — Character must be created first
- #[[file:.kiro/steering/bestiary.md]] — Enemies for starter combat
- #[[file:.kiro/steering/agent-system.md]] — Agents generate narration
- #[[file:.kiro/steering/backend-infrastructure.md]] — Database for seed data

## Open Questions

1. **Waypoint form**: Waystone (monolith) vs portal vs rune?
2. **Starting location name**: "Crossroads Inn" or something else?
3. **Free-tier model**: Area-based, turn-based, or feature-based limits?
4. **West road**: Locked for MVP or accessible?
