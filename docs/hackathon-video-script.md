# Waypoint Demo Video Script

**Duration**: 2:50 (under 3-minute limit)
**Format**: Screen recording + voiceover + architecture visuals

---

## SCENE 1: Hook (0:00 - 0:20)

**[VISUAL]**: Game UI in action. Player types "I try to sneak past the guards". Streaming narration appears. Dice roll animation. UI panels update.

**[VOICEOVER]**:
> "What if an AI could actually be a Dungeon Master — not just a chatbot pretending to be one?"
>
> "This is Waypoint. An AI-powered RPG where Gemini 3 runs the entire game."

**[VISUAL]**: Quick cuts showing: relationship panel updating, inventory changing, skill check succeeding.

---

## SCENE 2: The Problem (0:20 - 0:45)

**[VISUAL]**: Split screen comparison. Left: generic AI chat losing context. Right: Waypoint maintaining state.

**[VOICEOVER]**:
> "Most AI RPGs have a problem. They forget what happened five turns ago. They hallucinate items you don't have. Dice rolls happen inside the LLM — completely non-deterministic."
>
> "We built Waypoint to fix this."

**[VISUAL]**: Show a competitor-style chat where the AI contradicts itself vs Waypoint's consistent panels.

---

## SCENE 3: The Solution — Architecture Overview (0:45 - 1:20)

**[VISUAL - Hub-and-Spoke Overview]**: Architecture diagram fading in. Hub-and-spoke layout with functional names: Intent Detection, Canon Retrieval, Validation, Narration, Quest Context around central Orchestrator.

**[VOICEOVER]**:
> "Waypoint uses a hub-and-spoke agent architecture. Six specialized Gemini 3 agents, each with a specific job."
>
> "The Orchestrator is the central hub. It detects player intent and proposes game events using Gemini 3's tool calling."

**[VISUAL - Tool Calling Flow]**: Highlight Orchestrator node. Show tool call examples appearing: `propose_stat_change`, `propose_relationship_change`.

**[VOICEOVER]**:
> "The Lorekeeper retrieves world knowledge. The Arbiter validates everything. And the Chronicler generates the narrative — streaming it in real-time."

**[VISUAL - Data Flow Arrows]**: Arrows animate showing data flow through the pipeline.

---

## SCENE 4: Under the Hood — Trace View (1:20 - 2:00)

**[VISUAL - Screen Recording]**: Game UI with TRACE PANEL open. Show a turn being processed.

**[VOICEOVER]**:
> "Let's look under the hood. Here's what happens when you take an action."

**[VISUAL]**: Trace panel showing: SENTINEL → RUNE_MARSHAL → ORCHESTRATOR → ARBITER → CHRONICLER

**[VOICEOVER]**:
> "First: Tool calling. Watch the Orchestrator output structured proposals — `propose_relationship_change`, `propose_inventory_add`. No free-form text. No hallucinations."

**[VISUAL]**: Highlight the ORCHESTRATOR trace showing proposal tool calls.

**[VOICEOVER]**:
> "The Arbiter validates everything. See that rejection? The player tried to claim an item they don't have. Blocked."

**[VISUAL]**: Highlight ARBITER trace showing a rejection.

**[VOICEOVER]**:
> "Then the Chronicler streams the narration in real-time. All of this in under three seconds."

**[VISUAL]**: Show timing in trace (total ~2-3 seconds).

---

## SCENE 5: Live Demo — Player Experience (2:00 - 2:30)

**[VISUAL]**: Full game UI. Trace panel CLOSED. Clean player view.

**[VOICEOVER]**:
> "But players don't see any of that. They just see this."

**[ACTION]**: Type: "I ask the merchant about the missing shipment"

**[VISUAL]**: Narration streams in. Relationship panel updates. Smooth experience.

**[VOICEOVER]**:
> "Natural conversation. Real state changes. Narrative that remembers everything — because we use Gemini's full one-million token context window. We never summarize. We never forget."

**[VISUAL]**: Scroll up through turn history showing consistent narrative.

---

## SCENE 6: The Principle + Closing (2:30 - 2:50)

**[VISUAL - LLM + Code Hybrid Split]**: Split graphic: "LLM Proposes" (left) | "Code Validates" (right)

**[VOICEOVER]**:
> "Our core principle: LLM proposes, code disposes."
>
> "Gemini 3 handles creativity. Deterministic code handles mechanics. The result? An AI that's creative AND consistent."

**[VISUAL]**: Waypoint logo + "Built with Gemini 3"

**[VOICEOVER]**:
> "Waypoint. A persistent world where your choices matter — powered by Gemini 3."

**[VISUAL]**: URL to demo / GitHub

---

## Production Notes

### Screen Recording
- Use OBS or Loom
- 1920x1080 resolution
- 60fps for smooth streaming animation

### Visuals Needed
| Scene | Visual Name | Type |
|-------|-------------|------|
| 3 | Hub-and-Spoke Overview | Generated image |
| 3 | Tool Calling Flow | Generated image |
| 3 | Data Flow Arrows | Same as Tool Calling Flow (animate in editor) |
| 4 | Trace View | Screen recording |
| 5 | Live Demo | Screen recording |
| 6 | LLM + Code Hybrid Split | Generated image |

### Audio
- Record voiceover separately (better quality)
- Background music: subtle, non-distracting
- Normalize audio levels

### Timing Checkpoints
| Timestamp | Scene | Duration |
|-----------|-------|----------|
| 0:00 | Hook | 20s |
| 0:20 | Problem | 25s |
| 0:45 | Architecture | 35s |
| 1:20 | Under the Hood (Trace) | 40s |
| 2:00 | Live Demo | 30s |
| 2:30 | Principle + Closing | 20s |
| **Total** | | **2:50** |

### Key Phrases to Emphasize
- "LLM proposes, code disposes"
- "Never summarize, never forget"
- "Tool calling, not free-form text"
- "Creative AND consistent"
