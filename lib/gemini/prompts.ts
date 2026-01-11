import type { Character, WorldContext, Turn, Equipment, Item, CodexEntry } from "@/types";
import { CHRONICLER_SYSTEM_PROMPT } from "@/lib/prompts";
import type { ProposedEvent } from "@/lib/turn/validate";
import type { Consequence } from "@/lib/turn/apply";
import type { NpcVoice, Atmosphere } from "@/lib/agents/lorekeeper/handlers";

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
 * Only include player actions with brief outcome indicator, not full narration,
 * to prevent the LLM from copying location-specific details from previous turns
 */
function formatRecentTurns(turns: Turn[]): string {
  if (turns.length === 0) return "This is the beginning of your adventure.";

  return turns
    .map((turn, index) => {
      const turnNum = turns.length - index;
      const outcome = turn.mechanics?.outcome || "ok";
      return `Turn ${turnNum}: "${turn.playerAction || "Unknown"}" → ${outcome}`;
    })
    .join("\n");
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
 * Format codex snippets for Chronicler context
 */
function formatCodexSnippets(snippets: CodexEntry[]): string {
  if (!snippets || snippets.length === 0) return "";

  const formatted = snippets.map(entry => 
    `- ${entry.title} (${entry.category}): ${entry.text}`
  ).join("\n");

  return `
RELEVANT LORE:
${formatted}

Use this lore to enrich your narration where appropriate. Don't force it if not relevant.
`;
}

/**
 * Format NPC voices for dialogue guidance
 */
function formatNpcVoices(voices: NpcVoice[]): string {
  if (!voices || voices.length === 0) return "";

  const formatted = voices.map(v => {
    const traits = v.personality.join(", ");
    const hints = v.dialogueHints.slice(0, 2).join("; ");
    const speech = v.speechPattern ? ` (${v.speechPattern})` : "";
    return `- ${v.name}${speech}: ${traits}. ${hints}`;
  }).join("\n");

  return `
NPC VOICE GUIDE:
${formatted}

Use these personality traits and speech patterns when writing NPC dialogue.
`;
}

/**
 * Format atmosphere for scene description
 */
function formatAtmosphere(atmosphere: Atmosphere | null): string {
  if (!atmosphere) return "";

  return `
SCENE ATMOSPHERE:
Mood: ${atmosphere.mood}
Descriptors: ${atmosphere.descriptors.join(", ")}
Ambiance: ${atmosphere.ambiance}

Weave these atmospheric elements into your narration naturally.
`;
}

/**
 * Format consequences for Chronicler context
 */
function formatConsequences(consequences: Consequence[]): string {
  if (!consequences || consequences.length === 0) return "";

  const formatted = consequences.map(c => {
    switch (c.type) {
      case "npc_died":
        return `- ${c.npc} has DIED (${c.reason})`;
      case "npc_defeated":
        return `- ${c.npc} has been DEFEATED (${c.reason})`;
      case "quest_completed":
        return `- Quest "${c.questTitle}" COMPLETED`;
      case "quest_started":
        return `- New quest "${c.questTitle}" started`;
      case "location_changed":
        return `- Traveled from ${c.from} to ${c.to}`;
      case "character_critical_hp":
        return `- Character is CRITICALLY WOUNDED (${c.hp}/${c.maxHp} HP)`;
      case "character_died":
        return `- Character has DIED`;
      case "item_acquired":
        return `- Acquired: ${c.itemName}`;
      case "gold_depleted":
        return `- Gold depleted - character is now broke`;
      default:
        return `- ${(c as { type: string }).type}`;
    }
  }).join("\n");

  return `
IMPORTANT CONSEQUENCES TO NARRATE:
${formatted}

These are significant events that MUST be reflected in your narration.
`;
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
 * Now accepts pre-approved events from Arbiter plus lore context from Lorekeeper
 *
 * @param character - Current character state
 * @param world - Current world context
 * @param recentTurns - Last turns for context
 * @param playerAction - The player's current action
 * @param rollOutcome - Optional skill check result to incorporate
 * @param approvedEvents - Pre-approved events from Arbiter to narrate
 * @param npcsPresent - NPCs present at the current location
 * @param codexSnippets - Relevant lore from Lorekeeper
 * @param consequences - Side effects from Apply State (NPC died, etc.)
 * @param npcVoices - NPC voice data for dialogue
 * @param atmosphere - Scene atmosphere descriptors
 * @returns Complete prompt string for Chronicler
 */
export function buildTurnPrompt(
  character: Character,
  world: WorldContext,
  recentTurns: Turn[],
  playerAction: string,
  rollOutcome?: RollOutcome,
  approvedEvents?: ProposedEvent[],
  npcsPresent?: NPCForPrompt[],
  codexSnippets?: CodexEntry[],
  consequences?: Consequence[],
  npcVoices?: NpcVoice[],
  atmosphere?: Atmosphere | null
): string {
  const lastTurns = recentTurns.slice(-100);

  // Detect if player just arrived at this location
  const hasLocationChange = approvedEvents?.some(e => e.type === "location_change") ||
    consequences?.some(c => c.type === "location_changed");
  const isFirstTurn = recentTurns.length === 0;
  const isNewLocation = isFirstTurn || hasLocationChange;

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

  // Add lore context from Lorekeeper
  const loreContext = formatCodexSnippets(codexSnippets || []);
  
  // Add consequences from Apply State
  const consequencesContext = formatConsequences(consequences || []);

  // Add NPC voice guidance
  const voiceContext = formatNpcVoices(npcVoices || []);

  // Add atmosphere descriptors
  const atmosphereContext = formatAtmosphere(atmosphere || null);

  const userPrompt = `CURRENT LOCATION:
${world.poi} in ${world.region}
${world.description || ""}
Time: Day ${world.time.day}, ${world.time.phase}
Weather: ${world.weather}
${world.nearbyPoi && world.nearbyPoi.length > 0 ? `\nNEARBY LOCATIONS:\n${world.nearbyPoi.map(p => `- ${p}`).join('\n')}` : ''}

SCENE CONTEXT:
${isNewLocation ? "Player just ARRIVED at this location - describe the scene and surroundings." : "Player has been here for multiple turns - focus on the action, don't re-describe the location unless they moved to a new area within it."}

NPCS PRESENT:
${formatNPCs(npcsPresent || [])}
${voiceContext}${atmosphereContext}${loreContext}${consequencesContext}
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
