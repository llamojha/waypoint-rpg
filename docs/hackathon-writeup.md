# Waypoint RPG — When AI Becomes the Dungeon Master

**A tabletop RPG where Gemini 3 doesn't just assist the story - it IS the story.**

---
## TL;DR
- **6 Gemini 3 Agents** → Multi-agent orchestration for RPG gameplay
- **1M Token Memory** → Complete narrative history, never forgets
- **15+ Tool Declarations** → Schema-enforced outputs, no hallucinations
- **Hybrid Architecture** → LLM proposes, code validates
---

## Gemini 3 Integration

> *Required: Brief write-up detailing which Gemini 3 features were used and how they are central to the application.*

Waypoint is built entirely around Gemini 3's capabilities. **Without Gemini 3, this application cannot exist.**

### Gemini 3 Features Used

| Gemini 3 Feature | How We Used It | Why It Mattered |
|------------------|----------------|-----------------|
| Function Calling | 15+ function declarations across 6 agents (propose_stat_change, detect_intent, etc.) | Schema-enforced outputs eliminate JSON parsing failures |
| 1M Token Context | Full conversation history — every turn, NPC interaction, quest | Narrative callbacks competitors can't match |
| Temperature Control | 0.1 for Orchestrator/Rune Marshal, 0.8 for Chronicler | Same model, deterministic mechanics + creative narration |
| Streaming (SSE) | Chronicler streams narration chunks in real-time | Storytelling feels responsive and alive |
| Multi-Turn Conversations | Each agent maintains context across the pipeline | Complex reasoning chains across 6 specialized agents |

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

**This architecture is only possible because of Gemini 3's function calling reliability and massive context window.** Previous models couldn't maintain coherent state across 6 agents or handle 15+ function declarations without hallucinating.

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

When Gemini 3 launched with its 1M token context window and robust function calling, I saw an opportunity. What if we built an AI RPG that actually worked like a real tabletop game? Where the DM remembers everything, where dice rolls are real, where your inventory actually exists?

**Waypoint is that experiment — and Gemini 3 made it possible.**

---

## What It Does

Waypoint transforms Gemini 3 into a true Dungeon Master for a persistent fantasy world.

### The Player Journey

1. **Create your character** — Name, portrait, starting location
2. **Type any action** — "I search the chest", "I try to sneak past the guards", "I ask the merchant about rumors"
3. **Watch Gemini 3 orchestrate:**
   - **Rune Marshal** (Gemini 3) detects your intent and any "power words" (skill-triggering verbs)
   - **Orchestrator** (Gemini 3) proposes events via function calling
   - **Arbiter** (code) validates proposals against game rules
   - **Lorekeeper** (Gemini 3) fetches relevant world knowledge
   - Server-side dice roll (d20 + modifiers) — deterministic, not LLM-generated
   - **Chronicler** (Gemini 3) streams vivid narration acknowledging the outcome
4. **See real consequences** — UI panels update with validated state changes (inventory, relationships, quests)

### What Makes It Different

| Competitor Practice | Waypoint + Gemini 3 |
|---------------------|---------------------|
| 5-8 message context limit | **Full 1M token history** — we never forget |
| Free-form LLM output | **Schema-enforced function calling** — no JSON parsing failures |
| LLM dice rolls | **Server-side deterministic rolls** — fair and verifiable |
| State in narration only | **Validated DB state + UI panels** — single source of truth |
| Single LLM call | **6 specialized Gemini 3 agents** — each optimized for their role |

**The result:** Story coherence and character development that other AI RPGs cannot match.

---

## Market Opportunity & Impact

### The Problem at Scale

**50+ million D&D players worldwide** face a fundamental barrier: finding a Dungeon Master. Traditional tabletop RPGs require coordinating schedules, finding experienced DMs, and committing to multi-hour sessions. Most players want to play more than they actually can.

Meanwhile, **AI roleplay platforms have exploded** — Character.AI alone has 20-28 million monthly active users, with users spending an average of 2 hours daily on the platform. The demand for AI-powered interactive storytelling is proven.

**But current AI RPG solutions fail:**
- AI Dungeon and similar apps forget context after a few turns
- No real game state — inventory, relationships, and quests are just text
- Dice rolls happen inside the LLM (non-deterministic)
- Narrative contradictions break immersion

### Market Size

| Segment | 2024 Value | 2030 Projection | CAGR |
|---------|------------|-----------------|------|
| **AI in Gaming** | $5.85B | $37.89B | 20.5% |
| **Generative AI in Gaming** | $2.46B | $9.82B (2031) | 26.0% |
| **Tabletop RPG (TTRPG)** | $2.0B | $4.6B (2032) | 11.4% |
| **Tabletop Games (Total)** | $20.8B | $35.3B | 7.5% |

*Sources: Precedence Research, TechSci Research, Strategic Market Research*

### Why Now?

1. **Gemini 3's 1M token context window** — For the first time, an LLM can maintain complete narrative history across hundreds of turns. This wasn't possible before 2025.

2. **Function calling maturity** — Schema-enforced function calling eliminates the JSON parsing failures that plagued earlier AI game attempts.

3. **Proven demand** — 20M+ users on Character.AI prove people want AI companions for storytelling. They just need one that actually works like a game.

### Target Users

| Segment | Size | Pain Point |
|---------|------|------------|
| **Solo RPG players** | ~15M active | Want DM-less tabletop experience |
| **D&D players without groups** | ~35M casual | Can't find consistent play groups |
| **AI roleplay users** | 20-28M MAU | Want game mechanics, not just chat |
| **Writers/Creatives** | Growing | Collaborative storytelling tool |

### Competitive Advantage

Waypoint is positioned at the intersection of two massive trends:

```
    AI Roleplay (Character.AI, etc.)          Tabletop RPG (D&D, etc.)
             20M+ MAU                              50M+ players
                 │                                      │
                 │    ┌─────────────────────┐          │
                 └───►│     WAYPOINT        │◄─────────┘
                      │  AI + Real Game     │
                      │  State + Memory     │
                      └─────────────────────┘
```

**No current product combines:**
- Full narrative memory (1M tokens)
- Real game mechanics (server-side dice, validated state)
- Multi-agent architecture (6 specialized Gemini 3 agents)

### Future Vision

As Gemini's context window and function calling continue to improve, Waypoint can expand to:
- **Multiplayer** — Shared persistent world
- **Voice I/O** — Speak to your DM
- **Procedural generation** — AI-generated worlds, NPCs, quests
- **Platform** — Let creators build their own AI-powered RPG worlds

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
│  │                 │    Function: detect_intent()                           │
│  │                 │    Output: { skill: "Sneaking", dc: 14, action_type }  │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │  Orchestrator   │  ← GEMINI 3: Central hub (temp 0.1)                    │
│  │                 │    Functions: get_power_word_tier(),                   │
│  │                 │      propose_stat_change(),                            │
│  │                 │      propose_relationship_change(), etc.               │
│  │                 │    Output: Array of structured proposals               │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│      ┌────┴────┐                                                            │
│      ▼         ▼                                                            │
│  ┌────────┐ ┌──────────┐                                                    │
│  │Arbiter │ │Lorekeeper│  ← PARALLEL EXECUTION                              │
│  │ (code) │ │(GEMINI 3)│                                                    │
│  │        │ │          │    Functions: query_codex(),                       │
│  │Validates│ │          │      get_npcs_at_location(),                      │
│  │proposals│ │Fetches   │      get_npc_voice()                              │
│  │against  │ │world lore│                                                   │
│  │rules    │ │& NPC data│                                                   │
│  └────┬───┘ └────┬─────┘                                                    │
│       │          │                                                          │
│       └────┬─────┘                                                          │
│            ▼                                                                │
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

### Function Calling in Action

#### Tool Declaration

```typescript
// lib/agents/tools/proposal-tools.ts
export const proposeRelationshipChangeTool = createTool(
  "propose_relationship_change",
  "Propose a change to NPC relationship",
  {
    type: Type.OBJECT,
    properties: {
      npc: { type: Type.STRING, description: "Name of the NPC" },
      delta: { type: Type.NUMBER, description: "Relationship change (-10 to +10)" },
      reason: { type: Type.STRING, description: "Why the relationship changed" },
    },
    required: ["npc", "delta", "reason"],
  }
);
```

#### Orchestrator Call

```typescript
// lib/agents/orchestrator.ts
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

const parts = response.candidates?.[0]?.content?.parts || [];
const functionCalls = parts.filter(p => p.functionCall).map(p => p.functionCall!);
```

#### Example Output

Player: *"I help the merchant carry her goods"*

Gemini returns:
```json
{ "name": "propose_relationship_change", "args": { "npc": "Merchant Elara", "delta": 1, "reason": "Helped carry goods" } }
```

Each proposal is validated by the Arbiter before applying to the database.

### Tech Stack

| Component | Technology |
|-----------|------------|
| **AI Engine** | Gemini 3 (`gemini-3-flash-preview`) via `@google/genai` SDK |
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS |
| **Backend** | Next.js API Routes (Edge + Serverless) |
| **Database** | Supabase (PostgreSQL + Auth + Row Level Security) |
| **Streaming** | Server-Sent Events (SSE) for real-time narration |

---

## Challenges We Ran Into

**Multi-Agent Coordination** — Running 6 Gemini 3 agents with parallel branches required careful orchestration: dependency graphs, timeout handling, and retry loops for transient failures.

**Preventing LLM Hallucinations** — Early versions had the Chronicler mentioning items the player didn't have. Fixed by injecting validated inventory and adding explicit constraints to the prompt.

**Function Calling Schema Design** — 15+ tool declarations required iteration: enum constraints for valid values, required vs optional parameters, and clear descriptions that guide model usage.

**State Synchronization** — Ensuring all agents see fresh state after mutations. Solved with state refresh between pipeline stages and the Collector pattern to merge parallel results.

**Creativity vs Consistency** — Chronicler needs creative freedom (temp 0.8) but must respect validated events. Structured input + explicit constraints + post-generation filtering solved this.

---

## Accomplishments We're Proud Of

- **6-Agent Orchestration** — Real multi-agent architecture, not a monolithic prompt
- **Deterministic Mechanics** — Server-side dice rolls, validated state, real inventory
- **Full 1M Token Usage** — No summarization, no forgetting — narrative continuity competitors can't match
- **15+ Function Declarations** — Schema-enforced outputs across all agents
- **Real-Time Streaming** — SSE narration feels responsive and alive
- **Hybrid Architecture** — LLM proposes, code disposes — game state integrity preserved

---

## What We Learned

- **Function calling > JSON prompts** — Schema-enforced outputs are dramatically more reliable
- **1M tokens is a feature** — Treat context as capability to maximize, not cost to minimize
- **Specialize your agents** — Single prompts produce mediocre results; specialized agents produce excellence
- **Hybrid is the future** — Gemini 3 for judgment, code for execution
- **Temperature matters** — 0.1 for mechanics, 0.8 for creativity — this single parameter dramatically affects quality

---

## What's Next

**Near-term:** Combat system with enemy HP tracking, quest log UI, equipment effects, weather/time systems

**Long-term:** Multiplayer shared world, voice input/output, procedural world generation, community-created content

Waypoint proves Gemini 3 can be more than a chatbot. With the right architecture, it powers experiences that feel magical.

---

## Built With

- **Gemini 3** — Multi-agent orchestration, function calling, streaming
- **@google/genai SDK** — Official Gemini API client
- **Next.js 14** — App Router, React 18, TypeScript
- **Supabase** — PostgreSQL, Auth, Row Level Security
- **Tailwind CSS** — Responsive UI
- **SSE Streaming** — Real-time narration delivery

---

## Try It Out

🎮 **[Play Waypoint](https://waypoint.amllamojha.com/)** — Live demo

📺 **[Demo Video](https://youtu.be/vL28J1Fe_Cw)** — 3-minute walkthrough

---

*Waypoint isn't an app with AI features; it's an AI-native game where Gemini 3 is the core engine.*
