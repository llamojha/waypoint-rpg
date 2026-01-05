# 4.6 DM Chat (Out-of-Character Queries)

## Overview

Add a dedicated "Ask DM" mode that lets players ask clarifying questions about the game, scene, rules, or world without affecting game state or consuming a turn.

## Problem

Players often want to:
- Ask about the current scene ("How many guards are there?")
- Clarify rules ("Can I use Sneaking here?")
- Get world info ("What do I know about this NPC?")
- Understand options ("What can I do with this item?")

Currently, any input is treated as an in-game action, which:
- Advances the narrative unnecessarily
- May trigger skill checks for simple questions
- Confuses dialogue ("What's your name?") with OOC queries

## Solution

A separate DM Chat agent that:
- Responds to player questions without game state changes
- Has read-only access to current state (character, world, NPCs, inventory)
- Uses a different prompt focused on helpful DM responses
- Does NOT generate `proposed_events`
- Does NOT save to `waypoint_turns`

## User Experience

### Option A: Toggle Mode
- Button or keyboard shortcut to switch between "Act" and "Ask" modes
- Different placeholder text: "Ask the DM anything..."
- Visual indicator (different border color, icon)

### Option B: Prefix Convention
- Messages starting with `?` or `/ask` trigger DM chat
- Example: `? How far is the door?` or `/ask What's in my inventory?`
- No UI change needed, just input parsing

### Option C: Separate Input (Recommended)
- Small "Ask DM" button/icon next to main input
- Opens a lightweight chat popover or drawer
- Keeps main input for actions only

## Technical Design

### New API Endpoint

```
POST /api/dm-chat
```

**Request:**
```typescript
{
  characterId: string;
  question: string;
}
```

**Response:**
```typescript
{
  answer: string;
  // No diffs, no state changes
}
```

### DM Chat Agent

**Purpose**: Answer player questions helpfully without affecting game state

**Temperature**: 0.3 (helpful but consistent)

**System Prompt**:
```
You are a helpful Dungeon Master assistant. Answer the player's out-of-character question about the game, scene, rules, or their options.

RULES:
- Be helpful and informative
- Reference the current game state accurately
- Do NOT narrate actions or advance the story
- Do NOT propose any state changes
- Keep answers concise (1-3 paragraphs max)
- If the question is actually an action, suggest they use the main input

CONTEXT PROVIDED:
- Current location and scene description
- Character stats, inventory, equipment
- NPCs present and their relationships
- Recent turn history (for context)
- Active quests
```

**Input Context** (read-only):
```typescript
{
  character: Character,
  world: WorldContext,
  npcs: NPC[],           // Present at location
  quests: Quest[],       // Active quests
  recentTurns: Turn[],   // Last 3-5 for context
  question: string
}
```

**Output**:
```typescript
{
  answer: string  // Plain text response, no JSON structure needed
}
```

### UI Component

```typescript
// Lightweight popover or drawer
interface DMChatProps {
  isOpen: boolean;
  onClose: () => void;
  onAsk: (question: string) => Promise<string>;
}
```

## Estimate

3-5 hours

## Dependencies

- Existing Gemini client (lib/gemini/client.ts)
- Character and world state loading (already in turn routes)

## Acceptance Criteria

- [ ] Player can ask questions without affecting game state
- [ ] DM responses are contextually aware (knows location, inventory, etc.)
- [ ] Questions are NOT saved to turn history
- [ ] Clear visual distinction between Ask and Act modes
- [ ] Works on both desktop and mobile

## Out of Scope

- Conversation history for DM chat (each question is standalone)
- Voice input
- DM chat affecting future narration context
