# Design: Single LLM Turn

## Overview

This design implements the simplest possible turn processing: one Gemini call that handles everything. No agent splitting, no streaming, no complex validation — just enough to play real turns.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  /api/turn  │────▶│   Gemini    │────▶│  Supabase   │
│  (App.tsx)  │◀────│  (Next.js)  │◀────│    API      │     │  (persist)  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

## Turn Processing Flow

```
1. Client sends POST /api/turn
   - playerAction: "I search the room for hidden doors"
   - characterId: "uuid"

2. API loads current state from Supabase
   - Character data
   - World state
   - Last 3 turns

3. API builds prompt for Gemini
   - World context
   - Character summary
   - Recent history
   - Player action
   - Response format instructions

4. Gemini returns JSON response
   - narration: "You run your hands along the stone walls..."
   - proposed_events: [{ type: "discovery", ... }]
   - suggested_actions: ["Examine the mechanism", ...]

5. API validates proposed_events
   - Check HP bounds
   - Check gold >= 0
   - Validate item structure

6. API persists changes
   - Insert turn record
   - Update character
   - Update world state (if changed)

7. API returns response to client
   - narration
   - diffs (validated events)
   - suggested_actions
```

## Gemini Prompt Design

### System Prompt

```
You are the Dungeon Master for Waypoint, a fantasy RPG. Generate immersive narration and propose game state changes.

RULES:
- Write in second person ("You step forward...")
- Keep narration to 2-4 paragraphs
- Maintain PG-13 fantasy tone
- Only propose changes that make sense for the action
- Be consistent with the world context provided

RESPONSE FORMAT:
Return a JSON object with:
- narration: string (the story text)
- proposed_events: array of state changes
- suggested_actions: array of 2-4 follow-up actions

EVENT TYPES:
- stat_change: { type, stat, delta, reason }
- inventory_add: { type, item: { name, type, description }, reason }
- inventory_remove: { type, itemName, reason }
- world_update: { type, field, value, reason }
- relationship_change: { type, npc, delta, reason }
```

### User Prompt Template

```
CURRENT LOCATION:
${world.poi} in ${world.region}
${world.description}
Time: Day ${world.time.day}, ${world.time.phase}
Weather: ${world.weather}

CHARACTER:
${character.name} (Level ${character.level})
HP: ${character.hp}/${character.maxHp}
Gold: ${character.gold}
Equipped: ${formatEquipment(character.equipment)}
Inventory: ${formatInventory(character.inventory)}
Conditions: ${formatConditions(character.conditions)}

RECENT EVENTS:
${formatRecentTurns(lastTurns)}

PLAYER ACTION:
${playerAction}

Generate the narration and any state changes that result from this action.
```

## API Request/Response

### Request

```typescript
interface TurnRequest {
  characterId: string;
  playerAction: string;
}
```

### Response

```typescript
interface TurnResponse {
  turn: {
    id: string;
    narration: string;
    diffs: TurnDiff[];
    suggestedActions: string[];
  };
  updatedCharacter?: Partial<Character>;
  updatedWorld?: Partial<WorldContext>;
}
```

## Validation Rules

```typescript
function validateEvents(
  events: ProposedEvent[],
  character: Character
): ValidatedEvent[] {
  return events.filter((event) => {
    switch (event.type) {
      case "stat_change":
        if (event.stat === "hp") {
          const newHp = character.hp + event.delta;
          return newHp >= 0 && newHp <= character.maxHp;
        }
        if (event.stat === "gold") {
          return character.gold + event.delta >= 0;
        }
        return true;

      case "inventory_add":
        return event.item?.name && event.item?.type;

      case "inventory_remove":
        return character.inventory.some((i) => i.name === event.itemName);

      default:
        return true;
    }
  });
}
```

## State Update Logic

```typescript
function applyEvents(
  character: Character,
  world: WorldContext,
  events: ValidatedEvent[]
) {
  const charUpdates: Partial<Character> = {};
  const worldUpdates: Partial<WorldContext> = {};
  const diffs: TurnDiff[] = [];

  for (const event of events) {
    switch (event.type) {
      case "stat_change":
        charUpdates[event.stat] = character[event.stat] + event.delta;
        diffs.push({
          type: "stat",
          text: event.stat,
          value: `${event.delta > 0 ? "+" : ""}${event.delta}`,
        });
        break;

      case "inventory_add":
        charUpdates.inventory = [
          ...character.inventory,
          {
            id: `item-${Date.now()}`,
            ...event.item,
          },
        ];
        diffs.push({
          type: "inventory",
          text: `Gained ${event.item.name}`,
        });
        break;

      // ... other event types
    }
  }

  return { charUpdates, worldUpdates, diffs };
}
```

## Gemini Client Setup

```typescript
// lib/gemini/client.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const DEFAULT_MODEL = "gemini-2.5-flash-lite";

export async function generateTurn(prompt: string): Promise<GeminiResponse> {
  const modelName = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.7,
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  return JSON.parse(text);
}
```

## Error Handling

### Gemini Errors

```typescript
try {
  const response = await generateTurn(prompt);
} catch (error) {
  // Return fallback narration
  return {
    narration:
      "The world seems to shimmer for a moment, then settles. Nothing happens.",
    proposed_events: [],
    suggested_actions: ["Try again", "Look around", "Wait"],
  };
}
```

### Parse Errors

```typescript
try {
  const parsed = JSON.parse(response);
  if (!parsed.narration) throw new Error("Missing narration");
  return parsed;
} catch {
  // Extract narration from raw text if JSON fails
  return {
    narration: response.slice(0, 1000),
    proposed_events: [],
    suggested_actions: [],
  };
}
```

## Frontend Changes

### App.tsx processTurn

```typescript
const processTurn = async (input: string) => {
  setTurnStatus("processing");

  try {
    const response = await fetch("/api/turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        characterId: gameState.character.id,
        playerAction: input,
      }),
    });

    if (!response.ok) throw new Error("Turn failed");

    const data = await response.json();

    // Add turn to history
    const newTurn: Turn = {
      id: data.turn.id,
      timestamp: Date.now(),
      playerAction: input,
      narration: data.turn.narration,
      isStreaming: false,
      suggestedActions: data.turn.suggestedActions,
      diffs: data.turn.diffs,
    };

    setGameState((prev) => ({
      ...prev,
      turns: [...prev.turns, newTurn],
      character: { ...prev.character, ...data.updatedCharacter },
      world: { ...prev.world, ...data.updatedWorld },
    }));

    setTurnStatus("idle");
  } catch (error) {
    console.error("Turn error:", error);
    setTurnStatus("error");
  }
};
```

## File Structure

```
lib/
├── gemini/
│   ├── client.ts       # Gemini API client
│   └── prompts.ts      # Prompt templates
├── turn/
│   ├── validate.ts     # Event validation
│   └── apply.ts        # State update logic
app/
└── api/
    └── turn/
        └── route.ts    # Updated with real implementation
```

## Environment Variables

```env
GEMINI_API_KEY=your-api-key-here
GEMINI_MODEL=gemini-2.5-flash-lite  # or gemini-3-flash-preview
```

## Limitations (Addressed in Later Specs)

| Limitation       | Addressed In               |
| ---------------- | -------------------------- |
| No streaming     | 2.3 chronicler-streaming   |
| No skill checks  | 2.2 skill-checks-mechanics |
| No safety filter | 2.4 content-sentinel       |
| No lore queries  | 2.5 lorekeeper             |
| Single LLM call  | 2.6+ agent pipeline        |
