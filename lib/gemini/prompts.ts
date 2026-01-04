import type { Character, WorldContext, Turn, Equipment, Item } from "@/types";

/**
 * Prompt templates for Gemini turn generation
 * Requirements: 3.1-3.6
 */

/**
 * System prompt with DM instructions
 * Requirements: 3.5, 3.6
 */
export const SYSTEM_PROMPT = `You are the Dungeon Master for Waypoint, a fantasy RPG. Generate immersive narration and propose game state changes.

RULES:
- Write in second person ("You step forward...")
- Keep narration to 2-4 paragraphs
- Maintain PG-13 fantasy tone
- Only propose changes that make sense for the action
- Be consistent with the world context provided
- Do not reference items the character doesn't have
- Do not invent NPCs without good narrative reason

RESPONSE FORMAT:
Return a JSON object with exactly these fields:
- narration: string (the story text, 2-4 paragraphs)
- proposed_events: array of state changes (see EVENT TYPES below)
- suggested_actions: array of 2-4 follow-up action strings

EVENT TYPES:
1. stat_change - Modify HP or gold
   { "type": "stat_change", "stat": "hp" | "gold", "delta": number, "reason": "string" }
   Example: { "type": "stat_change", "stat": "gold", "delta": -5, "reason": "Bought a drink" }

2. inventory_add - Add item to inventory
   { "type": "inventory_add", "item": { "name": "string", "type": "weapon|armor|consumable|quest|trinket|misc", "description": "string" }, "reason": "string" }
   Example: { "type": "inventory_add", "item": { "name": "Tavern Key", "type": "quest", "description": "A rusty key given by the innkeeper" }, "reason": "Innkeeper handed you a key" }

3. inventory_remove - Remove item from inventory
   { "type": "inventory_remove", "itemName": "string", "reason": "string" }
   Example: { "type": "inventory_remove", "itemName": "Healing Potion", "reason": "Consumed to restore health" }

4. world_update - Update world state
   { "type": "world_update", "field": "string", "value": any, "reason": "string" }
   Example: { "type": "world_update", "field": "weather", "value": "stormy", "reason": "Storm rolled in" }

5. relationship_change - Change NPC relationship
   { "type": "relationship_change", "npc": "string", "delta": number (-2 to +2), "reason": "string" }
   Example: { "type": "relationship_change", "npc": "Mira", "delta": 1, "reason": "Helped with her task" }

IMPORTANT:
- Only propose events that logically follow from the player's action
- HP changes should be reasonable (small damage: -1 to -5, medium: -6 to -10)
- Gold changes should match the context (drinks: -2 to -5, meals: -5 to -15)
- Relationship changes are capped at ±2 per turn
- Always provide a reason for each event`;

/**
 * Format equipment for prompt display
 */
function formatEquipment(equipment: Equipment): string {
  const slots: (keyof Equipment)[] = [
    "mainHand",
    "offHand",
    "head",
    "chest",
    "arms",
    "legs",
    "cloak",
    "trinket",
  ];

  const equipped = slots
    .filter((slot) => equipment[slot] !== null)
    .map((slot) => {
      const item = equipment[slot] as Item;
      return `${slot}: ${item.name}`;
    });

  return equipped.length > 0 ? equipped.join(", ") : "None";
}

/**
 * Format inventory for prompt display
 */
function formatInventory(inventory: Item[]): string {
  if (inventory.length === 0) return "Empty";

  return inventory.map((item) => item.name).join(", ");
}

/**
 * Format conditions for prompt display
 */
function formatConditions(conditions: Character["conditions"]): string {
  if (conditions.length === 0) return "None";

  return conditions.map((c) => `${c.name} (${c.type})`).join(", ");
}

/**
 * Format recent turns for context
 * Requirements: 3.3
 */
function formatRecentTurns(turns: Turn[]): string {
  if (turns.length === 0) return "This is the beginning of your adventure.";

  return turns
    .map((turn, index) => {
      const turnNum = turns.length - index;
      return `Turn ${turnNum}:
Action: ${turn.playerAction}
Result: ${turn.narration.slice(0, 200)}${
        turn.narration.length > 200 ? "..." : ""
      }`;
    })
    .join("\n\n");
}

/**
 * Roll outcome for skill checks
 */
export interface RollOutcome {
  skill: string;
  rolled: number;
  modifier: number;
  total: number;
  dc: number;
  outcome: "success" | "failure";
}

/**
 * Build the complete turn prompt for Gemini
 * Requirements: 3.1, 3.2, 3.3, 3.4
 *
 * @param character - Current character state
 * @param world - Current world context
 * @param recentTurns - Last 3 turns for context
 * @param playerAction - The player's current action
 * @param rollOutcome - Optional skill check result to incorporate
 * @returns Complete prompt string for Gemini
 */
export function buildTurnPrompt(
  character: Character,
  world: WorldContext,
  recentTurns: Turn[],
  playerAction: string,
  rollOutcome?: RollOutcome
): string {
  // Take only the last 3 turns
  const lastThreeTurns = recentTurns.slice(-3);

  let rollContext = "";
  if (rollOutcome) {
    rollContext = `
SKILL CHECK RESULT:
The player attempted a ${rollOutcome.skill} check.
- Rolled: ${rollOutcome.rolled} + ${rollOutcome.modifier} modifier = ${rollOutcome.total}
- DC: ${rollOutcome.dc}
- Outcome: ${rollOutcome.outcome.toUpperCase()}

Your narration MUST reflect this ${rollOutcome.outcome}. ${
      rollOutcome.outcome === "success"
        ? "The action succeeds as intended."
        : "The action fails or has complications."
    }
`;
  }

  const userPrompt = `CURRENT LOCATION:
${world.poi} in ${world.region}
${world.description}
Time: Day ${world.time.day}, ${world.time.phase}
Weather: ${world.weather}

CHARACTER:
${character.name}${character.gender ? ` (${character.gender})` : ""}
HP: ${character.hp}/${character.maxHp}
Gold: ${character.gold}
Equipped: ${formatEquipment(character.equipment)}
Inventory: ${formatInventory(character.inventory)}
Conditions: ${formatConditions(character.conditions)}

RECENT EVENTS:
${formatRecentTurns(lastThreeTurns)}

PLAYER ACTION:
${playerAction}
${rollContext}
Generate the narration and any state changes that result from this action.`;

  return `${SYSTEM_PROMPT}

${userPrompt}`;
}
