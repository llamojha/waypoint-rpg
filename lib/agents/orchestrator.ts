import { GoogleGenAI, FunctionCallingConfigMode } from "@google/genai";
import type { Content, Part } from "@google/genai";
import { READ_TOOLS } from "./tools/read-tools";
import { PROPOSAL_TOOLS, ProposalResult, DetectIntentResult } from "./tools/proposal-tools";
import { handleReadToolCall } from "./tools/read-handlers";
import type { Character, WorldContext, Turn } from "@/types";
import type { ActiveQuest, NpcQuest } from "./quest-agent";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

/** Magic skill names for denial detection */
const MAGIC_SKILLS = ["Spellcasting", "Rituals", "Wards", "Summoning"];

export interface OrchestratorOutput {
  intent: DetectIntentResult;
  proposals: ProposalResult[];
  sceneDirection?: string;
  traceDetails?: string[];
}

export interface QuestContext {
  activeQuests: ActiveQuest[];
  npcQuests: NpcQuest[];
}

/**
 * Build system prompt with injected context
 */
function buildOrchestratorPrompt(
  character: Character,
  world: WorldContext,
  recentTurns: Turn[],
  questContext?: QuestContext
): string {
  const characterStr = JSON.stringify({
    name: character.name,
    hp: character.hp,
    maxHp: character.maxHp,
    gold: character.gold,
    skills: character.skills,
    inventory: character.inventory.map(i => i.name),
    isMagicUnlocked: character.isMagicUnlocked,
  }, null, 2);
  const worldStr = JSON.stringify({
    region: world.region,
    poi: world.poi,
    time: world.time,
    weather: world.weather,
    description: world.description,
    nearbyPoi: world.nearbyPoi,
    entities: world.entities,
  }, null, 2);
  const recentStr = recentTurns.slice(-5).map(t => 
    `Player: ${t.playerAction}\nResult: ${t.narration?.slice(0, 200)}...`
  ).join("\n\n");

  // Format quest context
  let questStr = "";
  if (questContext) {
    if (questContext.activeQuests.length > 0) {
      questStr += "\n## Active Quests\n";
      for (const q of questContext.activeQuests) {
        questStr += `- ${q.title} (step ${q.currentStep}/${q.totalProgress})\n`;
        if (q.currentGoal) questStr += `  Current goal: "${q.currentGoal}"\n`;
      }
    }
    if (questContext.npcQuests.length > 0) {
      questStr += "\n## Available Quests from NPC\n";
      for (const q of questContext.npcQuests) {
        questStr += `- ${q.title}: ${q.description}\n`;
      }
    }
  }

  // Format entities (NPCs present)
  const entitiesStr = world.entities?.length > 0
    ? `\n## NPCs Present (use EXACT names for relationship changes)\n${world.entities.map(e => `- ${e}`).join("\n")}`
    : "";

  return `You are the Orchestrator for Waypoint RPG. Your job is to propose state changes based on the player's action.

## Current Character
${characterStr}

## Current Location
${worldStr}
${entitiesStr}
${questStr}
## Recent Events
${recentStr || "No recent events"}

## Rules
- Propose state changes that should happen as a result of the player's action
- Then call relevant propose_* tools for ANY state changes that should happen
- ${character.isMagicUnlocked ? "Magic is unlocked" : "Magic is NOT unlocked - deny magic skill attempts"}
- If player action matches an active quest's current goal, propose quest_progress

## When to Use Each Tool

### detect_intent (REQUIRED for every action)
- Analyze what skill is being used
- Set requires_roll=true ONLY for actions with meaningful risk or challenge:
  * Combat attacks
  * Stealth/sneaking past enemies
  * Picking locks, disarming traps
  * Persuading hostile or reluctant NPCs
  * Climbing dangerous surfaces
  * Searching for hidden things
- Set requires_roll=false for routine actions:
  * Walking/traveling to a location
  * Talking to friendly NPCs
  * Looking around
  * Buying/selling items
  * Resting
  * Simple movement
- DC guidelines: 8=trivial, 10=easy, 12=moderate, 15=hard, 18=very hard

### propose_stat_change
- HP damage: small=-1 to -5, medium=-6 to -10, severe=-11 to -15
- HP healing: potions=2d4, rest=1d6, full rest=full
- Gold spent: drinks=-2 to -5, meals=-5 to -15, items=-10 to -100
- Gold gained: small task=5-15, job=20-50, treasure=50-200

### propose_inventory_add
- When player finds, receives, or buys an item
- Include rarity: common (mundane), uncommon (quality), rare (magical), legendary (unique)
- Always provide description

### propose_inventory_remove
- When player uses consumable, drops, sells, or loses an item
- Item must exist in inventory

### propose_relationship_change
- ONLY when player directly interacts with an NPC (conversation, help, conflict)
- Use the EXACT full name from "NPCs Present" list (e.g., "Aran Nomante" not "Aran")
- Small talk, minor help: +1
- Meaningful assistance, shared moment: +2
- Insult, minor offense: -1
- Betrayal, serious harm: -2
- First meeting with interaction: include "met" in reason
- Do NOT propose for NPCs the player hasn't interacted with yet

### propose_quest_start
- ONLY when player explicitly accepts a quest from "Available Quests from NPC" list
- Use the EXACT quest ID or title from the list
- Do NOT invent new quests - only use quests from the available list
- Player must actively agree/accept (e.g., "I'll help", "I accept", "Yes")

### propose_quest_progress
- When player completes a quest step
- Progress increments by 1 per step

### propose_location_change
- ONLY when player explicitly travels to a different POI
- Location MUST be EXACTLY one from nearbyPoi list: ${world.nearbyPoi?.join(", ") || "none"}
- Do NOT invent sub-locations (no "Helga's Hut", "Captain's Hall", etc.)
- Movement within current POI does NOT require location change

### propose_npc_discovered
- When player meets a NEW NPC not seen before
- Include role and personality traits

## Output
- Only propose changes that DIRECTLY result from the player's action
- Do NOT anticipate or pre-propose future interactions`;
}

/**
 * Run the Orchestrator agent
 * Handles read tool calls in a loop, collects proposal tool calls
 */
export async function runOrchestrator(
  playerAction: string,
  character: Character,
  world: WorldContext,
  recentTurns: Turn[],
  rollOutcome?: { skill: string; success: boolean; total: number; dc: number },
  detectedIntent?: string,
  questContext?: QuestContext
): Promise<OrchestratorOutput> {
  const systemPrompt = buildOrchestratorPrompt(character, world, recentTurns, questContext);
  
  // Build user message with intent and optional roll outcome
  let userMessage = `${systemPrompt}\n\nPlayer action: "${playerAction}"`;
  if (detectedIntent) {
    userMessage += `\nIntent: ${detectedIntent}`;
  }
  if (rollOutcome) {
    userMessage += `\n\n## Roll Outcome
- Skill: ${rollOutcome.skill}
- Result: ${rollOutcome.success ? "SUCCESS" : "FAILURE"} (rolled ${rollOutcome.total} vs DC ${rollOutcome.dc})
- Base proposals on this outcome. If failed, limit positive outcomes.`;
  }
  
  // Remove detect_intent from tools since Rune Marshal already did that
  const proposalTools = PROPOSAL_TOOLS.filter(t => t.name !== "detect_intent");
  const allTools = [...READ_TOOLS, ...proposalTools];
  
  const messages: Content[] = [
    { role: "user", parts: [{ text: userMessage }] },
  ];

  const proposals: ProposalResult[] = [];
  const traceDetails: string[] = [];
  let intent: DetectIntentResult | null = null;
  let iterations = 0;
  const maxIterations = 5;

  try {
    while (iterations < maxIterations) {
      iterations++;
      const iterStart = Date.now();

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: messages,
        config: {
          tools: [{ functionDeclarations: allTools }],
          toolConfig: {
            functionCallingConfig: { mode: FunctionCallingConfigMode.ANY },
          },
          temperature: 0.1,
        },
      });

      const llmMs = Date.now() - iterStart;
      const parts = response.candidates?.[0]?.content?.parts || [];
      const functionCalls = parts.filter(p => p.functionCall).map(p => p.functionCall!);

      if (functionCalls.length === 0) {
        traceDetails.push(`LLM call ${iterations}: ${llmMs}ms (no tool calls)`);
        break;
      }

      // Process each function call
      const functionResponseParts: Part[] = [];
      let hasReadTools = false;
      const readToolNames: string[] = [];
      const proposalNames: string[] = [];

      for (const call of functionCalls) {
        const name = call.name as string;
        const args = call.args as Record<string, unknown>;

        // Check if it's a read tool
        if (name === "get_skill_level") {
          hasReadTools = true;
          readToolNames.push(name);
          const result = handleReadToolCall(name, args, character);
          functionResponseParts.push({
            functionResponse: { name, response: result as Record<string, unknown> },
          });
        } else {
          // It's a proposal tool - collect it
          proposalNames.push(name);
          if (name === "detect_intent") {
            intent = args as unknown as DetectIntentResult;
            proposals.push({ type: "detect_intent", data: intent });
          } else {
            proposals.push({ type: name, data: args } as unknown as ProposalResult);
          }
        }
      }

      // Build trace detail for this iteration
      let detail = `LLM call ${iterations}: ${llmMs}ms`;
      if (readToolNames.length > 0) {
        detail += ` → read: ${readToolNames.join(", ")}`;
      }
      if (proposalNames.length > 0) {
        detail += ` → propose: ${proposalNames.join(", ")}`;
      }
      traceDetails.push(detail);

      // If we had read tools but NO proposals, continue to get proposals
      // If we got proposals (with or without read tools), we're done
      if (proposalNames.length > 0) {
        // Got proposals, we're done
        break;
      } else if (hasReadTools && functionResponseParts.length > 0) {
        // Only read tools, continue conversation to get proposals
        messages.push({
          role: "model",
          parts: functionCalls.map(fc => ({ functionCall: fc })),
        });
        messages.push({
          role: "user",
          parts: functionResponseParts,
        });
      } else {
        // No read tools and no proposals, we're done
        break;
      }
    }
  } catch (error) {
    console.error("Orchestrator LLM error:", error);
    traceDetails.push(`Error: ${error instanceof Error ? error.message : "unknown"}`);
  }

  // Ensure we have an intent
  if (!intent) {
    intent = {
      primary_skill: "Perception",
      requires_roll: false,
    };
  }

  return { intent, proposals, traceDetails };
}
