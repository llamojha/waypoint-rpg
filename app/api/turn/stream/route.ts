import { createClient } from "@supabase/supabase-js";
import { dbToCharacter, dbToWorld } from "@/lib/supabase/transforms";
import { buildTurnPrompt, RollOutcome } from "@/lib/gemini/prompts";
import { generateTurnStream, StreamMetadata } from "@/lib/gemini/stream";
import { validateEvents } from "@/lib/turn/validate";
import { applyEvents } from "@/lib/turn/apply";
import { detectIntent } from "@/lib/mechanics/detect";
import { calculateTotalModifier } from "@/lib/mechanics/modifiers";
import { resolveCheck } from "@/lib/mechanics/checks";
import { filterInput, filterOutput, FALLBACK_NARRATION } from "@/lib/safety/sentinel";
import type { Turn, TurnDiff, Character, WorldContext } from "@/types";

export const runtime = "edge";

/**
 * Create Supabase client for Edge runtime
 */
function createEdgeClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_KEY!;
  return createClient(url, key);
}

interface TurnRequest {
  characterId: string;
  playerAction: string;
  roll?: boolean;
  turnId?: string;
}

/**
 * POST /api/turn/stream
 * Streaming turn endpoint using SSE
 */
export async function POST(request: Request) {
  const encoder = new TextEncoder();

  try {
    const body = (await request.json()) as TurnRequest;
    const { characterId, playerAction, roll, turnId } = body;

    if (!characterId) {
      return new Response(JSON.stringify({ error: "characterId required" }), {
        status: 400,
      });
    }

    const supabase = createEdgeClient();

    // Load character
    const { data: charRow, error: charErr } = await supabase
      .from("waypoint_characters")
      .select("*")
      .eq("id", characterId)
      .single();

    if (charErr || !charRow) {
      return new Response(JSON.stringify({ error: "Character not found" }), {
        status: 404,
      });
    }

    const character = dbToCharacter(charRow);

    // Load world
    const { data: worldRow, error: worldErr } = await supabase
      .from("waypoint_world_state")
      .select("*")
      .eq("character_id", characterId)
      .single();

    if (worldErr || !worldRow) {
      return new Response(JSON.stringify({ error: "World not found" }), {
        status: 404,
      });
    }

    const world = dbToWorld(worldRow);

    // Load recent turns
    const { data: turnRows } = await supabase
      .from("waypoint_turns")
      .select("*")
      .eq("character_id", characterId)
      .order("created_at", { ascending: false })
      .limit(3);

    const recentTurns = (turnRows || [])
      .map((r) => ({
        id: r.id,
        timestamp: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
        playerAction: r.player_action,
        narration: r.narration || "",
        isStreaming: false,
        mechanics: r.mechanics as Turn["mechanics"],
        suggestedActions: (r.suggested_actions as string[]) || [],
        diffs: (r.diffs as TurnDiff[]) || [],
      }))
      .reverse();

    // Handle roll resolution
    if (roll && turnId) {
      return handleRollStream(
        supabase,
        turnId,
        character,
        world,
        recentTurns,
        encoder
      );
    }

    // New turn - check if roll needed
    if (!playerAction) {
      return new Response(JSON.stringify({ error: "playerAction required" }), {
        status: 400,
      });
    }

    // Safety filter on input
    const inputFilter = filterInput(playerAction);
    if (inputFilter.status === "block") {
      return new Response(
        JSON.stringify({ error: inputFilter.output }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const intent = await detectIntent(playerAction, character, world);

    // If roll required, return pending (non-streaming)
    if (intent.requires_roll && intent.dc) {
      const skillLevel = character.skills[intent.primary_skill]?.level || 0;
      const modifier = calculateTotalModifier(skillLevel, intent.bonus);

      const mechanics: Turn["mechanics"] = {
        type: "check",
        skill: intent.primary_skill,
        dc: intent.dc,
        modifier,
      };

      const { data: turnRow, error: insertErr } = await supabase
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

      if (insertErr) {
        return new Response(JSON.stringify({ error: "Failed to save turn" }), {
          status: 500,
        });
      }

      return new Response(
        JSON.stringify({
          turn: {
            id: turnRow.id,
            narration: "",
            diffs: [],
            suggestedActions: [],
            mechanics,
          },
          pendingRoll: true,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // No roll - stream narration
    const prompt = buildTurnPrompt(character, world, recentTurns, playerAction);

    const stream = new ReadableStream({
      async start(controller) {
        let fullNarration = "";
        let metadata: StreamMetadata = {
          proposed_events: [],
          suggested_actions: [],
        };

        try {
          const generator = generateTurnStream(prompt);

          while (true) {
            const result = await generator.next();
            if (result.done) {
              metadata = result.value;
              break;
            }
            fullNarration += result.value;
            controller.enqueue(
              encoder.encode(
                `event: chunk\ndata: ${JSON.stringify({ text: result.value })}\n\n`
              )
            );
          }

          // Validate and apply events
          const validatedEvents = validateEvents(
            metadata.proposed_events,
            character
          );
          const { characterUpdates, worldUpdates, diffs } = applyEvents(
            character,
            world,
            validatedEvents
          );

          // Safety filter on output
          const outputFilter = filterOutput(fullNarration);
          const finalNarration = outputFilter.status === "block" 
            ? FALLBACK_NARRATION 
            : fullNarration;

          // Save turn
          const { data: turnRow } = await supabase
            .from("waypoint_turns")
            .insert({
              character_id: characterId,
              player_action: playerAction,
              narration: finalNarration,
              diffs: outputFilter.status === "block" ? [] : diffs,
              suggested_actions: outputFilter.status === "block" 
                ? ["Look around", "Wait"] 
                : metadata.suggested_actions,
              mechanics: null,
            })
            .select()
            .single();

          // Update character state
          if (Object.keys(characterUpdates).length > 0) {
            await supabase
              .from("waypoint_characters")
              .update({
                ...transformCharacterUpdates(characterUpdates),
                updated_at: new Date().toISOString(),
              })
              .eq("id", characterId);
          }

          // Update world state
          if (Object.keys(worldUpdates).length > 0) {
            await supabase
              .from("waypoint_world_state")
              .update({
                ...transformWorldUpdates(worldUpdates),
                updated_at: new Date().toISOString(),
              })
              .eq("character_id", characterId);
          }

          // Send complete event
          controller.enqueue(
            encoder.encode(
              `event: complete\ndata: ${JSON.stringify({
                turnId: turnRow?.id,
                diffs: outputFilter.status === "block" ? [] : diffs,
                suggestedActions: outputFilter.status === "block" 
                  ? ["Look around", "Wait"] 
                  : metadata.suggested_actions,
                updatedCharacter:
                  outputFilter.status === "allow" && Object.keys(characterUpdates).length > 0
                    ? characterUpdates
                    : undefined,
                updatedWorld:
                  outputFilter.status === "allow" && Object.keys(worldUpdates).length > 0
                    ? worldUpdates
                    : undefined,
                filtered: outputFilter.status === "block" ? true : undefined,
                filteredNarration: outputFilter.status === "block" ? finalNarration : undefined,
              })}\n\n`
            )
          );
        } catch (error) {
          console.error("Stream error:", error);
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ error: "Generation failed" })}\n\n`
            )
          );
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Turn stream error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
    });
  }
}

/**
 * Handle roll resolution with streaming
 */
async function handleRollStream(
  supabase: ReturnType<typeof createEdgeClient>,
  turnId: string,
  character: Character,
  world: WorldContext,
  recentTurns: Turn[],
  encoder: TextEncoder
) {
  const { data: turnRow, error: turnErr } = await supabase
    .from("waypoint_turns")
    .select("*")
    .eq("id", turnId)
    .single();

  if (turnErr || !turnRow) {
    return new Response(JSON.stringify({ error: "Turn not found" }), {
      status: 404,
    });
  }

  const mechanics = turnRow.mechanics as Turn["mechanics"];
  if (!mechanics || mechanics.outcome) {
    return new Response(JSON.stringify({ error: "Already resolved" }), {
      status: 400,
    });
  }

  const checkResult = resolveCheck(mechanics.dc, mechanics.modifier || 0);

  const updatedMechanics: Turn["mechanics"] = {
    ...mechanics,
    rolled: checkResult.rolled,
    outcome: checkResult.outcome,
  };

  const rollOutcome: RollOutcome = {
    skill: mechanics.skill,
    rolled: checkResult.rolled,
    modifier: mechanics.modifier || 0,
    total: checkResult.total,
    dc: mechanics.dc,
    outcome: checkResult.outcome,
  };

  const prompt = buildTurnPrompt(
    character,
    world,
    recentTurns,
    turnRow.player_action,
    rollOutcome
  );

  const stream = new ReadableStream({
    async start(controller) {
      let fullNarration = "";
      let metadata: StreamMetadata = {
        proposed_events: [],
        suggested_actions: [],
      };

      try {
        const generator = generateTurnStream(prompt);

        while (true) {
          const result = await generator.next();
          if (result.done) {
            metadata = result.value;
            break;
          }
          fullNarration += result.value;
          controller.enqueue(
            encoder.encode(
              `event: chunk\ndata: ${JSON.stringify({ text: result.value })}\n\n`
            )
          );
        }

        const validatedEvents = validateEvents(
          metadata.proposed_events,
          character
        );
        const { characterUpdates, worldUpdates, diffs } = applyEvents(
          character,
          world,
          validatedEvents
        );

        // Safety filter on output
        const outputFilter = filterOutput(fullNarration);
        const finalNarration = outputFilter.status === "block" 
          ? FALLBACK_NARRATION 
          : fullNarration;

        // Update turn
        await supabase
          .from("waypoint_turns")
          .update({
            narration: finalNarration,
            diffs: outputFilter.status === "block" ? [] : diffs,
            suggested_actions: outputFilter.status === "block" 
              ? ["Look around", "Wait"] 
              : metadata.suggested_actions,
            mechanics: updatedMechanics,
          })
          .eq("id", turnId);

        // Update character (only if not filtered)
        if (outputFilter.status === "allow" && Object.keys(characterUpdates).length > 0) {
          await supabase
            .from("waypoint_characters")
            .update({
              ...transformCharacterUpdates(characterUpdates),
              updated_at: new Date().toISOString(),
            })
            .eq("id", character.id);
        }

        // Update world (only if not filtered)
        if (outputFilter.status === "allow" && Object.keys(worldUpdates).length > 0) {
          await supabase
            .from("waypoint_world_state")
            .update({
              ...transformWorldUpdates(worldUpdates),
              updated_at: new Date().toISOString(),
            })
            .eq("character_id", character.id);
        }

        controller.enqueue(
          encoder.encode(
            `event: complete\ndata: ${JSON.stringify({
              turnId,
              diffs: outputFilter.status === "block" ? [] : diffs,
              suggestedActions: outputFilter.status === "block" 
                ? ["Look around", "Wait"] 
                : metadata.suggested_actions,
              mechanics: updatedMechanics,
              updatedCharacter:
                outputFilter.status === "allow" && Object.keys(characterUpdates).length > 0
                  ? characterUpdates
                  : undefined,
              updatedWorld:
                outputFilter.status === "allow" && Object.keys(worldUpdates).length > 0 
                  ? worldUpdates 
                  : undefined,
              filtered: outputFilter.status === "block" ? true : undefined,
              filteredNarration: outputFilter.status === "block" ? finalNarration : undefined,
            })}\n\n`
          )
        );
      } catch (error) {
        console.error("Roll stream error:", error);
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ error: "Generation failed" })}\n\n`
          )
        );
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

/**
 * Transform character updates to DB format
 */
function transformCharacterUpdates(
  updates: Partial<Character>
): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if (updates.hp !== undefined) db.hp = updates.hp;
  if (updates.maxHp !== undefined) db.max_hp = updates.maxHp;
  if (updates.gold !== undefined) db.gold = updates.gold;
  if (updates.inventory !== undefined) db.inventory = updates.inventory;
  if (updates.equipment !== undefined) db.equipment = updates.equipment;
  if (updates.conditions !== undefined) db.conditions = updates.conditions;
  if (updates.skills !== undefined) db.skills = updates.skills;
  return db;
}

/**
 * Transform world updates to DB format
 */
function transformWorldUpdates(
  updates: Partial<WorldContext>
): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if (updates.region !== undefined) db.region = updates.region;
  if (updates.poi !== undefined) db.poi = updates.poi;
  if (updates.weather !== undefined) db.weather = updates.weather;
  if (updates.description !== undefined) db.description = updates.description;
  if (updates.time?.day !== undefined) db.time_day = updates.time.day;
  if (updates.time?.phase !== undefined) db.time_phase = updates.time.phase;
  if (updates.tags !== undefined) db.tags = updates.tags;
  if (updates.nearbyPoi !== undefined) db.nearby_poi = updates.nearbyPoi;
  if (updates.entities !== undefined) db.entities = updates.entities;
  if (updates.memory !== undefined) db.memories = updates.memory;
  return db;
}
