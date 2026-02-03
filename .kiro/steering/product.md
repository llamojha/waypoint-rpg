# Waypoint - Product Requirements Document

## Executive Summary

Waypoint is an AI-powered tabletop RPG where Gemini 3 acts as a true Dungeon Master. Unlike chatbot-based games that lose context and hallucinate state, Waypoint maintains complete narrative history using Gemini's 1M token context window and enforces game state integrity through a hybrid LLM + code architecture.

The core innovation is the hub-and-spoke agent architecture: six specialized Gemini 3 agents handle different aspects of gameplay (intent detection, world knowledge, validation, narration), while deterministic code handles mechanics (dice rolls, state persistence, validation rules). This separation ensures creative AI storytelling with consistent, trustworthy game state.

**MVP Goal**: Deliver a playable AI RPG experience where players can explore a persistent fantasy world, interact with NPCs, complete quests, and engage in combat — all with narrative continuity that competitors cannot match.

## Mission

**Mission Statement**: Create the most immersive AI Dungeon Master experience by combining Gemini 3's reasoning capabilities with deterministic game mechanics.

**Core Principles**:
1. **Never Lose Context** — Full conversation history, no summarization
2. **LLM Proposes, Code Disposes** — AI handles creativity, code handles mechanics
3. **State Integrity** — UI panels reflect validated state, not LLM hallucinations
4. **Narrative Quality** — Story coherence that competitors cannot match
5. **Transparent Mechanics** — Players see real dice rolls and skill checks

## Target Users

**Primary Persona**: Solo RPG enthusiasts who want a DM-less tabletop experience
- Age: 18-45
- Familiar with D&D/tabletop RPG concepts
- Comfortable with text-based interfaces
- Values narrative depth over graphics

**Secondary Persona**: Writers/creatives using RPG as collaborative storytelling
- Wants emergent narrative without prep work
- Values character development and world-building

**Key Pain Points**:
- Traditional AI chatbots forget context after a few turns
- No real game state — items, relationships, quests are just text
- Dice rolls inside LLM are non-deterministic
- Narrative contradictions break immersion

## MVP Scope

### In Scope

**Core Gameplay**
- ✅ Text-based turn input with streaming narration
- ✅ Skill checks with d20 rolls (server-side, deterministic)
- ✅ Power word detection with skill bonuses
- ✅ NPC interactions with relationship tracking (-5 to +5)
- ✅ Inventory management (add/remove/equip items)
- ✅ HP and gold tracking
- ✅ Location/POI travel system
- ✅ Time progression (day/phase)
- ✅ Weather system

**Agent Architecture**
- ✅ Rune Marshal — Intent detection, action type classification
- ✅ Orchestrator — Central hub, event proposals via tool calling
- ✅ Arbiter — Pure code validation of proposals
- ✅ Lorekeeper — Canon retrieval, NPC voice data
- ✅ Chronicler — Narrative generation with streaming
- ✅ Content Sentinel — Safety filtering

**Technical**
- ✅ Gemini 3 tool calling (15+ function declarations)
- ✅ Multi-action type support (e.g., social + transaction)
- ✅ SSE streaming for narration
- ✅ 1M token context window utilization
- ✅ Supabase PostgreSQL for persistence
- ✅ Row Level Security (RLS) for user data

### Out of Scope (Post-MVP)

**Deferred Features**
- ❌ Real-time multiplayer / co-op
- ❌ Voice input/output
- ❌ Mobile native apps
- ❌ Full tactical combat with maps
- ❌ Character stats (STR/DEX/CON/INT/WIS/CHA)
- ❌ Character-level XP (overall level = sum of skill levels)
- ❌ Community marketplace
- ❌ Long-term vector memory

## User Stories

**US1: Basic Turn**
> As a player, I want to type an action and receive narrated results, so that I can experience the story.

Example: Player types "I search the chest" → Narration describes finding items → Inventory panel updates

**US2: Skill Check**
> As a player, I want to see dice rolls for risky actions, so that outcomes feel fair and deterministic.

Example: "I try to sneak past the guards" → DC 12 Sneaking check → Roll 14 + 2 modifier = 16 → Success narrated

**US3: NPC Interaction**
> As a player, I want NPCs to remember our relationship, so that interactions feel meaningful.

Example: Help a merchant → Relationship +1 → Next visit they offer a discount

**US4: Inventory Management**
> As a player, I want to equip items and see their effects, so that loot matters.

Example: Equip Iron Sword → Weapon damage shown in combat → Chronicler mentions the sword in narration

**US5: Context Retention**
> As a player, I want the DM to remember events from hours ago, so that the story stays coherent.

Example: Reference an NPC met 50 turns ago → Chronicler correctly recalls the encounter

**US6: State Integrity**
> As a player, I want the UI to show my true inventory, so that I can trust the game state.

Example: Player claims to have a dagger they don't own → Arbiter rejects → Chronicler narrates confusion

## Core Architecture

### Hub-and-Spoke Agent Pipeline

```
Player Input
    │
    ▼
Content Sentinel (code) ── Safety filter
    │
    ▼
Rune Marshal (Gemini 3) ── Intent detection, action_types[]
    │
    ▼
Orchestrator (Gemini 3) ── Tool calling proposals
    │
    ├──────────┬──────────┐
    ▼          ▼          ▼
Arbiter    Lorekeeper   Quest Agent
(code)     (Gemini 3)   (code)
    │          │          │
    └──────────┴──────────┘
               │
               ▼
         Apply State (code) ── DB writes
               │
               ▼
         Chronicler (Gemini 3) ── Streaming narration
               │
               ▼
            UI / Client
```

### Key Design Patterns

**LLM Proposes, Code Disposes**
- Gemini outputs structured proposals via tool calling
- Deterministic code validates and applies changes
- No direct LLM mutation of game state

**Multi-Action Types**
- Actions classified as array: `action_types: ActionType[]`
- Supports combined actions: `["social", "transaction"]`
- Tools merged via `getUnionOfAllowedTools()`

**Action Type Constraints**

| Type | Allowed Proposals |
|------|-------------------|
| passive | none |
| travel | location_change, npc_discovered |
| social | relationship_change, npc_discovered, quest_* |
| combat | stat_change, inventory_add, combat_damage, combat_start |
| object | inventory_add, inventory_remove, stat_change |
| transaction | inventory_add, inventory_remove, stat_change, relationship_change |

## Technology Stack

**Frontend**
- Next.js 14 (App Router)
- React 18
- Tailwind CSS
- TypeScript

**Backend**
- Next.js API Routes (Edge + Serverless)
- Supabase (PostgreSQL + Auth + RLS)

**AI/LLM**
- Google Gemini 3 (`gemini-2.5-flash-lite` for testing)
- `@google/genai` SDK
- Tool calling / function declarations
- Temperature: 0.1 (mechanics), 0.8 (narration)

**Key Dependencies**
- `@supabase/supabase-js` — Database client
- `@google/genai` — Gemini SDK
- `vitest` — Testing

## API Specification

### POST /api/turn

Process a player turn through the agent pipeline.

**Request**
```json
{
  "characterId": "uuid",
  "playerAction": "I search the chest"
}
```

**Response (SSE stream)**
```
event: narration
data: {"chunk": "You open the chest..."}

event: complete
data: {"diffs": [...], "suggestedActions": [...]}
```

### Proposal Tools (Gemini Function Declarations)

| Tool | Purpose |
|------|---------|
| `propose_stat_change` | HP/gold changes |
| `propose_inventory_add` | Add item |
| `propose_inventory_remove` | Remove item |
| `propose_relationship_change` | NPC relationship delta |
| `propose_location_change` | Travel to POI |
| `propose_quest_start` | Start quest |
| `propose_quest_progress` | Update quest |
| `propose_npc_discovered` | Register new NPC |
| `propose_combat_damage` | Damage enemy |
| `propose_combat_start` | Spawn enemies |

## Success Criteria

### MVP Success Definition
A player can complete a 100-turn session with:
- Zero state inconsistencies
- Narrative callbacks to earlier events
- Working skill checks, inventory, relationships

### Functional Requirements
- ✅ Create character and start adventure
- ✅ Play 20+ turns with streaming narration
- ✅ Complete skill checks end-to-end
- ✅ Interact with NPCs, track relationships
- ✅ Add/remove/equip inventory items
- ✅ Travel between locations
- ✅ Time and weather progression

### Quality Indicators
- Turn response time < 3 seconds
- No hallucinated items in narration
- Rejected proposals handled gracefully
- Consistent state across UI panels

## Implementation Phases

### Phase 1-3: Foundation ✅ COMPLETE
- Project setup, Supabase, basic turn flow
- Authentication, skill checks, streaming
- Demo polish

### Phase 4: Agent Pipeline ✅ COMPLETE
- Hub-and-spoke architecture
- Orchestrator + Arbiter + Lorekeeper
- Quest agent, rules engine
- Constrained orchestrator (action types)

### Phase 5: Gameplay Systems ✅ COMPLETE
- Inventory/equipment
- Skill XP progression
- Combat system
- World systems (time, weather)
- DM chat

### Phase 6: Final Polish ✅ COMPLETE
- Conversation compression
- MVP polish
- E2E testing

## Competitive Advantage

**Why Waypoint Wins**:

| Competitor Practice | Waypoint Approach |
|--------------------|-------------------|
| 5-8 message context limit | Full 1M token history |
| Free-form LLM output | Structured tool calling |
| LLM dice rolls | Server-side deterministic |
| State in narration only | Validated DB state + UI panels |
| Single LLM call | 6 specialized agents |

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Gemini latency spikes | Streaming narration, timeout fallbacks |
| Tool calling failures | Retry loop, graceful degradation |
| Context window overflow | Compression system (post-MVP) |
| Hallucinated state | Arbiter validation, inventory checks in Chronicler |
| Cost at scale | Efficient prompts, caching, rate limiting |

## Appendix

### Key Documents
- `.kiro/steering/agent-system.md` — Detailed agent specifications
- `.kiro/steering/llm-integration.md` — Gemini integration guidelines
- `.kiro/steering/mvp-roadmap.md` — Implementation phases
- `docs/hackathon-writeup.md` — Gemini 3 hackathon submission

### Repository Structure
```
waypoint-rpg/
├── app/                    # Next.js app router
│   └── api/turn/          # Turn processing endpoint
├── lib/
│   ├── agents/            # Agent implementations
│   ├── rules/             # Validation, constraints
│   ├── prompts/           # Chronicler prompts
│   └── turn/              # Pipeline orchestration
├── components/            # React UI components
└── .kiro/steering/        # Product documentation
```
