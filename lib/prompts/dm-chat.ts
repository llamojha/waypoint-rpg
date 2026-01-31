/**
 * System prompt for DM Chat - answering player questions without consuming turns
 * Handles both meta questions (mechanics, rules) and in-world questions (lore, history)
 */

import type { Character, WorldContext, Turn, Quest, NPC } from "@/types";

export interface DmChatContext {
  character: Character;
  world: WorldContext;
  turns: Turn[];
  quests: Quest[];
  npcs: NPC[];
  codexEntries: { title: string; category: string; text: string }[];
  locations: { name: string; type: string; region: string; description: string }[];
  skillTree: Record<string, unknown>;
}

export const DM_CHAT_SYSTEM_PROMPT = `You are the Dungeon Master for Waypoint, a fantasy RPG. The player is asking you a question outside of normal gameplay - this does NOT consume a turn or change game state.

## YOUR ROLE
Answer questions helpfully while staying in character as a wise, friendly DM. You can answer:

1. META QUESTIONS (game mechanics, rules, how things work):
   - "How does combat work?"
   - "What skills can I use?"
   - "How do I improve my character?"
   - "What does this item do?"

2. IN-WORLD QUESTIONS (lore, history, what the character knows):
   - "Where am I?"
   - "What do I know about this place?"
   - "Who is this NPC?"
   - "What happened earlier?"
   - "What are my current quests?"

## RULES
- Keep responses concise (2-3 paragraphs max)
- For in-world questions, answer from the CHARACTER'S perspective (what they would know)
- For meta questions, you can break the fourth wall and explain game mechanics directly
- NEVER propose or make game state changes - this is informational only
- Be helpful and encouraging
- If you don't have enough context to answer, say so honestly
- Maintain PG-13 fantasy tone

## RESPONSE FORMAT
Respond with plain text - no JSON, no special formatting. Just answer the question naturally.`;

export function buildDmChatPrompt(context: DmChatContext): string {
  const { character, world, turns, quests, npcs, codexEntries, locations, skillTree } = context;

  const sections: string[] = [DM_CHAT_SYSTEM_PROMPT];

  // Character state
  sections.push(`\n## CHARACTER: ${character.name}
- HP: ${character.hp}/${character.maxHp}
- Gold: ${character.gold}
- Skills: ${Object.entries(character.skills).map(([k, v]) => `${k} (Lv ${v.level})`).join(", ") || "None"}
- Equipment: ${Object.entries(character.equipment).filter(([, v]) => v).map(([slot, item]) => `${slot}: ${item?.name}`).join(", ") || "None"}
- Inventory: ${character.inventory.map(i => i.name).join(", ") || "Empty"}`);

  // World state
  sections.push(`\n## CURRENT LOCATION
- Region: ${world.region}
- Place: ${world.poi}
- Time: Day ${world.time.day}, ${world.time.phase}
- Weather: ${world.weather}
- Present: ${world.entities?.join(", ") || "No one nearby"}`);

  // Quests
  if (quests.length > 0) {
    sections.push(`\n## ACTIVE QUESTS
${quests.map(q => `- ${q.title} (${q.status}): ${q.description} [${q.progress}/${q.totalProgress}]`).join("\n")}`);
  }

  // Known NPCs
  if (npcs.length > 0) {
    sections.push(`\n## KNOWN NPCS
${npcs.map(n => `- ${n.name} (${n.role}) at ${n.location} - Relationship: ${n.relationship}`).join("\n")}`);
  }

  // Codex entries (lore the player has discovered)
  if (codexEntries.length > 0) {
    sections.push(`\n## DISCOVERED LORE
${codexEntries.map(e => `- [${e.category}] ${e.title}: ${e.text.slice(0, 100)}...`).join("\n")}`);
  }

  // Known locations
  if (locations.length > 0) {
    sections.push(`\n## KNOWN LOCATIONS
${locations.map(l => `- ${l.name} (${l.type}) in ${l.region}`).join("\n")}`);
  }

  // Recent history (last 10 turns)
  const recentTurns = turns.slice(-10);
  if (recentTurns.length > 0) {
    sections.push(`\n## RECENT EVENTS
${recentTurns.map(t => `Player: "${t.playerAction}"\nResult: ${t.narration.slice(0, 150)}...`).join("\n\n")}`);
  }

  // Skill tree for mechanics questions
  sections.push(`\n## GAME MECHANICS (SKILL TREE)
${JSON.stringify(skillTree, null, 2)}`);

  return sections.join("\n");
}
