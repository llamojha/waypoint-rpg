import type { Character, WorldContext, Turn, Equipment, Item } from "@/types";
import { CHRONICLER_SYSTEM_PROMPT } from "@/lib/prompts";
import type { ProposedEvent } from "@/lib/turn/validate";

/**
 * Prompt templates for Gemini turn generation
 * Updated for Orchestrator-Arbiter pipeline
 */

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
 * Format approved events for Chronicler
 */
function formatApprovedEvents(events: ProposedEvent[]): string {
  if (!events || events.length === 0) return "No state changes to narrate.";

  return events.map((event, i) => {
    switch (event.type) {
      case "stat_change":
        return `${i + 1}. ${event.stat.toUpperCase()} ${event.delta > 0 ? "+" : ""}${event.delta} (${event.reason})`;
      case "inventory_add":
        return `${i + 1}. Gained item: ${event.item.name} (${event.reason})`;
      case "inventory_remove":
        return `${i + 1}. Lost item: ${event.itemName} (${event.reason})`;
      case "relationship_change":
        return `${i + 1}. Relationship with ${event.npc}: ${event.delta > 0 ? "+" : ""}${event.delta} (${event.reason})`;
      case "quest_start":
        return `${i + 1}. Quest started: ${event.questTitle} (${event.reason})`;
      case "quest_progress":
        return `${i + 1}. Quest progress: ${event.questId} step ${event.progress} (${event.reason})`;
      case "location_change":
        return `${i + 1}. Traveled to: ${event.location} (${event.reason})`;
      case "world_update":
        return `${i + 1}. World change: ${event.field} = ${event.value} (${event.reason})`;
      default:
        return `${i + 1}. ${event.type}: ${event.reason}`;
    }
  }).join("\n");
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
 * Build the complete turn prompt for Chronicler
 * Now accepts pre-approved events from Arbiter
 *
 * @param character - Current character state
 * @param world - Current world context
 * @param recentTurns - Last turns for context
 * @param playerAction - The player's current action
 * @param rollOutcome - Optional skill check result to incorporate
 * @param approvedEvents - Pre-approved events from Arbiter to narrate
 * @param npcsPresent - NPCs present at the current location
 * @returns Complete prompt string for Chronicler
 */
export function buildTurnPrompt(
  character: Character,
  world: WorldContext,
  recentTurns: Turn[],
  playerAction: string,
  rollOutcome?: RollOutcome,
  approvedEvents?: ProposedEvent[],
  npcsPresent?: NPCForPrompt[]
): string {
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

  let eventsContext = "";
  if (approvedEvents && approvedEvents.length > 0) {
    eventsContext = `
APPROVED EVENTS TO NARRATE:
${formatApprovedEvents(approvedEvents)}

Your narration must incorporate these approved events naturally into the story.
Do NOT propose additional events - these have already been validated.
`;
  }

  const userPrompt = `CURRENT LOCATION:
${world.poi} in ${world.region}
${world.description || ""}
Time: Day ${world.time.day}, ${world.time.phase}
Weather: ${world.weather}
${world.nearbyPoi && world.nearbyPoi.length > 0 ? `\nNEARBY LOCATIONS:\n${world.nearbyPoi.map(p => `- ${p}`).join('\n')}` : ''}

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
${rollContext}${eventsContext}
Generate the narration for this action and the approved events.`;

  return `${CHRONICLER_SYSTEM_PROMPT}

${userPrompt}`;
}
