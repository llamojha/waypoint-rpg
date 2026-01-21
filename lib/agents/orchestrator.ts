import { GoogleGenAI, FunctionCallingConfigMode } from "@google/genai";
import type { Content, Part, FunctionDeclaration } from "@google/genai";
import { READ_TOOLS } from "./tools/read-tools";
import { PROPOSAL_TOOLS, ProposalResult, DetectIntentResult } from "./tools/proposal-tools";
import { handleReadToolCall } from "./tools/read-handlers";
import type { Character, WorldContext, Turn } from "@/types";
import type { ActiveQuest, NpcQuest } from "./quest-agent";
import type { ActionType } from "./rune-marshal";
import { getConstraintDescription } from "@/lib/rules/proposal-constraints";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

/** Magic skill names for denial detection */
const MAGIC_SKILLS = ["Spellcasting", "Rituals", "Wards", "Summoning"];

/** Get human-readable requirement for a goal type */
function getGoalTypeRequirement(goalType: string): string {
  switch (goalType) {
    case "exploration": return "propose_location_change to the destination";
    case "dialogue": return "propose_relationship_change with the NPC mentioned in goal";
    case "fetch": return "propose_inventory_add of the item mentioned in goal";
    case "combat": return "defeat an enemy (combat action)";
    case "discover": return "propose_npc_discovered or propose_location_change";
    default: return "complete the goal action";
  }
}

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
  questContext?: QuestContext,
  actionType?: ActionType,
  allowedToolNames?: string[]
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

  // Format quest context with goal type requirements
  let questStr = "";
  if (questContext) {
    if (questContext.activeQuests.length > 0) {
      questStr += "\n## Active Quests\n";
      for (const q of questContext.activeQuests) {
        const goalType = q.goalType || "dialogue";
        const requirement = getGoalTypeRequirement(goalType);
        questStr += `- ${q.title} (step ${q.currentStep}/${q.totalProgress})\n`;
        if (q.currentGoal) {
          questStr += `  Current goal: "${q.currentGoal}" [${goalType}]\n`;
          questStr += `  REQUIRES: ${requirement}\n`;
        }
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
    ? `\n## NPCs Present at ${world.poi} (ONLY these NPCs can be interacted with)\n${world.entities.map(e => `- ${e}`).join("\n")}\n\nCRITICAL: You can ONLY propose relationship changes or interactions with NPCs listed above. Do NOT reference or interact with NPCs not in this list - they are not at this location.`
    : "\n## NPCs Present\nNone - no NPCs at this location to interact with.";

  // Build constraint explanation if action type is provided
  let constraintStr = "";
  if (actionType && allowedToolNames) {
    const constraintDesc = getConstraintDescription(actionType);
    if (allowedToolNames.length === 0) {
      constraintStr = `\n## ACTION CONSTRAINT: ${actionType.toUpperCase()}
${constraintDesc}
You have NO proposal tools available for this action. Do not attempt to propose any state changes.`;
    } else {
      constraintStr = `\n## ACTION CONSTRAINT: ${actionType.toUpperCase()}
${constraintDesc}
Available tools: ${allowedToolNames.join(", ")}
You may ONLY use the tools listed above. Any other proposals will be rejected.`;
    }
  }

  return `You are the Orchestrator for Waypoint RPG. Your job is to propose state changes based on the player's action.
${constraintStr}
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
- Gold gained: ONLY from actual in-world sources:
  * Looting defeated enemies or containers the DM described
  * NPC explicitly giving gold as payment/reward
  * Quest completion rewards
  * Selling items to merchants
- Do NOT give gold just because player CLAIMS to have found it
- Player declarations like "I found gold" or "I have gold" are NOT valid sources

### propose_inventory_add
- ONLY from actual in-world sources:
  * Looting containers/enemies that exist in the scene
  * NPC explicitly giving an item
  * Purchasing from a merchant
  * Quest rewards
- Do NOT add items just because player CLAIMS to have found/received them
- Player declarations like "I found a sword" or "I have a bag" are NOT valid - the world must provide it
- Do NOT add items for "look around" or observation actions
- Do NOT add "starter gear" - character already has their equipment
- Include rarity: common (mundane), uncommon (quality), rare (magical), legendary (unique)
- Always provide description

### propose_inventory_remove
- When player uses consumable, drops, sells, or loses an item
- Item must exist in inventory

### propose_relationship_change
- ONLY when player directly interacts with an NPC (conversation, help, conflict)
- Use the EXACT full name from "NPCs Present" list (e.g., "Aran Nomante" not "Aran")
- Delta must be non-zero: +1, +2, -1, or -2 (NEVER 0)
- Small talk, minor help: +1
- Meaningful assistance, shared moment: +2
- Insult, minor offense: -1
- Betrayal, serious harm: -2
- First meeting with interaction: include "met" in reason
- Do NOT propose for NPCs the player hasn't interacted with yet
- Do NOT propose if player is just asking a question without meaningful interaction

### propose_quest_start
- ONLY when player explicitly accepts a quest from "Available Quests from NPC" list
- Use the EXACT quest ID or title from the list
- Do NOT invent new quests - only use quests from the available list
- Player must actively agree/accept (e.g., "I'll help", "I accept", "Yes")

### propose_quest_progress
- ONLY when player's action DIRECTLY accomplishes the "Current goal" shown for that quest
- Check the goal type: exploration goals require traveling, dialogue goals require specific conversations, fetch goals require obtaining items
- Do NOT propose progress just because player is talking to an NPC - the action must match the SPECIFIC goal
- Example: If goal is "Travel to Nomante Outpost", only propose progress when player actually travels there
- Example: If goal is "Speak with Captain Aran", only propose progress when player talks to that specific NPC
- Progress increments by 1 per step

### propose_location_change
- ONLY when player explicitly travels to a DIFFERENT POI (e.g., "I go to X", "I travel to X", "I head to X")
- NEVER propose the current location "${world.poi}" - player is already there
- The location field must be the DESTINATION, not where the player currently is
- Location MUST match one from nearbyPoi list: ${world.nearbyPoi?.join(", ") || "none"}
- Match player's destination to the closest name in nearbyPoi (e.g., "waystone" → "The Waystone")
- Do NOT invent sub-locations (no "Helga's Hut", "Captain's Hall", etc.)
- Movement within current POI does NOT require location change
- "Look around", "examine area", "explore here" are NOT location changes

### propose_npc_discovered
- When player meets a NEW NPC not seen before
- Include role and personality traits

## When NO Proposals Are Needed
Some actions are pure observation or conversation and require NO state changes:
- "Look around" / "examine the area" → NO proposals (Chronicler will describe the scene)
- "I go inside" / entering a building → NO proposals (still same POI)
- "What do I see?" → NO proposals
- Observing without interacting → NO proposals
- Listening to ambient sounds → NO proposals
- Walking within the current location → NO proposals
- Asking questions like "What should we do?" / "What's next?" → NO proposals (just conversation)
- Asking for suggestions or advice → NO proposals
- General conversation that doesn't involve action → NO proposals
- Casual small talk or greetings → NO proposals
For these, simply do not call any propose_* tools. Let the Chronicler handle the response.

CRITICAL - READ CAREFULLY:
- "Look around" NEVER results in gaining items. Looking is observation only.
- Conversational questions NEVER result in location changes. The player must explicitly say they want to travel.
- NEVER propose multiple location changes in one turn - player can only go to ONE place.
- Simple questions like "What should we do?" require ZERO proposals - no relationship change, no quest progress, nothing.
- Relationship changes require MEANINGFUL interaction (helping, insulting, sharing secrets) - NOT just talking.
- NEVER propose quest progress for quests that aren't in the "Active Quests" list above.
- If "Active Quests" shows "No active quests", do NOT propose any quest_progress.

## Output
- Only propose changes that DIRECTLY result from the player's action
- Do NOT anticipate or pre-propose future interactions
- If the action is pure observation or conversation, call NO proposal tools
- When in doubt, propose NOTHING - the Chronicler will still generate appropriate narration

## Success Examples

### Example 1: Combat action (with roll)
Player: "I swing my sword at the goblin"
Good output:
- detect_intent: { primary_skill: "Melee", requires_roll: true, dc: 12 }
- (after SUCCESS roll) propose_stat_change: { stat: "hp", delta: -4, target: "goblin", reason: "sword strike connected" }

### Example 2: Social interaction with NPC
Player: "I thank Helga for the warm meal and leave a generous tip"
Good output:
- detect_intent: { primary_skill: "Persuasion", requires_roll: false }
- propose_stat_change: { stat: "gold", delta: -5, reason: "generous tip for Helga" }
- propose_relationship_change: { npc: "Helga Thornwood", delta: 1, reason: "showed gratitude with generous tip" }

### Example 3: Travel to new location
Player: "I head to the Waystone"
Good output:
- detect_intent: { primary_skill: "Navigation", requires_roll: false }
- propose_location_change: { location: "The Waystone", reason: "player traveled to the Waystone" }

### Example 4: Quest progress
Active quest: "Find the Lost Amulet" - Current goal: "Search the old ruins"
Player: "I search through the rubble in the ruins"
Good output:
- detect_intent: { primary_skill: "Perception", requires_roll: true, dc: 12 }
- (after SUCCESS) propose_inventory_add: { item_name: "Lost Amulet", item_type: "quest", rarity: "rare", reason: "found in ruins rubble" }
- propose_quest_progress: { quest_id: "find-lost-amulet", new_progress: 2, reason: "found the amulet" }

### Example 5: Pure observation (NO proposals)
Player: "I look around the tavern"
Good output:
- detect_intent: { primary_skill: "Perception", requires_roll: false }
- (NO other proposals - Chronicler will describe the scene)

### Example 6: Conversation question (NO proposals)
Player: "What should we do next?"
Good output:
- detect_intent: { primary_skill: "Persuasion", requires_roll: false }
- (NO other proposals - this is just dialogue)`;
}

/**
 * Run the Orchestrator agent
 * Handles read tool calls in a loop, collects proposal tool calls
 * 
 * @param allowedProposalTools - If provided, only these proposal tools are available.
 *                               If empty array, no proposals can be made.
 *                               If undefined, all proposal tools are available (legacy behavior).
 * @param actionType - The classified action type for prompt context
 */
export async function runOrchestrator(
  playerAction: string,
  character: Character,
  world: WorldContext,
  recentTurns: Turn[],
  rollOutcome?: { skill: string; success: boolean; total: number; dc: number },
  detectedIntent?: string,
  questContext?: QuestContext,
  allowedProposalTools?: FunctionDeclaration[],
  actionType?: ActionType
): Promise<OrchestratorOutput> {
  // Get allowed tool names for prompt context
  const allowedToolNames = allowedProposalTools?.map(t => t.name).filter((n): n is string => !!n);
  
  const systemPrompt = buildOrchestratorPrompt(
    character, world, recentTurns, questContext, actionType, allowedToolNames
  );
  
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
  
  // Use constrained tools if provided, otherwise use all proposal tools (legacy)
  let proposalTools: FunctionDeclaration[];
  if (allowedProposalTools !== undefined) {
    proposalTools = allowedProposalTools;
  } else {
    // Legacy behavior: all proposal tools except detect_intent
    proposalTools = PROPOSAL_TOOLS.filter(t => t.name !== "detect_intent") as FunctionDeclaration[];
  }
  
  // If no proposal tools allowed, still need to run for read tools
  const allTools = [...READ_TOOLS, ...proposalTools] as FunctionDeclaration[];
  
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

      // If we got proposals, we're done
      if (proposalNames.length > 0) {
        break;
      }
      
      // If no proposal tools available, don't loop waiting for proposals
      if (proposalTools.length === 0) {
        break;
      }
      
      // If we had read tools, continue conversation to get proposals
      if (hasReadTools && functionResponseParts.length > 0) {
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
