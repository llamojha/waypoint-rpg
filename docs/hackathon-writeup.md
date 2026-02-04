# Waypoint RPG — When AI Becomes the Dungeon Master

**A tabletop RPG where Gemini 3 doesn't just assist the story — it IS the story.**

---

## Gemini 3 Integration

> *Required: Brief write-up detailing which Gemini 3 features were used and how they are central to the application.*

Waypoint is built entirely around Gemini 3's capabilities. **Without Gemini 3, this application cannot exist.**

### Gemini 3 Features Used

| Feature | How It's Central to Waypoint |
|---------|------------------------------|
| **Tool Calling (Function Declarations)** | 15+ schema-enforced functions power our multi-agent architecture. Agents output structured proposals (`propose_stat_change`, `propose_relationship_change`, `detect_intent`) eliminating JSON parsing failures entirely. |
| **1M Token Context Window** | We retain **complete conversation history** — every turn, every NPC interaction, every quest. This enables narrative callbacks and story coherence that competitors cannot match. |
| **Temperature Control** | Mechanical agents (Orchestrator, Rune Marshal) use **0.1** for deterministic decisions. Creative agents (Chronicler) use **0.8** for vivid narration. Same model, different behaviors. |
| **Streaming (SSE)** | The Chronicler streams narration chunks in real-time, making storytelling feel responsive and alive. |
| **Multi-Turn Conversations** | Each agent maintains context across the pipeline, enabling complex reasoning chains across 6 specialized agents. |

### Why Gemini 3 Is Essential

Waypoint uses a **hub-and-spoke multi-agent architecture** where 6 specialized Gemini 3 agents collaborate:

```
Player Input → Content Sentinel → Rune Marshal → Orchestrator
                                                      │
                                              ┌───────┴───────┐
                                              ▼               ▼
                                          Arbiter       Lorekeeper
                                              │               │
                                              └───────┬───────┘
                                                      ▼
                                              Apply State (DB)
                                                      │
                                                      ▼
                                                Chronicler → UI
```

**This architecture is only possible because of Gemini 3's tool calling reliability and massive context window.** Previous models couldn't maintain coherent state across 6 agents or handle 15+ function declarations without hallucinating.

---

## Inspiration

I've been a tabletop RPG player for years. The magic of D&D isn't the rules — it's having a Dungeon Master who remembers that you saved the blacksmith's daughter three sessions ago, who weaves that into a surprise ally appearing when you need help most.

Then I tried AI-powered RPG games. They were... disappointing.

**The problem with existing AI RPGs:**
- They forget what happened 5 messages ago
- They hallucinate items you don't have
- Dice rolls happen inside the LLM (non-deterministic!)
- There's no real game state — just text pretending to be a game
- The "DM" contradicts itself constantly

I realized: **these aren't AI Dungeon Masters. They're chatbots wearing a wizard hat.**

When Gemini 3 launched with its 1M token context window and robust tool calling, I saw an opportunity. What if we built an AI RPG that actually worked like a real tabletop game? Where the DM remembers everything, where dice rolls are real, where your inventory actually exists?

**Waypoint is that experiment — and Gemini 3 made it possible.**

---

## What It Does

Waypoint transforms Gemini 3 into a true Dungeon Master for a persistent fantasy world.

### The Player Journey

1. **Create your character** — Name, portrait, starting location
2. **Type any action** — "I search the chest", "I try to sneak past the guards", "I ask the merchant about rumors"
3. **Watch Gemini 3 orchestrate:**
   - **Rune Marshal** (Gemini 3) detects your intent and any "power words" (skill-triggering verbs)
   - **Orchestrator** (Gemini 3) proposes events via tool calling
   - **Arbiter** (code) validates proposals against game rules
   - **Lorekeeper** (Gemini 3) fetches relevant world knowledge
   - Server-side dice roll (d20 + modifiers) — deterministic, not LLM-generated
   - **Chronicler** (Gemini 3) streams vivid narration acknowledging the outcome
4. **See real consequences** — UI panels update with validated state changes (inventory, relationships, quests)

### What Makes It Different

| Competitor Practice | Waypoint + Gemini 3 |
|---------------------|---------------------|
| 5-8 message context limit | **Full 1M token history** — we never forget |
| Free-form LLM output | **Schema-enforced tool calling** — no JSON parsing failures |
| LLM dice rolls | **Server-side deterministic rolls** — fair and verifiable |
| State in narration only | **Validated DB state + UI panels** — single source of truth |
| Single LLM call | **6 specialized Gemini 3 agents** — each optimized for their role |

**The result:** Story coherence and character development that other AI RPGs cannot match.

---

## How We Built It

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WAYPOINT ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Player Input: "I try to sneak past the guards"                             │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────┐                                                        │
│  │Content Sentinel │  ← Pure code: filters unsafe input                     │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │  Rune Marshal   │  ← GEMINI 3: Intent detection (temp 0.1)               │
│  │                 │    Tool: detect_intent()                               │
│  │                 │    Output: { skill: "Sneaking", dc: 14, action_type }  │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │  Orchestrator   │  ← GEMINI 3: Central hub (temp 0.1)                    │
│  │                 │    Tools: get_power_word_tier(), propose_stat_change(),│
│  │                 │           propose_relationship_change(), etc.          │
│  │                 │    Output: Array of structured proposals               │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│      ┌────┴────┐                                                            │
│      ▼         ▼                                                            │
│  ┌────────┐ ┌──────────┐                                                    │
│  │Arbiter │ │Lorekeeper│  ← PARALLEL EXECUTION                              │
│  │ (code) │ │(GEMINI 3)│                                                    │
│  │        │ │          │    Tools: query_codex(), get_npcs_at_location(),   │
│  │Validates│ │          │           get_npc_voice()                         │
│  │proposals│ │Fetches   │                                                   │
│  │against  │ │world lore│                                                   │
│  │rules    │ │& NPC data│                                                   │
│  └────┬───┘ └────┬─────┘                                                    │
│       │          │                                                          │
│       └────┬─────┘                                                          │
│            ▼                                                                 │
│  ┌─────────────────┐                                                        │
│  │  Apply State    │  ← Code: DB writes, dice rolls, modifier calculation   │
│  │                 │    Returns: consequences (NPC died, quest completed)   │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │   Chronicler    │  ← GEMINI 3: Narrative generation (temp 0.8)           │
│  │                 │    Input: validated events, roll outcomes, lore        │
│  │                 │    Output: Streaming narration via SSE                 │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│       UI / Client                                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### The Hybrid Architecture: "LLM Proposes, Code Disposes"

This is the core innovation. **Gemini 3 handles judgment and creativity. Deterministic code handles mechanics.**

**What Gemini 3 decides:**
- What skill check to trigger
- What events to propose (stat changes, inventory updates, relationship shifts)
- How to narrate the outcome
- What NPCs say and how they react

**What code executes:**
- Dice rolls (d20 + modifiers)
- Modifier calculation from skill levels
- Validation rules (relationship caps, item bounds, quest progression)
- State persistence to database

**Why this matters:** The LLM can never directly mutate game state. Every change goes through validation. This eliminates hallucinated items, impossible stat changes, and narrative contradictions.

### Tool Calling in Action

Here's an example of how the Orchestrator uses Gemini 3's tool calling:

```typescript
// Player says: "I try to sneak past the guards"

// Orchestrator calls these tools via Gemini 3:
get_power_word_tier({ word: "sneak", skill: "Sneaking" })
// → Returns: { tier: 1, bonus: 1 }

detect_intent({
  primary_skill: "Sneaking",
  power_words: ["sneak"],
  requires_roll: true,
  dc: 14
})

// If player succeeds the roll:
propose_location_change({
  new_location: "Castle Interior",
  reason: "Successfully snuck past guards"
})

propose_relationship_change({
  npc: "Castle Guard",
  delta: -1,
  reason: "Suspicious of intruder"
})
```

Each proposal is validated by the Arbiter before being applied. The Chronicler then narrates the validated outcome using Gemini 3's streaming capability.

### Tech Stack

| Component | Technology |
|-----------|------------|
| **AI Engine** | Gemini 3 (`gemini-2.5-flash-lite`) via `@google/genai` SDK |
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS |
| **Backend** | Next.js API Routes (Edge + Serverless) |
| **Database** | Supabase (PostgreSQL + Auth + Row Level Security) |
| **Streaming** | Server-Sent Events (SSE) for real-time narration |

---

## Challenges We Ran Into

### 1. Multi-Agent Coordination Without Deadlocks

Running 6 Gemini 3 agents in a pipeline with parallel branches (Arbiter + Lorekeeper) required careful orchestration. We solved this with:
- Clear dependency graphs
- Timeout handling with graceful fallbacks
- Retry loops for transient failures

### 2. Preventing LLM Hallucinations

Early versions had the Chronicler mentioning items the player didn't have. We fixed this by:
- Injecting validated inventory into the Chronicler's context
- Adding explicit constraints: "Only reference items in the provided inventory"
- Post-generation validation that flags inconsistencies

### 3. Tool Calling Schema Design

Getting 15+ tool declarations to work reliably with Gemini 3 required iteration:
- Enum constraints for valid values (skill names, item types)
- Required vs optional parameters
- Clear descriptions that guide the model's usage

### 4. State Synchronization Across Agents

Ensuring all Gemini 3 agents see fresh state after mutations was tricky. We implemented:
- State refresh between pipeline stages
- Collector pattern to merge parallel results
- Explicit context injection rather than stale caches

### 5. Balancing Creativity vs Consistency

The Chronicler needs creative freedom (temperature 0.8) but must respect validated events. We solved this with:
- Structured input: validated events, roll outcomes, scene direction
- Explicit constraints in the prompt
- Post-generation safety filtering

---

## Accomplishments We're Proud Of

### 🎯 True Multi-Agent Orchestration with Gemini 3
Six specialized agents working in concert, each optimized for their role. Not a single monolithic prompt — a real agent architecture powered by Gemini 3's tool calling.

### 🎲 Deterministic Game Mechanics
Server-side dice rolls, validated state changes, real inventory tracking. This is a game, not a chatbot.

### 📚 Full 1M Token Context Utilization
We actually use Gemini 3's massive context window. No summarization, no forgetting. Narrative continuity that competitors cannot match.

### 🔧 15+ Tool Declarations
Schema-enforced structured outputs eliminate JSON parsing failures and ensure consistent agent behavior across all 6 agents.

### ⚡ Real-Time Streaming Narration
SSE streaming from the Chronicler makes the experience feel responsive and alive.

### 🛡️ Hybrid "LLM Proposes, Code Disposes" Architecture
Ensures game state integrity while preserving Gemini 3's creative capabilities.

---

## What We Learned

### Gemini 3's Tool Calling Changes Everything
Schema-enforced outputs are dramatically more reliable than asking the model to produce JSON. This should be the default for any structured AI output.

### The 1M Token Window Is a Competitive Advantage
Most developers treat context as a cost to minimize. We treat it as a feature to maximize. The 1M token window isn't just a number — it's a capability that enables experiences others can't match.

### Multi-Agent Architectures Need Specialization
A single prompt trying to do everything produces mediocre results. Specialized agents with clear responsibilities produce excellence.

### Hybrid Architectures Are the Future
Pure LLM systems hallucinate. Pure code systems lack creativity. The combination — Gemini 3 for judgment, code for execution — produces reliable, creative systems.

### Temperature Matters More Than You Think
0.1 for mechanical decisions, 0.8 for creative narration. This single parameter dramatically affects output quality.

---

## What's Next for Waypoint

### Immediate Roadmap
- **Combat system** with enemy HP tracking and tactical choices
- **Quest log UI** with progress visualization
- **Equipment effects** that modify combat and skill checks
- **Weather and time systems** that affect gameplay

### Future Vision
- **Multiplayer** — Shared world where player actions affect each other
- **Voice input/output** — Speak to your DM, hear the narration
- **Procedural world generation** — Gemini 3-generated locations and NPCs
- **Community content** — Player-created quests and storylines

### The Bigger Picture
Waypoint proves that Gemini 3 can be more than a chatbot. With the right architecture — specialized agents, tool calling, hybrid LLM + code — Gemini 3 can power experiences that feel magical.

We're not just building a game. We're exploring what's possible when AI becomes a true collaborator in creative experiences.

---

## Built With

- **Gemini 3** (`gemini-2.5-flash-lite`) — Multi-agent orchestration, tool calling, streaming
- **@google/genai SDK** — Official Gemini API client
- **Next.js 14** — App Router, React 18, TypeScript
- **Supabase** — PostgreSQL, Auth, Row Level Security
- **Tailwind CSS** — Responsive UI
- **SSE Streaming** — Real-time narration delivery

---

## Try It Out

🎮 **[Play Waypoint](YOUR_DEMO_LINK)** — Live demo

📺 **[Demo Video](YOUR_VIDEO_LINK)** — 3-minute walkthrough

---

*Waypoint isn't an app with AI features — it's an AI-native game where Gemini 3 is the core engine.*
