import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { dbToCharacter, dbToWorld } from "@/lib/supabase/transforms";
import { runRuneMarshal } from "@/lib/agents/rune-marshal";
import { runOrchestrator, type QuestContext } from "@/lib/agents/orchestrator";
import { runArbiter, proposalsToEvents } from "@/lib/agents/arbiter";
import { runLorekeeper } from "@/lib/agents/lorekeeper";
import { runQuestAgent } from "@/lib/agents/quest-agent";
import { collectParallelOutputs, buildChroniclerContext } from "@/lib/agents/collector";
import type { ProposalResult } from "@/lib/agents/tools/proposal-tools";
import { resolveSkillCheck, calculateTotalModifier } from "@/lib/agents/mechanics";
import { generateTurn } from "@/lib/gemini/client";
import { buildTurnPrompt } from "@/lib/gemini/prompts";
import { applyEvents } from "@/lib/turn/apply";
import { filterInput, filterOutput, FALLBACK_NARRATION } from "@/lib/safety/sentinel";
import type { Turn, TurnDiff, Character, WorldContext, AgentTrace } from "@/types";
import type { ValidatedEvent } from "@/lib/turn/validate";

interface TurnRequest {
  characterId: string;
  playerAction?: string;
  rollOnly?: boolean;  // If true, just roll dice and return result (no narration)
  narrate?: boolean;   // If true, generate narration for already-rolled turn
  turnId?: string;
}

interface TurnResponse {
  turn: {
    id: string;
    narration: string;
    diffs: TurnDiff[];
    suggestedActions: string[];
    mechanics?: Turn["mechanics"];
    trace?: AgentTrace[];
  };
  updatedCharacter?: Partial<Character>;
  updatedWorld?: Partial<WorldContext>;
  pendingRoll?: boolean;
}

function dbToTurn(row: {
  id: string;
  player_action: string;
  narration: string | null;
  mechanics: unknown;
  diffs: unknown;
  suggested_actions: unknown;
  created_at: string | null;
}): Turn {
  return {
    id: row.id,
    timestamp: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    playerAction: row.player_action,
    narration: row.narration || "",
    isStreaming: false,
    mechanics: row.mechanics as Turn["mechanics"],
    suggestedActions: (row.suggested_actions as string[]) || [],
    diffs: (row.diffs as TurnDiff[]) || [],
  };
}

/**
 * Format a proposal for trace display with meaningful details
 */
function formatProposalForTrace(p: ProposalResult): string {
  switch (p.type) {
    case "propose_stat_change":
      const sign = p.data.delta > 0 ? "+" : "";
      return `${p.data.stat.toUpperCase()} ${sign}${p.data.delta}`;
    case "propose_inventory_add":
      return `+Item: ${p.data.item_name}`;
    case "propose_inventory_remove":
      return `-Item: ${p.data.item_name}`;
    case "propose_relationship_change":
      const relSign = p.data.delta > 0 ? "+" : "";
      return `${p.data.npc} ${relSign}${p.data.delta}`;
    case "propose_location_change":
      return `Travel to: ${p.data.location}`;
    case "propose_quest_start":
      return `Start quest: ${p.data.quest_title || p.data.quest_id}`;
    case "propose_quest_progress":
      return `Quest progress: ${p.data.quest_id} → step ${p.data.new_progress}`;
    case "propose_npc_discovered":
      return `New NPC: ${p.data.name} (${p.data.role})`;
    case "detect_intent":
      return `Intent: ${p.data.primary_skill}${p.data.requires_roll ? ` DC ${p.data.dc}` : ''}`;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const characterId = searchParams.get("character_id");

    if (!characterId) {
      return NextResponse.json({ error: "character_id is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: turnRows, error } = await supabase
      .from("waypoint_turns")
      .select("*")
      .eq("character_id", characterId)
      .order("created_at", { ascending: false })
      .limit(50);

    turnRows?.reverse();

    if (error) {
      console.error("Error loading turns:", error);
      return NextResponse.json({ error: "Failed to load turns" }, { status: 500 });
    }

    return NextResponse.json({ turns: (turnRows || []).map(dbToTurn) });
  } catch (error) {
    console.error("Turn loading error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/turn - New Agent Pipeline
 * Flow: Orchestrator → Mechanics → Arbiter → Chronicler
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TurnRequest;
    const { characterId, playerAction, rollOnly, narrate, turnId } = body;

    if (!characterId || typeof characterId !== "string") {
      return NextResponse.json({ error: "characterId is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Load character
    const { data: characterRow, error: characterError } = await supabase
      .from("waypoint_characters")
      .select("*")
      .eq("id", characterId)
      .single();

    if (characterError || !characterRow) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    const character = dbToCharacter(characterRow);

    // Load world state
    const { data: worldRow, error: worldError } = await supabase
      .from("waypoint_world_state")
      .select("*")
      .eq("character_id", characterId)
      .single();

    if (worldError || !worldRow) {
      return NextResponse.json({ error: "World state not found" }, { status: 404 });
    }

    const world = dbToWorld(worldRow);

    // Load known NPC names for this character
    const { data: knownNpcRows } = await supabase
      .from("waypoint_character_npcs")
      .select("waypoint_npcs(name)")
      .eq("character_id", characterId);
    
    const knownNpcNames = new Set<string>(
      (knownNpcRows || [])
        .map((row) => {
          const npcs = row.waypoint_npcs as { name: string } | { name: string }[] | null;
          if (Array.isArray(npcs)) return npcs[0]?.name?.toLowerCase();
          return npcs?.name?.toLowerCase();
        })
        .filter((name): name is string => typeof name === "string")
    );

    // Load recent turns (only completed turns with narration)
    const { data: turnRows } = await supabase
      .from("waypoint_turns")
      .select("*")
      .eq("character_id", characterId)
      .not("narration", "is", null)
      .order("created_at", { ascending: false })
      .limit(100);

    const recentTurns = (turnRows || []).map(dbToTurn).reverse();

    // ROLL ONLY: Just roll dice and return result (no narration)
    if (rollOnly && turnId) {
      return handleRollResolution(supabase, turnId, character, world, recentTurns, true, knownNpcNames);
    }

    // NARRATE: Generate narration for already-rolled turn
    if (narrate && turnId) {
      return handleRollResolution(supabase, turnId, character, world, recentTurns, false, knownNpcNames);
    }

    // NEW TURN: Validate playerAction
    if (!playerAction || typeof playerAction !== "string") {
      return NextResponse.json({ error: "playerAction is required" }, { status: 400 });
    }

    // Initialize trace collection
    const traces: AgentTrace[] = [];

    // Safety filter on input
    const sentinelStart = Date.now();
    const inputFilter = filterInput(playerAction);
    traces.push({
      agent: "sentinel",
      status: inputFilter.status === "block" ? "error" : "success",
      durationMs: Date.now() - sentinelStart,
      description: inputFilter.status === "block" 
        ? `Blocked unsafe input: "${playerAction.slice(0, 30)}..."`
        : `Input passed safety check`,
      details: [`Scanned ${playerAction.length} characters`, `Result: ${inputFilter.status.toUpperCase()}`],
    });

    if (inputFilter.status === "block") {
      return NextResponse.json({ error: inputFilter.output }, { status: 400 });
    }

    // === RUNE MARSHAL (intent detection only) ===
    const runeMarshalStart = Date.now();
    const intent = await runRuneMarshal(playerAction, character, world);
    traces.push({
      agent: "rune_marshal",
      status: "success",
      durationMs: Date.now() - runeMarshalStart,
      description: intent.requires_roll 
        ? `Detected ${intent.primary_skill} check (DC ${intent.dc})`
        : `No skill check required - routine action`,
      details: [
        `Intent: ${intent.intent}`,
        `Primary skill: ${intent.primary_skill}`,
        intent.requires_roll ? `Difficulty: DC ${intent.dc}` : `Routine action`,
        intent.power_words?.length ? `Power words: ${intent.power_words.join(", ")}` : `No power words detected`,
        intent.bonus ? `Bonus: +${intent.bonus}` : null,
      ].filter(Boolean) as string[],
    });

    // Handle denied actions (e.g., magic when not unlocked)
    if (intent.denial_reason) {
      const { data: turnRow, error: turnInsertError } = await supabase
        .from("waypoint_turns")
        .insert({
          character_id: characterId,
          player_action: playerAction,
          narration: intent.denial_reason,
          diffs: [],
          suggested_actions: ["Look around", "Try something else"],
          mechanics: null,
        })
        .select()
        .single();

      if (turnInsertError) {
        return NextResponse.json({ error: "Failed to save turn" }, { status: 500 });
      }

      return NextResponse.json({
        turn: {
          id: turnRow.id,
          narration: intent.denial_reason,
          diffs: [],
          suggestedActions: ["Look around", "Try something else"],
          trace: traces,
        },
      });
    }

    // If action requires a roll, create pending turn (no Orchestrator yet)
    if (intent.requires_roll && intent.dc) {
      const skillLevel = character.skills[intent.primary_skill]?.level || 0;
      const modifier = calculateTotalModifier(skillLevel, intent.bonus || 0);

      const mechanics: Turn["mechanics"] & { detectedIntent?: string } = {
        type: "check",
        skill: intent.primary_skill,
        dc: intent.dc,
        modifier,
        detectedIntent: intent.intent,
      };

      // Save turn with pending roll - Orchestrator runs after roll
      const { data: turnRow, error: turnInsertError } = await supabase
        .from("waypoint_turns")
        .insert({
          character_id: characterId,
          player_action: playerAction,
          narration: null,
          diffs: [],
          suggested_actions: [],
          mechanics,
        })
        .select()
        .single();

      if (turnInsertError) {
        return NextResponse.json({ error: "Failed to save turn" }, { status: 500 });
      }

      return NextResponse.json({
        turn: {
          id: turnRow.id,
          narration: "",
          diffs: [],
          suggestedActions: [],
          mechanics,
          trace: traces,
        },
        pendingRoll: true,
      });
    }

    // === QUEST AGENT: Gather quest context ===
    // Parse NPC name from player action to check for available quests
    const actionLower = playerAction.toLowerCase();
    const mentionedNpc = world.entities?.find(npc => 
      actionLower.includes(npc.toLowerCase()) || 
      actionLower.includes(npc.split(" ")[0].toLowerCase()) // Match first name too
    );
    
    const questAgentStart = Date.now();
    const questAgentResult = await runQuestAgent(characterId, mentionedNpc);
    const activeQuestNames = questAgentResult.activeQuests.map(q => q.title).slice(0, 3);
    traces.push({
      agent: "quest_agent",
      status: "success",
      durationMs: Date.now() - questAgentStart,
      description: questAgentResult.activeQuests.length > 0
        ? `Found ${questAgentResult.activeQuests.length} active quest(s)`
        : `No active quests`,
      details: [
        ...activeQuestNames.map(name => `Active: "${name}"`),
        mentionedNpc ? `Checking quests from: ${mentionedNpc}` : null,
        questAgentResult.npcQuests.length > 0 ? `${questAgentResult.npcQuests.length} NPC quest hooks available` : null,
      ].filter(Boolean) as string[],
    });

    const questContext: QuestContext = {
      activeQuests: questAgentResult.activeQuests,
      npcQuests: questAgentResult.npcQuests,
    };

    // === NO ROLL NEEDED - Run Orchestrator with quest context ===
    // Skip Orchestrator for pure observation actions - go straight to Chronicler
    const isObservationOnly = /^(i )?(look|examine|observe|survey|scan|check out|see|watch|gaze|glance)\b.*\b(around|area|surroundings|room|place|here)?\b/i.test(playerAction.trim());
    
    const orchestratorStart = Date.now();
    let orchestratorResult;
    
    if (isObservationOnly) {
      // Skip LLM call - no proposals needed for observation
      orchestratorResult = {
        intent: { primary_skill: "Perception", requires_roll: false },
        proposals: [],
        traceDetails: ["Observation action - skipped proposal generation"],
      };
    } else {
      orchestratorResult = await runOrchestrator(playerAction, character, world, recentTurns, undefined, intent.intent, questContext);
    }
    
    const proposalsList = orchestratorResult.proposals;
    traces.push({
      agent: "orchestrator",
      status: "success",
      durationMs: Date.now() - orchestratorStart,
      description: `Generated ${proposalsList.length} proposal(s)`,
      details: [
        ...(orchestratorResult.traceDetails || []),
        ...(proposalsList.length > 0 
          ? proposalsList.map(p => `→ ${formatProposalForTrace(p)}`)
          : [`No state changes proposed`]),
      ],
    });
    
    return completeTurnPipeline(
      supabase,
      characterId,
      playerAction,
      character,
      world,
      recentTurns,
      orchestratorResult.proposals,
      undefined,
      0,
      questContext,
      knownNpcNames,
      traces
    );
  } catch (error) {
    console.error("Turn processing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Handle roll resolution for pending skill check
 * Phase 1 (rollOnly=true): Just roll dice, return result immediately
 * Phase 2 (rollOnly=false): Generate narration with roll outcome
 */
async function handleRollResolution(
  supabase: ReturnType<typeof createAdminClient>,
  turnId: string,
  character: Character,
  world: WorldContext,
  recentTurns: Turn[],
  rollOnly: boolean = false,
  knownNpcNames: Set<string> = new Set()
) {
  // Load pending turn
  const { data: turnRow, error: turnError } = await supabase
    .from("waypoint_turns")
    .select("*")
    .eq("id", turnId)
    .single();

  if (turnError || !turnRow) {
    return NextResponse.json({ error: "Turn not found" }, { status: 404 });
  }

  const mechanics = turnRow.mechanics as Turn["mechanics"] & { detectedIntent?: string };
  if (!mechanics) {
    return NextResponse.json({ error: "No mechanics on turn" }, { status: 400 });
  }

  // If already has outcome and this is rollOnly, return existing result
  if (mechanics.outcome && rollOnly) {
    return NextResponse.json({
      turn: {
        id: turnId,
        mechanics: {
          type: mechanics.type,
          skill: mechanics.skill,
          dc: mechanics.dc,
          modifier: mechanics.modifier,
          rolled: mechanics.rolled,
          total: mechanics.total,
          outcome: mechanics.outcome,
        },
      },
      rollComplete: true,
    });
  }

  // If no outcome yet, roll the dice
  if (!mechanics.outcome) {
    const skillLevel = character.skills[mechanics.skill]?.level || 0;
    const checkResult = resolveSkillCheck(
      mechanics.skill,
      skillLevel,
      mechanics.modifier || 0,
      mechanics.dc
    );

    const updatedMechanics: Turn["mechanics"] & { detectedIntent?: string } = {
      type: "check",
      skill: mechanics.skill,
      dc: mechanics.dc,
      modifier: mechanics.modifier,
      rolled: checkResult.rolled,
      total: checkResult.total,
      outcome: checkResult.success ? "success" : "failure",
      detectedIntent: mechanics.detectedIntent,
    };

    // Save roll result immediately
    await supabase
      .from("waypoint_turns")
      .update({ mechanics: updatedMechanics })
      .eq("id", turnId);

    // If rollOnly, return just the roll result
    if (rollOnly) {
      return NextResponse.json({
        turn: {
          id: turnId,
          mechanics: {
            type: updatedMechanics.type,
            skill: updatedMechanics.skill,
            dc: updatedMechanics.dc,
            modifier: updatedMechanics.modifier,
            rolled: updatedMechanics.rolled,
            total: updatedMechanics.total,
            outcome: updatedMechanics.outcome,
          },
        },
        rollComplete: true,
      });
    }

    // Continue with narration using updated mechanics
    return continueWithNarration(
      supabase,
      turnId,
      turnRow.player_action,
      character,
      world,
      recentTurns,
      updatedMechanics,
      knownNpcNames
    );
  }

  // Has outcome, not rollOnly - continue with narration
  return continueWithNarration(
    supabase,
    turnId,
    turnRow.player_action,
    character,
    world,
    recentTurns,
    mechanics,
    knownNpcNames
  );
}

/**
 * Continue turn pipeline with narration after roll is complete
 * Includes retry loop for Arbiter rejections
 */
async function continueWithNarration(
  supabase: ReturnType<typeof createAdminClient>,
  turnId: string,
  playerAction: string,
  character: Character,
  world: WorldContext,
  recentTurns: Turn[],
  mechanics: NonNullable<Turn["mechanics"]> & { detectedIntent?: string },
  knownNpcNames: Set<string> = new Set()
) {
  const MAX_RETRIES = 2;
  const traces: AgentTrace[] = [];
  
  const rollOutcome = {
    skill: mechanics.skill,
    success: mechanics.outcome === "success",
    total: mechanics.total!,
    dc: mechanics.dc,
  };

  // === QUEST AGENT: Gather quest context ===
  // Parse NPC name from player action to check for available quests
  const actionLower = playerAction.toLowerCase();
  const mentionedNpc = world.entities?.find(npc => 
    actionLower.includes(npc.toLowerCase()) || 
    actionLower.includes(npc.split(" ")[0].toLowerCase()) // Match first name too
  );
  
  const questAgentStart = Date.now();
  const questAgentResult = await runQuestAgent(character.id!, mentionedNpc);
  const activeQuestNames = questAgentResult.activeQuests.map(q => q.title).slice(0, 3);
  traces.push({
    agent: "quest_agent",
    status: "success",
    durationMs: Date.now() - questAgentStart,
    description: questAgentResult.activeQuests.length > 0
      ? `Found ${questAgentResult.activeQuests.length} active quest(s)`
      : `No active quests`,
    details: [
      ...activeQuestNames.map(name => `Active: "${name}"`),
      mentionedNpc ? `Checking quests from: ${mentionedNpc}` : null,
      questAgentResult.npcQuests.length > 0 ? `${questAgentResult.npcQuests.length} NPC quest hooks available` : null,
    ].filter(Boolean) as string[],
  });
  
  const questContext: QuestContext = {
    activeQuests: questAgentResult.activeQuests,
    npcQuests: questAgentResult.npcQuests,
  };

  // Run Orchestrator with retry loop
  let proposals: ProposalResult[] = [];
  let arbiterResult;
  let lorekeeperResult;

  for (let retry = 0; retry <= MAX_RETRIES; retry++) {
    const rejectionContext = retry > 0 && arbiterResult?.rejected.length
      ? `Previous proposals rejected: ${arbiterResult.rejected.map(r => `${r.proposal.type} - ${r.reason}`).join("; ")}. Please adjust.`
      : mechanics.detectedIntent;

    const orchestratorStart = Date.now();
    const orchestratorResult = await runOrchestrator(
      playerAction,
      character,
      world,
      recentTurns,
      rollOutcome,
      rejectionContext,
      questContext
    );
    proposals = orchestratorResult.proposals;
    
    if (retry === 0) {
      traces.push({
        agent: "orchestrator",
        status: "success",
        durationMs: Date.now() - orchestratorStart,
        description: `Generated ${proposals.length} proposal(s) after ${mechanics.outcome} roll`,
        details: [
          ...(orchestratorResult.traceDetails || []),
          ...(proposals.length > 0 
            ? proposals.map(p => `→ ${formatProposalForTrace(p)}`)
            : [`No state changes proposed`]),
        ],
      });
    } else {
      // Log retry attempts
      traces.push({
        agent: "orchestrator",
        status: "success",
        durationMs: Date.now() - orchestratorStart,
        description: `Retry ${retry}: Generated ${proposals.length} proposal(s)`,
        details: proposals.length > 0 
          ? proposals.map(p => `→ ${formatProposalForTrace(p)}`)
          : [`No state changes proposed`],
      });
    }

    // === PARALLEL: ARBITER + LOREKEEPER ===
    const parallelStart = Date.now();
    const activeQuestIds = questContext?.activeQuests.map(q => q.id) || [];
    const availableQuestIds = questContext?.npcQuests.map(q => q.id) || [];
    const availableQuestTitles = questContext?.npcQuests.map(q => q.title) || [];
    [arbiterResult, lorekeeperResult] = await Promise.all([
      runArbiter(proposals, {
        character,
        world,
        playerAction,
        rollOutcome,
        activeQuestIds,
        availableQuestIds,
        availableQuestTitles,
      }),
      runLorekeeper(playerAction, world, character.id!),
    ]);

    // Smart retry logic: categorize rejections
    const unfixablePatterns = [
      /not present/i,
      /not at.*location/i,
      /invalid location/i,
      /not in inventory/i,
      /not active/i,
      /no.*quests/i,
      /already at/i,
    ];
    
    const hasUnfixableRejections = arbiterResult.rejected.some(r => 
      unfixablePatterns.some(pattern => pattern.test(r.reason))
    );
    
    const hasFixableRejections = arbiterResult.rejected.some(r =>
      /capped|too high|too large|exceeds/i.test(r.reason)
    );

    // If no rejections, all unfixable, or max retries reached, break
    const shouldSkipRetry = arbiterResult.rejected.length === 0 
      || (hasUnfixableRejections && !hasFixableRejections)
      || retry === MAX_RETRIES;
      
    if (shouldSkipRetry) {
      const parallelDuration = Date.now() - parallelStart;
      const npcNames = lorekeeperResult.npcsPresent?.map(n => n.name) || [];
      traces.push({
        agent: "arbiter",
        status: arbiterResult.rejected.length > 0 ? "error" : "success",
        durationMs: parallelDuration,
        description: arbiterResult.rejected.length > 0
          ? `Rejected ${arbiterResult.rejected.length} proposal(s), approved ${arbiterResult.approved.length}`
          : `Validated all ${arbiterResult.approved.length} proposal(s)`,
        details: [
          ...arbiterResult.approved.map(p => `✓ ${formatProposalForTrace(p)}`),
          ...arbiterResult.rejected.map(r => `✗ ${formatProposalForTrace(r.proposal)} - ${r.reason}`),
        ],
      });
      traces.push({
        agent: "lorekeeper",
        status: "success",
        durationMs: parallelDuration,
        description: `Fetched context for ${world.poi}`,
        details: [
          npcNames.length > 0 ? `NPCs present: ${npcNames.join(", ")}` : `No NPCs at this location`,
          lorekeeperResult.codexSnippets?.length ? `Found ${lorekeeperResult.codexSnippets.length} codex entries` : `No relevant lore`,
          lorekeeperResult.atmosphere ? `Atmosphere: ${lorekeeperResult.atmosphere.mood}` : null,
        ].filter(Boolean) as string[],
      });
      break;
    }
  }

  // === COLLECTOR: First pass - merge parallel outputs ===
  const collectorStart = Date.now();
  const collected = collectParallelOutputs(arbiterResult!, lorekeeperResult!);
  traces.push({
    agent: "collector",
    status: "success",
    durationMs: Date.now() - collectorStart,
    description: `Merged arbiter and lorekeeper outputs`,
    details: [
      `${collected.arbiter.approved.length} approved events ready`,
      collected.lore.npcsPresent?.length ? `${collected.lore.npcsPresent.length} NPC(s) in context` : `No NPCs in context`,
    ],
  });

  // Convert approved proposals to events for applyEvents
  const approvedEvents = proposalsToEvents(collected.arbiter.approved);

  // === APPLY STATE ===
  const applyStart = Date.now();
  const applyResult = applyEvents(character, world, approvedEvents as unknown as ValidatedEvent[], knownNpcNames);
  const diffDescriptions = applyResult.diffs.map(d => {
    if (d.value !== undefined) {
      return `${d.type}: ${d.text} (${d.value})`;
    }
    return `${d.type}: ${d.text}`;
  });
  traces.push({
    agent: "apply_state",
    status: "success",
    durationMs: Date.now() - applyStart,
    description: applyResult.diffs.length > 0
      ? `Applied ${applyResult.diffs.length} state change(s)`
      : `No state changes to apply`,
    details: diffDescriptions.length > 0 ? diffDescriptions : [`World state unchanged`],
  });

  // === COLLECTOR: Second pass - build Chronicler context ===
  const chroniclerContext = buildChroniclerContext(collected, applyResult);

  // === CHRONICLER ===
  const chroniclerStart = Date.now();
  const prompt = buildTurnPrompt(
    character,
    world,
    recentTurns,
    playerAction,
    {
      skill: mechanics.skill,
      rolled: mechanics.rolled!,
      modifier: mechanics.modifier || 0,
      total: mechanics.total!,
      dc: mechanics.dc,
      outcome: mechanics.outcome!,
    },
    approvedEvents as unknown as ValidatedEvent[],
    chroniclerContext.npcsPresent.map(npc => ({
      name: npc.name,
      role: npc.role,
      personality: npc.personality,
      dialogueHints: npc.dialogueHints,
      relationship: 0, // TODO: fetch actual relationship
    })),
    chroniclerContext.codexSnippets,
    chroniclerContext.consequences,
    chroniclerContext.npcVoices,
    chroniclerContext.atmosphere
  );

  const geminiResponse = await generateTurn(prompt);
  traces.push({
    agent: "chronicler",
    status: "success",
    durationMs: Date.now() - chroniclerStart,
    description: `Generated ${geminiResponse.narration.length} character narration`,
    details: [
      `Called Gemini API for narrative generation`,
      `Output: ${geminiResponse.narration.slice(0, 60)}...`,
      `Suggested ${geminiResponse.suggested_actions.length} follow-up action(s)`,
    ],
  });

  // Safety filter on output
  const outputFilter = filterOutput(geminiResponse.narration);
  const finalNarration = outputFilter.status === "block" ? FALLBACK_NARRATION : geminiResponse.narration;

  // Use apply result (already computed above)
  const { characterUpdates, worldUpdates, diffs, questChanges, relationshipChanges } =
    outputFilter.status === "block"
      ? { characterUpdates: {}, worldUpdates: {}, diffs: [] as TurnDiff[], questChanges: [], relationshipChanges: [] }
      : applyResult;

  // Clean mechanics for storage (remove pendingProposals)
  const cleanMechanics: Turn["mechanics"] = {
    type: mechanics.type,
    skill: mechanics.skill,
    dc: mechanics.dc,
    modifier: mechanics.modifier,
    rolled: mechanics.rolled,
    total: mechanics.total,
    outcome: mechanics.outcome,
  };

  // Update turn with results
  const { error: updateError } = await supabase
    .from("waypoint_turns")
    .update({
      narration: finalNarration,
      diffs,
      suggested_actions: outputFilter.status === "block" ? ["Look around", "Wait"] : geminiResponse.suggested_actions,
      mechanics: cleanMechanics,
    })
    .eq("id", turnId);

  if (updateError) {
    return NextResponse.json({ error: "Failed to update turn" }, { status: 500 });
  }

  // Update state
  let enrichedWorldUpdates = worldUpdates;
  if (outputFilter.status === "allow") {
    await updateCharacterState(supabase, character.id!, characterUpdates);
    enrichedWorldUpdates = await updateWorldState(supabase, character.id!, worldUpdates);
    await updateQuestState(supabase, character.id!, questChanges);
    await updateRelationshipState(supabase, character.id!, relationshipChanges);
  }

  const response: TurnResponse = {
    turn: {
      id: turnId,
      narration: finalNarration,
      diffs,
      suggestedActions: outputFilter.status === "block" ? ["Look around", "Wait"] : geminiResponse.suggested_actions,
      mechanics: cleanMechanics,
      trace: traces,
    },
  };

  if (Object.keys(characterUpdates).length > 0) response.updatedCharacter = characterUpdates;
  if (Object.keys(enrichedWorldUpdates).length > 0) response.updatedWorld = enrichedWorldUpdates;

  return NextResponse.json(response);
}

/**
 * Complete the turn pipeline (Arbiter + Lorekeeper parallel → Apply → Chronicler)
 * Includes retry loop: if Arbiter rejects proposals, re-run Orchestrator (max 2 retries)
 */
async function completeTurnPipeline(
  supabase: ReturnType<typeof createAdminClient>,
  characterId: string,
  playerAction: string,
  character: Character,
  world: WorldContext,
  recentTurns: Turn[],
  proposals: ProposalResult[],
  rollOutcome?: { skill: string; success: boolean; total: number; dc: number },
  retryCount: number = 0,
  questContext?: QuestContext,
  knownNpcNames: Set<string> = new Set(),
  existingTraces: AgentTrace[] = []
) {
  const MAX_RETRIES = 2;
  const traces: AgentTrace[] = [...existingTraces];

  // === PARALLEL: ARBITER + LOREKEEPER ===
  const parallelStart = Date.now();
  const activeQuestIds = questContext?.activeQuests.map(q => q.id) || [];
  const availableQuestIds = questContext?.npcQuests.map(q => q.id) || [];
  const availableQuestTitles = questContext?.npcQuests.map(q => q.title) || [];
  const [arbiterResult, lorekeeperResult] = await Promise.all([
    runArbiter(proposals, {
      character,
      world,
      playerAction,
      rollOutcome,
      activeQuestIds,
      availableQuestIds,
      availableQuestTitles,
    }),
    runLorekeeper(playerAction, world, characterId),
  ]);
  const parallelDuration = Date.now() - parallelStart;

  // Add arbiter trace
  traces.push({
    agent: "arbiter",
    status: arbiterResult.rejected.length > 0 ? "error" : "success",
    durationMs: parallelDuration,
    description: arbiterResult.rejected.length > 0
      ? `Rejected ${arbiterResult.rejected.length} proposal(s), approved ${arbiterResult.approved.length}`
      : `Validated all ${arbiterResult.approved.length} proposal(s)`,
    details: [
      ...arbiterResult.approved.map(p => `✓ ${formatProposalForTrace(p)}`),
      ...arbiterResult.rejected.map(r => `✗ ${formatProposalForTrace(r.proposal)} - ${r.reason}`),
    ],
  });

  // Add lorekeeper trace
  const npcNames = lorekeeperResult.npcsPresent?.map(n => n.name) || [];
  traces.push({
    agent: "lorekeeper",
    status: "success",
    durationMs: parallelDuration,
    description: `Fetched context for ${world.poi}`,
    details: [
      npcNames.length > 0 ? `NPCs present: ${npcNames.join(", ")}` : `No NPCs at this location`,
      lorekeeperResult.codexSnippets?.length ? `Found ${lorekeeperResult.codexSnippets.length} codex entries` : `No relevant lore`,
      lorekeeperResult.atmosphere ? `Atmosphere: ${lorekeeperResult.atmosphere.mood || 'neutral'}` : null,
    ].filter(Boolean) as string[],
  });

  // === RETRY LOOP: If any rejections, re-run Orchestrator with context ===
  if (arbiterResult.rejected.length > 0 && retryCount < MAX_RETRIES) {
    const rejectionContext = arbiterResult.rejected
      .map(r => `Rejected: ${r.proposal.type} - ${r.reason}`)
      .join("; ");

    // Re-run Orchestrator with rejection context
    const retryResult = await runOrchestrator(
      playerAction,
      character,
      world,
      recentTurns,
      rollOutcome,
      `Previous proposals rejected: ${rejectionContext}. Please adjust.`,
      questContext
    );

    // Recursive call with incremented retry count
    return completeTurnPipeline(
      supabase,
      characterId,
      playerAction,
      character,
      world,
      recentTurns,
      retryResult.proposals,
      rollOutcome,
      retryCount + 1,
      questContext,
      knownNpcNames,
      traces
    );
  }

  // === COLLECTOR: First pass - merge parallel outputs ===
  const collectorStart = Date.now();
  const collected = collectParallelOutputs(arbiterResult, lorekeeperResult);
  traces.push({
    agent: "collector",
    status: "success",
    durationMs: Date.now() - collectorStart,
    description: `Merged arbiter and lorekeeper outputs`,
    details: [
      `${collected.arbiter.approved.length} approved events ready`,
      collected.lore.npcsPresent?.length ? `${collected.lore.npcsPresent.length} NPC(s) in context` : `No NPCs in context`,
    ],
  });

  // Convert approved proposals to events for applyEvents
  const approvedEvents = proposalsToEvents(collected.arbiter.approved);

  // === APPLY STATE ===
  const applyStart = Date.now();
  const applyResult = applyEvents(character, world, approvedEvents as unknown as ValidatedEvent[], knownNpcNames);
  const diffDescriptions = applyResult.diffs.map(d => {
    if (d.value !== undefined) {
      return `${d.type}: ${d.text} (${d.value})`;
    }
    return `${d.type}: ${d.text}`;
  });
  traces.push({
    agent: "apply_state",
    status: "success",
    durationMs: Date.now() - applyStart,
    description: applyResult.diffs.length > 0
      ? `Applied ${applyResult.diffs.length} state change(s)`
      : `No state changes to apply`,
    details: diffDescriptions.length > 0 ? diffDescriptions : [`World state unchanged`],
  });

  // === COLLECTOR: Second pass - build Chronicler context ===
  const chroniclerContext = buildChroniclerContext(collected, applyResult);

  // === CHRONICLER ===
  const chroniclerStart = Date.now();
  const prompt = buildTurnPrompt(
    character,
    world,
    recentTurns,
    playerAction,
    rollOutcome ? {
      skill: rollOutcome.skill,
      rolled: 0, // Not available in this path
      modifier: 0,
      total: rollOutcome.total,
      dc: rollOutcome.dc,
      outcome: rollOutcome.success ? "success" : "failure",
    } : undefined,
    approvedEvents as unknown as ValidatedEvent[],
    chroniclerContext.npcsPresent.map(npc => ({
      name: npc.name,
      role: npc.role,
      personality: npc.personality,
      dialogueHints: npc.dialogueHints,
      relationship: 0, // TODO: fetch actual relationship
    })),
    chroniclerContext.codexSnippets,
    chroniclerContext.consequences,
    chroniclerContext.npcVoices,
    chroniclerContext.atmosphere
  );

  const geminiResponse = await generateTurn(prompt);
  traces.push({
    agent: "chronicler",
    status: "success",
    durationMs: Date.now() - chroniclerStart,
    description: `Generated ${geminiResponse.narration.length} character narration`,
    details: [
      `Called Gemini API for narrative generation`,
      `Output: ${geminiResponse.narration.slice(0, 60)}...`,
      `Suggested ${geminiResponse.suggested_actions.length} follow-up action(s)`,
    ],
  });

  // Safety filter on output
  const outputFilter = filterOutput(geminiResponse.narration);
  const finalNarration = outputFilter.status === "block" ? FALLBACK_NARRATION : geminiResponse.narration;

  // Use apply result (already computed above)
  const { characterUpdates, worldUpdates, diffs, questChanges, relationshipChanges } =
    outputFilter.status === "block"
      ? { characterUpdates: {}, worldUpdates: {}, diffs: [] as TurnDiff[], questChanges: [], relationshipChanges: [] }
      : applyResult;

  // Insert turn (traces only in response, not persisted)
  const { data: turnRow, error: turnInsertError } = await supabase
    .from("waypoint_turns")
    .insert({
      character_id: characterId,
      player_action: playerAction,
      narration: finalNarration,
      diffs,
      suggested_actions: outputFilter.status === "block" ? ["Look around", "Wait"] : geminiResponse.suggested_actions,
      mechanics: null,
    })
    .select()
    .single();

  if (turnInsertError) {
    return NextResponse.json({ error: "Failed to save turn" }, { status: 500 });
  }

  // Update state
  let enrichedWorldUpdates = worldUpdates;
  if (outputFilter.status === "allow") {
    await updateCharacterState(supabase, characterId, characterUpdates);
    enrichedWorldUpdates = await updateWorldState(supabase, characterId, worldUpdates);
    await updateQuestState(supabase, characterId, questChanges);
    await updateRelationshipState(supabase, characterId, relationshipChanges);
  }

  const response: TurnResponse = {
    turn: {
      id: turnRow.id,
      narration: finalNarration,
      diffs,
      suggestedActions: outputFilter.status === "block" ? ["Look around", "Wait"] : geminiResponse.suggested_actions,
      trace: traces,
    },
  };

  if (Object.keys(characterUpdates).length > 0) response.updatedCharacter = characterUpdates;
  if (Object.keys(enrichedWorldUpdates).length > 0) response.updatedWorld = enrichedWorldUpdates;

  return NextResponse.json(response);
}

async function updateCharacterState(
  supabase: ReturnType<typeof createAdminClient>,
  characterId: string,
  updates: Partial<Character>
) {
  if (Object.keys(updates).length === 0) return;

  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.hp !== undefined) dbUpdates.hp = updates.hp;
  if (updates.maxHp !== undefined) dbUpdates.max_hp = updates.maxHp;
  if (updates.gold !== undefined) dbUpdates.gold = updates.gold;
  if (updates.inventory !== undefined) dbUpdates.inventory = updates.inventory;
  if (updates.equipment !== undefined) dbUpdates.equipment = updates.equipment;
  if (updates.conditions !== undefined) dbUpdates.conditions = updates.conditions;
  if (updates.skills !== undefined) dbUpdates.skills = updates.skills;

  await supabase.from("waypoint_characters").update(dbUpdates).eq("id", characterId);
}

async function updateWorldState(
  supabase: ReturnType<typeof createAdminClient>,
  characterId: string,
  updates: Partial<WorldContext>
): Promise<Partial<WorldContext>> {
  if (Object.keys(updates).length === 0) return updates;

  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.region !== undefined) dbUpdates.region = updates.region;
  if (updates.poi !== undefined) dbUpdates.poi = updates.poi;
  if (updates.weather !== undefined) dbUpdates.weather = updates.weather;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.time !== undefined) {
    if (updates.time.day !== undefined) dbUpdates.time_day = updates.time.day;
    if (updates.time.phase !== undefined) dbUpdates.time_phase = updates.time.phase;
  }
  if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
  if (updates.nearbyPoi !== undefined) dbUpdates.nearby_poi = updates.nearbyPoi;
  if (updates.entities !== undefined) dbUpdates.entities = updates.entities;
  if (updates.memory !== undefined) dbUpdates.memories = updates.memory;

  // If location changed and entities weren't explicitly set, sync with NPCs at that location
  if (updates.poi && updates.entities === undefined) {
    const { data: npcsAtLocation } = await supabase
      .from("waypoint_npcs")
      .select("name")
      .eq("location", updates.poi);
    
    const npcNames = (npcsAtLocation || []).map(n => n.name);
    dbUpdates.entities = npcNames;
    updates.entities = npcNames;
  }

  await supabase.from("waypoint_world_state").update(dbUpdates).eq("character_id", characterId);

  // If location changed, fetch the new location's imageUrl
  if (updates.poi) {
    const { data: locationData } = await supabase
      .from("waypoint_locations")
      .select("art_url")
      .eq("name", updates.poi)
      .maybeSingle();

    if (locationData?.art_url) {
      return { ...updates, imageUrl: locationData.art_url };
    }
  }

  return updates;
}

async function updateQuestState(
  supabase: ReturnType<typeof createAdminClient>,
  characterId: string,
  questChanges: Array<{ type: "start" | "progress"; questId: string; questTitle?: string; progress?: number; reason: string }>
) {
  if (questChanges.length === 0) return;

  for (const change of questChanges) {
    if (change.type === "start") {
      const { data: quest } = await supabase
        .from("waypoint_quests")
        .select("id")
        .ilike("title", change.questTitle || change.questId)
        .maybeSingle();

      if (quest) {
        const { data: existing } = await supabase
          .from("waypoint_character_quests")
          .select("id")
          .eq("character_id", characterId)
          .eq("quest_id", quest.id)
          .maybeSingle();

        if (!existing) {
          await supabase.from("waypoint_character_quests").insert({
            character_id: characterId,
            quest_id: quest.id,
            status: "active",
            progress: 0,
          });
        }
      }
    } else if (change.type === "progress") {
      const { data: quest } = await supabase
        .from("waypoint_quests")
        .select("id, total_progress")
        .ilike("title", change.questId)
        .maybeSingle();

      if (quest) {
        const newProgress = change.progress ?? 0;
        const isComplete = newProgress >= quest.total_progress;

        await supabase
          .from("waypoint_character_quests")
          .update({ progress: newProgress, status: isComplete ? "completed" : "active" })
          .eq("character_id", characterId)
          .eq("quest_id", quest.id);
      }
    }
  }
}

async function updateRelationshipState(
  supabase: ReturnType<typeof createAdminClient>,
  characterId: string,
  relationshipChanges: Array<{ npc: string; delta: number; reason: string }>
) {
  if (relationshipChanges.length === 0) return;

  for (const change of relationshipChanges) {
    const { data: npc } = await supabase
      .from("waypoint_npcs")
      .select("id")
      .ilike("name", change.npc)
      .maybeSingle();

    if (npc) {
      const { data: existing } = await supabase
        .from("waypoint_character_npcs")
        .select("id, relationship")
        .eq("character_id", characterId)
        .eq("npc_id", npc.id)
        .maybeSingle();

      if (existing) {
        const newRelationship = Math.max(-25, Math.min(25, existing.relationship + change.delta));
        await supabase.from("waypoint_character_npcs").update({ relationship: newRelationship }).eq("id", existing.id);
      } else {
        const newRelationship = Math.max(-25, Math.min(25, change.delta));
        await supabase.from("waypoint_character_npcs").insert({
          character_id: characterId,
          npc_id: npc.id,
          relationship: newRelationship,
        });
      }
    }
  }
}
