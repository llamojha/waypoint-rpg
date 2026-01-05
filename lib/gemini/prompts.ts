import type { Character, WorldContext, Turn, Equipment, Item } from "@/types";
import { TURN_SYSTEM_PROMPT } from "@/lib/prompts";

/**
 * Prompt templates for Gemini turn generation
 * Requirements: 3.1-3.6
 */

/**
 * System prompt - imported from lib/prompts/turn.ts
 */
export const SYSTEM_PROMPT = TURN_SYSTEM_PROMPT;

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
    .filter((slot) => equipment[slot] && (equipment[slot] as Item)?.name)
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
      const narration = turn.narration || "";
      return `Turn ${turnNum}:
Action: ${turn.playerAction || "Unknown"}
Result: ${narration.slice(0, 500)}${narration.length > 500 ? "..." : ""}`;
    })
    .join("\n\n");
}

/**
 * NPC data for prompt building
 */
export interface NPCForPrompt {
  name: string;
  role: string;
  personality: string[];
  dialogueHints: string[];
  relationship: number;
}

/**
 * Format NPCs present in the current location
 */
function formatNPCs(npcs: NPCForPrompt[]): string {
  if (npcs.length === 0) return "None";

  const npcInfo = npcs.map((npc) => {
    const relationshipLabel = npc.relationship > 0 ? `+${npc.relationship}` : npc.relationship < 0 ? `${npc.relationship}` : "neutral";
    
    return `- ${npc.name} (${npc.role}, relationship: ${relationshipLabel})
  Personality: ${npc.personality.join(", ")}
  Notes: ${npc.dialogueHints.slice(0, 3).join("; ")}`;
  });

  return npcInfo.join("\n");
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
 * @param npcsPresent - NPCs present at the current location with their data
 * @returns Complete prompt string for Gemini
 */
export function buildTurnPrompt(
  character: Character,
  world: WorldContext,
  recentTurns: Turn[],
  playerAction: string,
  rollOutcome?: RollOutcome,
  npcsPresent?: NPCForPrompt[]
): string {
  // Take only the last 10 turns
  const lastTurns = recentTurns.slice(-100);

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
${world.description || ""}
Time: Day ${world.time.day}, ${world.time.phase}
Weather: ${world.weather}
${world.nearbyPoi && world.nearbyPoi.length > 0 ? `\nNEARBY LOCATIONS (use these EXACT names for location_change events):\n${world.nearbyPoi.map(p => `- ${p}`).join('\n')}` : ''}

NPCS PRESENT:
${formatNPCs(npcsPresent || [])}

CHARACTER:
${character.name}${character.gender ? ` (${character.gender})` : ""}
HP: ${character.hp}/${character.maxHp}
Gold: ${character.gold}
Equipped: ${formatEquipment(character.equipment)}
Inventory: ${formatInventory(character.inventory)}
Conditions: ${formatConditions(character.conditions)}

RECENT EVENTS:
${formatRecentTurns(lastTurns)}

PLAYER ACTION:
${playerAction}
${rollContext}
Generate the narration and any state changes that result from this action.`;

  return `${SYSTEM_PROMPT}

${userPrompt}`;
}
