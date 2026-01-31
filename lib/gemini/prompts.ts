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
      const stats: string[] = [];
      if (item.stats?.damage) stats.push(`dmg: ${item.stats.damage}`);
      if (item.stats?.ac) stats.push(`AC: +${item.stats.ac}`);
      const statsStr = stats.length > 0 ? ` (${stats.join(", ")})` : "";
      return `${slot}: ${item.name}${statsStr}`;
    });

  return equipped.length > 0 ? equipped.join(", ") : "None";
}

/**
 * Format equipment bonuses for a specific skill check
 */
function formatEquipmentBonusContext(equipment: Equipment, skill: string): string {
  const slots: (keyof Equipment)[] = [
    "mainHand", "offHand", "head", "chest", "arms", "legs", "cloak", "trinket"
  ];

  const bonusItems: string[] = [];
  for (const slot of slots) {
    const item = equipment[slot] as Item | null;
    if (item?.skillBonuses?.[skill]) {
      bonusItems.push(`${item.name} (+${item.skillBonuses[skill]} ${skill})`);
    }
  }

  if (bonusItems.length === 0) return "";
  return `\nEquipment bonus: ${bonusItems.join(", ")}`;
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
 * Location summary for prompt building
 */
export interface LocationSummaryForPrompt {
  location: string;
  visitNumber: number;
  summary: string;
  keyEvents: string[];
  npcsEncountered: string[];
}

/**
 * Format location summaries for context
 */
function formatLocationSummaries(summaries: LocationSummaryForPrompt[]): string {
  if (summaries.length === 0) return "";

  return summaries
    .map((s) => {
      const visit = s.visitNumber > 1 ? ` (visit ${s.visitNumber})` : "";
      const npcs = s.npcsEncountered.length > 0 
        ? ` Met: ${s.npcsEncountered.join(", ")}.` 
        : "";
      return `Previously at ${s.location}${visit}: ${s.summary}${npcs}`;
    })
    .join("\n");
}

/**
 * Format recent turns for context
 * Include full narration so Chronicler can maintain narrative continuity
 */
function formatRecentTurns(
  turns: Turn[],
  summaries: LocationSummaryForPrompt[] = []
): string {
  const summarySection = formatLocationSummaries(summaries);
  
  if (turns.length === 0 && summaries.length === 0) {
    return "This is the beginning of your adventure.";
  }

  const turnsSection = turns.length > 0
    ? turns
        .map((turn, index) => {
          const turnNum = turns.length - index;
          const outcome = turn.mechanics?.outcome || "ok";
          const narration = turn.narration ? `\n   Narration: ${turn.narration}` : "";
          return `Turn ${turnNum}: Player: "${turn.playerAction || "Unknown"}" (${outcome})${narration}`;
        })
        .join("\n\n")
    : "";

  if (summarySection && turnsSection) {
    return `${summarySection}\n\nRecent turns:\n${turnsSection}`;
  }
  
  return summarySection || turnsSection || "This is the beginning of your adventure.";
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
      case "enemy_defeated":
        return `- Enemy "${c.enemy}" has been DEFEATED - narrate their death dramatically`;
      case "combat_started":
        return `- COMBAT STARTED with ${c.enemies} - narrate the encounter beginning`;
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
      case "respawned":
        return `- Character RESPAWNED at ${c.location} - narrate waking up after defeat`;
      case "item_acquired":
        return `- Acquired: ${c.itemName}`;
      case "gold_depleted":
        return `- Gold depleted - character is now broke`;
      case "time_advanced":
        return `- TIME ADVANCED: ${c.description} - weave this passage of time naturally into the narration`;
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
  /** Weapon damage notation for combat skills (e.g., "1d8") */
  weaponDamage?: string;
  /** Calculated damage roll result for combat */
  damageRolled?: number;
}

/**
 * Rejection info for Chronicler context
 */
export interface RejectedProposal {
  type: string;
  reason: string;
}

/**
 * Format rejected proposals for Chronicler
 */
function formatRejectedProposals(rejected: RejectedProposal[]): string {
  if (!rejected || rejected.length === 0) return "";

  const formatted = rejected.map(r => `- ${r.type}: ${r.reason}`).join("\n");

  return `
REJECTED PROPOSALS (DO NOT NARRATE THESE):
${formatted}

The player attempted to gain these but they were DENIED. Do NOT narrate the player receiving, finding, or obtaining these items/gold. Instead, narrate that they searched but found nothing, or that their attempt failed.
`;
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
 * @param rejectedProposals - Proposals that were rejected (should NOT be narrated)
 * @param locationSummaries - Compressed summaries of previous location visits
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
  atmosphere?: Atmosphere | null,
  rejectedProposals?: RejectedProposal[],
  locationSummaries?: LocationSummaryForPrompt[]
): string {
  const lastTurns = recentTurns.slice(-10); // Keep only last 10 verbatim when using summaries

  // Detect if player just arrived at this location
  const hasLocationChange = approvedEvents?.some(e => e.type === "location_change") ||
    consequences?.some(c => c.type === "location_changed");
  const isFirstTurn = recentTurns.length === 0;
  const isNewLocation = isFirstTurn || hasLocationChange;

  let rollContext = "";
  if (rollOutcome) {
    const damageInfo = rollOutcome.outcome === "success" && rollOutcome.weaponDamage && rollOutcome.damageRolled
      ? `\n- Weapon: ${rollOutcome.weaponDamage} → dealt ${rollOutcome.damageRolled} damage`
      : "";
    const equipmentBonusInfo = formatEquipmentBonusContext(character.equipment, rollOutcome.skill);
    
    rollContext = `
SKILL CHECK RESULT:
The player attempted a ${rollOutcome.skill} check.
- Rolled: ${rollOutcome.rolled} + ${rollOutcome.modifier} modifier = ${rollOutcome.total}
- DC: ${rollOutcome.dc}
- Outcome: ${rollOutcome.outcome.toUpperCase()}${damageInfo}${equipmentBonusInfo}

Your narration MUST reflect this ${rollOutcome.outcome}. ${
      rollOutcome.outcome === "success"
        ? rollOutcome.damageRolled 
          ? `The attack succeeds and deals ${rollOutcome.damageRolled} damage.`
          : "The action succeeds as intended."
        : "The action fails or has complications."
    }${equipmentBonusInfo ? " Mention the equipment that helped if contextually appropriate." : ""}
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

  // Add atmosphere descriptors ONLY for new locations
  // When player has been at a location, don't re-describe the atmosphere
  const atmosphereContext = isNewLocation ? formatAtmosphere(atmosphere || null) : "";

  // Add rejected proposals context
  const rejectedContext = formatRejectedProposals(rejectedProposals || []);

  // Format active combat info
  const combatContext = world.activeCombat
    ? `\nACTIVE COMBAT:
${world.activeCombat.enemies.map(e => {
  const hpPercent = Math.round((e.hp / e.maxHp) * 100);
  const status = hpPercent <= 25 ? "near death" : hpPercent <= 50 ? "bloodied" : hpPercent <= 75 ? "wounded" : "healthy";
  return `- ${e.name}: ${e.hp}/${e.maxHp} HP (${status})`;
}).join("\n")}
Round: ${world.activeCombat.round}

Describe enemy status in narration (e.g., "The wolf staggers, bloodied" for low HP).
`
    : "";

  const userPrompt = `CURRENT LOCATION:
${world.poi} in ${world.region}
${world.description || ""}
Time: Day ${world.time.day}, ${world.time.phase}
Weather: ${world.weather}
${world.nearbyPoi && world.nearbyPoi.length > 0 ? `\nNEARBY LOCATIONS:\n${world.nearbyPoi.map(p => `- ${p}`).join('\n')}` : ''}

SCENE CONTEXT:
${isNewLocation ? "Player just ARRIVED at this location - describe the scene and surroundings as they take it in for the first time." : "Player has been here - DO NOT describe the location or surroundings. Focus ONLY on the action and dialogue. Start with the character's action or NPC response, not environmental description."}

NPCS PRESENT:
${formatNPCs(npcsPresent || [])}
${voiceContext}${atmosphereContext}${loreContext}${consequencesContext}${combatContext}${rejectedContext}
CHARACTER:
${character.name}${character.gender ? ` (${character.gender})` : ""}
HP: ${character.hp}/${character.maxHp}
Gold: ${character.gold}
Equipped: ${formatEquipment(character.equipment)}
Inventory: ${formatInventory(character.inventory)}
Conditions: ${formatConditions(character.conditions)}

RECENT EVENTS:
${formatRecentTurns(lastTurns, locationSummaries)}

PLAYER ACTION:
${playerAction}
${rollContext}${eventsContext}
Generate the narration for this action and the approved events.`;

  return `${CHRONICLER_SYSTEM_PROMPT}

${userPrompt}`;
}
