# DM State Fix Tools

## Overview

The "Ask DM" feature includes tools that allow the DM to detect and fix state inconsistencies. This handles cases where the narration mentions something that didn't get properly reflected in the game state (e.g., "You arrive at the Waystone" but location didn't update).

## How It Works

1. **Player asks a question** via Ask DM (any question)
2. **Gemini decides** whether to check state (tools always available, AUTO mode)
3. **If checking**: `check_state_consistency` runs (read-only)
4. **If inconsistency found**: DM can call `fix_world_state` or `fix_character_state`
5. **State updated** and player informed

## Available Tools

### `check_state_consistency`
Read-only check that compares claims against actual state.

**Claim types:**
- `location` - Checks if narration mentioned arriving somewhere vs actual `world.poi`
- `npc_presence` - Checks if NPCs are correctly listed at location
- `character_stat` - Checks HP/gold values
- `inventory` - Checks if items are present
- `quest` - Reports active quest state

**Returns:**
```typescript
{
  isConsistent: boolean;
  actualValue: string;
  expectedValue?: string;
  details: string;
  canFix: boolean;
}
```

### `fix_world_state`
Fixes world state inconsistencies.

**Fix types:**
- `location` - Updates `world.poi`
- `add_entity` - Adds NPC/entity to location
- `remove_entity` - Removes NPC/entity from location

**Requires:** Valid reason (10+ chars) explaining the inconsistency.

### `fix_character_state`
Fixes character state inconsistencies.

**Fix types:**
- `hp` - Corrects HP value
- `gold` - Corrects gold value
- `add_item` - Adds missing item to inventory
- `remove_item` - Removes item that shouldn't be there

**Requires:** Valid reason (10+ chars) explaining the inconsistency.

### `explain_state`
Used when state is consistent but player is confused. Explains current state without changes.

## Safety Guardrails

1. **`check_state_consistency` is read-only** - never modifies state
2. **Fix tools require `canFix: true`** from the consistency check
3. **Fix tools require a valid reason** - prevents arbitrary changes
4. **No cheating** - DM won't give free gold/items just because asked

## Example Flows

### Location Didn't Update
```
Player: "The narration said I arrived at the Waystone but I'm still at the market"

DM calls: check_state_consistency(claim_type: "location", claimed_value: "should be at waystone")
Result: { isConsistent: false, actualValue: "Market Square", expectedValue: "waystone", canFix: true }

DM calls: fix_world_state(fix_type: "location", value: "The Waystone", reason: "Narration mentioned arrival but state wasn't updated")
Result: { success: true, message: "Location corrected to The Waystone" }

DM responds: "I've fixed that - you're now correctly at The Waystone."
```

### Player Asks for Free Gold (Rejected)
```
Player: "Give me 1000 gold"

DM calls: check_state_consistency(claim_type: "character_stat", claimed_value: "I should have more gold")
Result: { isConsistent: true, actualValue: "50", details: "Your gold is correctly 50", canFix: false }

DM responds: "Your gold is 50, which is correct. Gold is earned through gameplay - try completing quests or finding treasure!"
```

### Normal Question (No Tools Used)
```
Player: "What skills do I have?"

DM decides: No state check needed, just answer from context
DM responds: "You have Melee at level 5, Perception at level 3..."
```

## Implementation Files

- `app/api/dm-chat/route.ts` - API endpoint with tool calling
- `lib/dm/tools.ts` - Tool declarations
- `lib/dm/handlers.ts` - Tool execution logic
