# Requirements: Single LLM Turn

## Overview

Implement turn processing with a single Gemini API call. This is the simplest possible implementation that produces real AI-generated narration and state changes.

## User Story

As a player, I want to type an action and receive AI-generated narration that affects my character's state, so that I can play a real RPG experience.

## Functional Requirements

### 1. Turn API Endpoint

- 1.1 POST /api/turn shall accept player action and current game state
- 1.2 POST /api/turn shall call Gemini API with a combined prompt
- 1.3 POST /api/turn shall parse LLM response for narration and state changes
- 1.4 POST /api/turn shall validate proposed state changes
- 1.5 POST /api/turn shall save the turn to waypoint_turns table
- 1.6 POST /api/turn shall update character state in waypoint_characters
- 1.7 POST /api/turn shall return narration and diffs to client

### 2. Gemini Integration

- 2.1 Shall use gemini-2.5-flash-lite model (configurable via GEMINI_MODEL env var)
- 2.2 Shall send structured prompt with game context
- 2.3 Shall request JSON response format for state changes
- 2.4 Shall handle API errors gracefully
- 2.5 Shall have configurable temperature (default 0.7)

### 3. Prompt Structure

- 3.1 Prompt shall include current location and world context
- 3.2 Prompt shall include relevant character state (HP, inventory, conditions)
- 3.3 Prompt shall include last 3 turns for context
- 3.4 Prompt shall include the player's action
- 3.5 Prompt shall request narration in second person
- 3.6 Prompt shall request proposed_events array for state changes

### 4. Response Parsing

- 4.1 Shall extract narration text from response
- 4.2 Shall extract proposed_events array from response
- 4.3 Shall handle malformed responses gracefully
- 4.4 Shall provide fallback narration if parsing fails

### 5. State Validation

- 5.1 Shall validate HP changes stay within 0 to maxHp
- 5.2 Shall validate gold changes don't go negative
- 5.3 Shall validate inventory items have required fields
- 5.4 Shall reject invalid state changes silently (don't apply)

### 6. Database Persistence

- 6.1 Shall save turn record to waypoint_turns
- 6.2 Shall update waypoint_characters with approved changes
- 6.3 Shall update waypoint_world_state if location changes

### 7. Frontend Integration

- 7.1 App.tsx shall call /api/turn instead of mock processTurn
- 7.2 Shall display narration from API response
- 7.3 Shall update gameState with returned diffs
- 7.4 Shall handle loading and error states

## Non-Functional Requirements

- 8.1 Turn processing shall complete within 10 seconds
- 8.2 Shall use environment variable GEMINI_API_KEY
- 8.3 Shall log errors for debugging
- 8.4 Response shall be non-streaming (streaming added in 2.3)

## Out of Scope

- SSE streaming (deferred to 2.3)
- Skill checks and roll mechanics (deferred to 2.2)
- Power word detection (deferred to 2.2)
- Content safety filtering (deferred to 2.4)
- Multi-agent pipeline (deferred to 2.5+)
- Codex/lore queries (deferred to 2.5)

## Expected Response Format

```json
{
  "narration": "You step into the tavern...",
  "proposed_events": [
    {
      "type": "stat_change",
      "stat": "gold",
      "delta": -5,
      "reason": "Bought a drink"
    },
    {
      "type": "inventory_add",
      "item": {
        "name": "Tavern Key",
        "type": "quest",
        "description": "A rusty key given by the innkeeper"
      },
      "reason": "Innkeeper handed you a key"
    }
  ],
  "suggested_actions": [
    "Talk to the hooded stranger",
    "Ask about rumors",
    "Head upstairs"
  ]
}
```
