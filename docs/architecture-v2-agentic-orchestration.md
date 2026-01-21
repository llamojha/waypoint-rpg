# Waypoint Agentic Architecture v2

## Design Principles

Based on our testing, competitor research, and core values:

1. **Never Lose Context** - Full history, no trimming (our competitive advantage)
2. **Code Constrains, LLM Creates** - Deterministic rules, creative narration
3. **State is Sacred** - Fresh state for every agent, no stale data
4. **Transparency** - See exactly what each agent received
5. **Defense in Depth** - Multiple validation layers

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PLAYER ACTION                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  LAYER 1: INPUT PROCESSING (Code - Deterministic)                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │ Content Sentinel│  │ Action Classifier│  │ Context Builder │              │
│  │ (safety filter) │  │ (pattern match) │  │ (keyword trigger)│              │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘              │
│           │                    │                    │                        │
│           ▼                    ▼                    ▼                        │
│     safe_action          action_type          relevant_context               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  LAYER 2: INTENT ANALYSIS (LLM - Judgment)                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Rune Marshal                                                         │    │
│  │ - Confirms/refines action_type from Layer 1                         │    │
│  │ - Detects skill check requirements                                  │    │
│  │ - Identifies power words                                            │    │
│  │ - Outputs: { action_type, requires_roll, skill, dc, power_words }   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  LAYER 3: CONSTRAINT RESOLUTION (Code - Deterministic)                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Rules Engine                                                         │    │
│  │ - action_type → allowed_proposals[]                                 │    │
│  │ - Filters available tools for Orchestrator                          │    │
│  │ - Adds quest context if relevant                                    │    │
│  │ - Returns: { allowed_tools, quest_context, constraints }            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  LAYER 4: PROPOSAL GENERATION (LLM - Creativity within Constraints)         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Orchestrator                                                         │    │
│  │ - Receives ONLY allowed_tools (cannot propose disallowed types)     │    │
│  │ - Full turn history for narrative context                           │    │
│  │ - Generates proposals within constraints                            │    │
│  │ - Outputs: proposals[]                                              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  LAYER 5: VALIDATION (Code - Deterministic)                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Arbiter                                                              │    │
│  │ - Validates proposal DATA (bounds, existence, conflicts)            │    │
│  │ - Defense in depth (catches anything that slipped through)          │    │
│  │ - Can modify (cap values) or reject                                 │    │
│  │ - Outputs: { approved[], rejected[], modified[] }                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
┌───────────────────────────────┐   ┌───────────────────────────────┐
│  LAYER 6A: STATE APPLICATION  │   │  LAYER 6B: LORE ENRICHMENT    │
│  (Code - Deterministic)       │   │  (LLM - Context)              │
│  ┌─────────────────────────┐  │   │  ┌─────────────────────────┐  │
│  │ Apply State             │  │   │  │ Lorekeeper              │  │
│  │ - Write to DB           │  │   │  │ - NPC voices            │  │
│  │ - Calculate consequences│  │   │  │ - Atmosphere            │  │
│  │ - Return side effects   │  │   │  │ - Relevant lore         │  │
│  └─────────────────────────┘  │   │  └─────────────────────────┘  │
└───────────────────────────────┘   └───────────────────────────────┘
                    │                               │
                    └───────────────┬───────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  LAYER 7: NARRATION (LLM - Pure Creativity)                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Chronicler                                                           │    │
│  │ - Full turn history (NEVER trimmed)                                 │    │
│  │ - Approved events + consequences                                    │    │
│  │ - NPC voices + atmosphere                                           │    │
│  │ - Generates immersive narration                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  LAYER 8: OUTPUT (Code - Deterministic)                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Response Builder                                                     │    │
│  │ - Compile turn response                                             │    │
│  │ - Include debug trace with EXACT context each agent received        │    │
│  │ - Stream narration via SSE                                          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Layer Details

### Layer 1: Input Processing (Code)

**Purpose**: Deterministic preprocessing before any LLM call.

#### 1A. Content Sentinel
- Pattern matching for unsafe content
- No LLM needed
- Fast, cheap, reliable

#### 1B. Action Classifier (NEW)
- **Code-first classification** using pattern matching
- Falls back to LLM (Rune Marshal) only for ambiguous cases

```typescript
function classifyAction(action: string): ActionType | null {
  const patterns: Record<ActionType, RegExp[]> = {
    travel: [
      /^i (go|travel|head|walk|run|move) to/i,
      /^(go|travel|head) to/i,
      /^let'?s go to/i,
    ],
    observation: [
      /^(look|examine|inspect|observe|check|search)/i,
      /^what (do i see|is here|can i see)/i,
    ],
    conversation: [
      /^(what|how|why|when|where|who|tell me)/i,
      /\?$/,  // Ends with question mark
      /^(hi|hello|hey|greetings)/i,
    ],
    combat: [
      /^i (attack|strike|hit|fight|slash|stab)/i,
      /^(attack|strike|fight)/i,
    ],
    // ... more patterns
  };
  
  for (const [type, regexes] of Object.entries(patterns)) {
    if (regexes.some(r => r.test(action))) {
      return type as ActionType;
    }
  }
  return null; // Ambiguous, let Rune Marshal decide
}
```

#### 1C. Context Builder (NEW - Keyword Triggered)
- **Deterministic context injection** based on keywords
- Like AI Dungeon's World Info system
- Ensures relevant NPCs/locations are in context

```typescript
function buildRelevantContext(
  action: string,
  world: WorldContext,
  knownEntities: Entity[]
): RelevantContext {
  const mentioned: Entity[] = [];
  
  // Check for NPC mentions
  for (const entity of knownEntities) {
    const namePattern = new RegExp(entity.name, 'i');
    if (namePattern.test(action)) {
      mentioned.push(entity);
    }
  }
  
  // Always include entities at current location
  const present = knownEntities.filter(e => e.location === world.poi);
  
  return {
    mentionedEntities: mentioned,
    presentEntities: present,
    currentLocation: world,
  };
}
```

---

### Layer 2: Intent Analysis (LLM)

**Purpose**: Refine classification, detect skill requirements.

**Rune Marshal** receives:
- Player action
- Pre-classified action_type (from Layer 1, may be null)
- Current location context

**Outputs**:
```typescript
interface RuneMarshalOutput {
  action_type: ActionType;      // Confirmed or determined
  requires_roll: boolean;
  skill?: SkillName;
  dc?: number;
  power_words?: string[];
  intent_summary: string;       // Brief description for debugging
}
```

**Key change**: If Layer 1 already classified the action, Rune Marshal just confirms. Only uses LLM judgment for ambiguous cases.

---

### Layer 3: Constraint Resolution (Code)

**Purpose**: Determine what the Orchestrator is allowed to do.

```typescript
const ACTION_CONSTRAINTS: Record<ActionType, ProposalType[]> = {
  conversation: [],                                    // No state changes
  observation: [],                                     // No state changes
  travel: ['location_change'],                         // Only movement
  interaction: ['relationship_change'],                // Only relationship
  combat: ['stat_change', 'inventory_add'],           // HP, loot
  stealth: ['stat_change'],                           // Detection damage
  manipulation: ['inventory_add', 'inventory_remove', 'stat_change'],
  quest_action: ['quest_start', 'quest_progress', 'relationship_change'],
  commerce: ['inventory_add', 'inventory_remove', 'stat_change'],
};

function resolveConstraints(
  actionType: ActionType,
  questContext: QuestContext
): ConstraintResult {
  const allowedProposals = ACTION_CONSTRAINTS[actionType];
  
  // Filter tools to only allowed types
  const allowedTools = PROPOSAL_TOOLS.filter(
    tool => allowedProposals.includes(tool.name.replace('propose_', ''))
  );
  
  return {
    allowedTools,
    allowedProposals,
    questContext,
    constraints: {
      maxRelationshipDelta: 2,
      validLocations: world.nearbyPoi,
      // ... other bounds
    },
  };
}
```

---

### Layer 4: Proposal Generation (LLM)

**Purpose**: Creative proposal generation within constraints.

**Orchestrator** receives:
- Player action
- **ONLY allowed tools** (cannot call disallowed proposal types)
- Full turn history (our advantage)
- Quest context
- Constraint bounds

**Key insight**: The Orchestrator literally cannot propose a relationship_change for a travel action because it doesn't have that tool available.

---

### Layer 5: Validation (Code)

**Purpose**: Defense in depth - catch anything that slipped through.

**Arbiter** validates:
- Data bounds (delta ≤ 2, HP ≥ 0, etc.)
- Entity existence (NPC present, location valid)
- Conflict detection (multiple location changes)
- Quest requirements (goal type matches proposal)
- **Trope prevention** (blocked names/descriptions for generated NPCs)

**Note**: With constrained tools, most invalid proposals are prevented at source. Arbiter catches edge cases and data errors.

#### Trope Prevention (Lightweight)

Since canonical NPCs/locations are world-built in DB, trope prevention only applies to LLM-generated minor NPCs via `propose_npc_discovered`.

```typescript
// Simple blocklist - expand as patterns emerge
const BLOCKED_NPC_NAMES = [
  'elara', 'lyra', 'kira', 'aria',     // LLM favorite names
  'mysterious stranger', 'hooded figure', 'cloaked man',
  'old man', 'wise woman', 'ancient one',
];

const BLOCKED_DESCRIPTION_PATTERNS = [
  /hooded.*figure/i,
  /mysterious.*stranger/i,
  /eyes that seem to/i,                 // "eyes that seem to pierce your soul"
  /knowing smile/i,
  /air of mystery/i,
];

function validateNpcDiscovered(proposal: ProposalResult): ValidationResult {
  const nameLower = proposal.data.name.toLowerCase();
  const descLower = (proposal.data.description || '').toLowerCase();
  
  // Check blocked names
  if (BLOCKED_NPC_NAMES.some(blocked => nameLower.includes(blocked))) {
    return { 
      valid: false, 
      reason: `Blocked NPC trope: "${proposal.data.name}"` 
    };
  }
  
  // Check blocked description patterns
  for (const pattern of BLOCKED_DESCRIPTION_PATTERNS) {
    if (pattern.test(descLower)) {
      return { 
        valid: false, 
        reason: `Blocked NPC description trope` 
      };
    }
  }
  
  return { valid: true };
}
```

**Scope**: Lightweight blocklist, not a complex system. Rejected NPCs simply don't get created - the narration continues without them. Expand blocklist as patterns emerge in testing.

---

### Layer 6: Parallel Processing

**6A. Apply State (Code)**
- Write approved changes to DB
- Calculate consequences (NPC died, quest completed)
- **MUST complete before response** (fixes state sync bug)

**6B. Lorekeeper (LLM)**
- Fetch NPC voices for dialogue
- Get atmosphere for scene
- Runs in parallel with Apply State

---

### Layer 7: Narration (LLM)

**Purpose**: Pure creativity - generate immersive story.

**Chronicler** receives:
- **Full turn history** (NEVER trimmed - our advantage)
- Approved events
- Consequences from Apply State
- NPC voices and atmosphere from Lorekeeper

**Key**: Chronicler has no proposal tools. It only narrates what was approved.

---

### Layer 8: Output

**Purpose**: Compile response with full transparency.

```typescript
interface TurnResponse {
  turn: Turn;
  debug: {
    // EXACT context each agent received
    inputContext: {
      world: WorldContext;
      entities: string[];
      actionType: ActionType;
    };
    agentInputs: {
      runeMarshal: { ... };
      orchestrator: { allowedTools: string[], ... };
      arbiter: { ... };
      chronicler: { turnCount: number, ... };
    };
    trace: AgentTrace[];
  };
}
```

---

## State Synchronization

### The Problem
Previous turn's DB write may not complete before next request reads.

### The Solution

1. **Client-side debouncing**
```typescript
// Prevent sending new turn until previous completes
const [isProcessing, setIsProcessing] = useState(false);
```

2. **Server-side sequencing**
```typescript
// Ensure Apply State completes before response
await applyState(approvedEvents);  // MUST await
return buildResponse(turn);
```

3. **Fresh state per request**
```typescript
// Load state at START of request, use throughout
const world = await loadWorldState(characterId);
// Pass this same `world` to ALL agents
```

4. **Debug includes loaded state**
```typescript
// Response shows what server actually loaded
debug: {
  inputContext: {
    world: { poi: world.poi, entities: world.entities }
  }
}
```

---

## Action Type Classification

### Code-First Approach

```
Player Action
     │
     ▼
┌─────────────────────────────────────┐
│ Pattern Matching (Code)             │
│ - Regex patterns for each type      │
│ - Fast, deterministic, free         │
└─────────────┬───────────────────────┘
              │
              ▼
         Match found?
        /           \
      Yes            No
       │              │
       ▼              ▼
  Use matched    ┌─────────────────┐
  action_type    │ Rune Marshal    │
                 │ (LLM fallback)  │
                 └────────┬────────┘
                          │
                          ▼
                    action_type
```

### Pattern Examples

| Pattern | Action Type |
|---------|-------------|
| `/^i (go\|travel\|head) to/i` | travel |
| `/^(look\|examine\|inspect)/i` | observation |
| `/\?$/` (ends with ?) | conversation |
| `/^i (attack\|strike\|hit)/i` | combat |
| `/^i (buy\|sell\|trade)/i` | commerce |
| `/^i (accept\|take) the quest/i` | quest_action |
| `/^i (help\|thank\|insult)/i` | interaction |

### Ambiguous Cases

For actions that don't match patterns, Rune Marshal (LLM) decides:
- "I do something interesting" → LLM judgment
- "Let's see what happens" → LLM judgment

---

## Comparison: Before vs After

| Aspect | Before (Current) | After (v2) |
|--------|------------------|------------|
| Action classification | LLM only | Code-first, LLM fallback |
| Tool availability | All tools always | Constrained by action type |
| Invalid proposals | Caught by Arbiter | Prevented at source |
| Context injection | LLM decides | Keyword-triggered (deterministic) |
| State sync | Race conditions | Debouncing + await |
| Debug visibility | Partial | Full context snapshot |
| Turn history | Full (good!) | Full (unchanged) |

---

## Implementation Priority

### Phase 1: Fix Foundation (Day 1)
1. [ ] Audit DB writes for missing `await`
2. [ ] Add client-side debouncing
3. [ ] Add server state to debug response

### Phase 2: Code-First Classification (Day 1-2)
4. [ ] Create `lib/agents/action-classifier.ts`
5. [ ] Add pattern matching for common actions
6. [ ] Update Rune Marshal to accept pre-classification

### Phase 3: Constrained Tools (Day 2)
7. [ ] Create `lib/rules/proposal-constraints.ts`
8. [ ] Refactor Orchestrator to accept dynamic tools
9. [ ] Wire constraints in route.ts

### Phase 4: Testing (Day 3)
10. [ ] Test: conversation → 0 proposals
11. [ ] Test: travel → only location_change
12. [ ] Test: 20+ turns without invalid proposals

---

## Success Metrics

- [ ] "What should we do?" produces 0 proposals (not caught by Arbiter, never proposed)
- [ ] Travel actions only produce location_change
- [ ] Interaction actions only produce relationship_change
- [ ] Debug trace shows exact context each agent received
- [ ] No state sync issues (location matches across agents)
- [ ] 50+ turns without invalid proposals

---

## Phase 5 Integration: Gameplay Systems

The v2 architecture is designed to support Phase 5 gameplay systems seamlessly.

### How Gameplay Systems Fit

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        GAMEPLAY SYSTEMS INTEGRATION                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐     │
│  │  INVENTORY  │   │   SKILLS    │   │   COMBAT    │   │   WORLD     │     │
│  │  EQUIPMENT  │   │   SYSTEM    │   │   SYSTEM    │   │   SYSTEMS   │     │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘     │
│         │                 │                 │                 │             │
│         └────────────┬────┴────────┬────────┴────────┬────────┘             │
│                      │             │                 │                       │
│                      ▼             ▼                 ▼                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    LAYER 3: CONSTRAINT RESOLUTION                    │    │
│  │  - Equipment affects combat constraints (weapon damage bounds)       │    │
│  │  - Skill levels affect DC ranges and power word availability        │    │
│  │  - Combat state affects allowed actions (in_combat vs exploration)  │    │
│  │  - World state affects travel options (time of day, weather)        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    LAYER 5: VALIDATION (Arbiter)                     │    │
│  │  - Validate damage against weapon stats                             │    │
│  │  - Validate skill XP gains                                          │    │
│  │  - Validate combat outcomes against enemy HP                        │    │
│  │  - Validate time/weather transitions                                │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.1 Inventory & Equipment Integration

**Action Types Extended**:
```typescript
const ACTION_CONSTRAINTS = {
  // ... existing
  equip: ['inventory_equip'],           // NEW
  unequip: ['inventory_unequip'],       // NEW
  use_item: ['inventory_remove', 'stat_change'],  // Consumables
};
```

**Equipment Affects Combat**:
```typescript
// In Layer 3: Constraint Resolution
function getCombatConstraints(character: Character): CombatConstraints {
  const weapon = character.equipment.mainHand;
  const armor = character.equipment.chest;
  
  return {
    baseDamage: weapon?.damage || '1d4',  // Unarmed
    damageBonus: weapon?.bonus || 0,
    armorClass: 10 + (armor?.ac || 0),
    // Constraints passed to Orchestrator
  };
}
```

### 5.2 Skill System Integration

**Skill Checks in Layer 2 (Rune Marshal)**:
```typescript
interface RuneMarshalOutput {
  action_type: ActionType;
  requires_roll: boolean;
  skill?: SkillName;
  dc?: number;
  power_words?: string[];
  // NEW: Skill context for XP calculation
  skill_context?: {
    base_xp: number;
    power_word_bonus: number;
  };
}
```

**XP Gains in Layer 6A (Apply State)**:
```typescript
// After successful skill check
if (rollOutcome.success) {
  const xpGain = calculateSkillXP(
    rollOutcome.skill,
    rollOutcome.dc,
    rollOutcome.powerWords
  );
  await grantSkillXP(characterId, rollOutcome.skill, xpGain);
}
```

**Power Word Unlocks**:
```typescript
// In Layer 3: Check available power words based on skill level
function getAvailablePowerWords(
  skill: SkillName,
  skillLevel: number
): string[] {
  const tiers = SKILL_TREE[skill];
  const available: string[] = [];
  
  if (skillLevel >= 1) available.push(...tiers.tier1);
  if (skillLevel >= 4) available.push(...tiers.tier2);
  if (skillLevel >= 7) available.push(...tiers.tier3);
  
  return available;
}
```

### 5.3 Combat System Integration

**Combat State Machine**:
```typescript
type CombatState = 'exploration' | 'combat_start' | 'in_combat' | 'combat_end';

// Combat state affects action constraints
const COMBAT_ACTION_CONSTRAINTS: Record<CombatState, ActionType[]> = {
  exploration: ['travel', 'observation', 'conversation', 'interaction', ...],
  combat_start: ['combat', 'stealth', 'conversation'],  // Can try to talk/flee
  in_combat: ['combat', 'manipulation', 'stealth'],     // Limited options
  combat_end: ['observation', 'manipulation', 'travel'], // Loot, leave
};
```

**Enemy HP Tracking**:
```typescript
// NEW proposal type for combat
interface CombatProposal {
  type: 'propose_combat_action';
  data: {
    action: 'attack' | 'defend' | 'flee' | 'special';
    target?: string;
    damage_roll?: string;  // e.g., "2d6+3"
  };
}

// Arbiter validates against enemy HP
function validateCombatAction(
  proposal: CombatProposal,
  combatState: CombatState
): ValidationResult {
  const enemy = combatState.enemies.find(e => e.name === proposal.data.target);
  if (!enemy) return { valid: false, reason: 'Target not in combat' };
  // ... validate damage bounds, etc.
}
```

### 5.4 World Systems Integration

**Time Progression**:
```typescript
// Time advances based on action type
const TIME_COSTS: Record<ActionType, number> = {
  conversation: 0,      // Instant
  observation: 0,       // Instant
  travel: 1,            // 1 time unit
  combat: 1,            // 1 time unit per round
  manipulation: 0,      // Instant
  // ...
};

// In Layer 6A: Apply State
function advanceTime(actionType: ActionType, world: WorldContext): WorldContext {
  const cost = TIME_COSTS[actionType];
  if (cost === 0) return world;
  
  const newPhase = calculateNewPhase(world.time, cost);
  return { ...world, time: newPhase };
}
```

**Weather Effects**:
```typescript
// Weather affects constraints
function getWeatherModifiers(weather: Weather): Modifiers {
  switch (weather) {
    case 'storm':
      return { 
        travel_dc_modifier: +5,
        perception_dc_modifier: +3,
        ranged_attack_modifier: -2,
      };
    case 'fog':
      return {
        perception_dc_modifier: +5,
        stealth_dc_modifier: -3,  // Easier to hide
      };
    // ...
  }
}
```

### 5.5 DM Chat Integration

**Separate from Turn Pipeline**:
```typescript
// DM Chat bypasses the turn pipeline entirely
// It's a direct LLM call for questions/clarifications

async function handleDMChat(
  question: string,
  character: Character,
  world: WorldContext,
  turnHistory: Turn[]
): Promise<string> {
  // No proposals, no state changes
  // Just answer the question with full context
  
  const response = await gemini.generate({
    systemPrompt: DM_CHAT_PROMPT,
    context: {
      character,
      world,
      turnHistory,  // Full history for context
    },
    userMessage: question,
  });
  
  return response.text;
}
```

---

## Competitive Advantages Over Fables.gg & Old Greg's Tavern

### What They Do Well (We Should Match)

| Feature | Fables.gg | Old Greg's | Waypoint Target |
|---------|-----------|------------|-----------------|
| Agentic architecture | ACE-1 | Unknown | v2 Architecture ✅ |
| State management | Explicit updates | Unknown | Proposal tools ✅ |
| Trope prevention | Dedicated system | Unknown | Code blocklist 📋 |
| View context | Yes | Unknown | Debug trace 📋 |
| NPC relationships | Auto-tracked | Unknown | Already have ✅ |

### Where We Go Beyond

| Feature | Competitors | Waypoint Advantage |
|---------|-------------|-------------------|
| **Context window** | 5-8 messages | **Full 1M tokens** |
| **Narrative continuity** | Summarized/compressed | **Never lose context** |
| **Action classification** | LLM-only | **Code-first + LLM fallback** |
| **Skill system** | Basic/none | **OSRS-style progression** |
| **Power words** | None | **Unique mechanic** |
| **Combat** | Basic | **Tactical with enemy HP** |
| **Equipment effects** | Basic | **Stats affect gameplay** |

### Unique Waypoint Features (Phase 5+)

#### 1. Power Word System
No competitor has this. Players discover verbs that grant bonuses:
- "I **strike** the goblin" → +1 Melee bonus
- "I **cleave** through them" → +2 Melee bonus (tier 2)
- Unlocked by skill progression

#### 2. Emergent Class System
No predefined classes. Your playstyle defines your character:
- Use Melee a lot → become a warrior
- Use Sneaking a lot → become a rogue
- Mix of skills → unique hybrid

#### 3. Full Narrative Memory
Competitors forget. We don't:
- "Remember when you helped Lenna 50 turns ago?"
- NPCs reference past events accurately
- Story arcs that span entire adventures

#### 4. Deterministic + Creative Hybrid
Best of both worlds:
- **Deterministic**: Action classification, constraints, validation
- **Creative**: Narration, dialogue, world-building
- Competitors are either too random (pure LLM) or too rigid (scripted)

---

## Architecture Evolution: Phase 5 → Phase 6

```
Phase 4.6: Foundation
├── Code-first action classification
├── Constrained tools
├── State sync fix
└── Debug transparency

Phase 5: Gameplay Systems
├── 5.1 Inventory/Equipment → Equipment affects constraints
├── 5.2 Skill System → XP, levels, power words
├── 5.3 Combat System → Enemy HP, tactical options
├── 5.4 World Systems → Time, weather effects
└── 5.5 DM Chat → Separate from turn pipeline

Phase 6: Polish & Scale
├── 6.1 Compression (if needed) → Probably not with 1M context
├── 6.2 Security → Auth, RLS, rate limiting
├── 6.3 Polish → UX, performance
└── 6.4 E2E Testing → Full coverage
```

---

## Implementation Roadmap

### Week 1: Foundation (Phase 4.6)
- Day 1-2: State sync fix + code-first classification
- Day 3: Constrained tools + debug transparency
- Day 4-5: Testing + iteration

### Week 2-3: Gameplay (Phase 5)
- 5.0: Automated testing (gate)
- 5.1-5.2: Inventory + Skills (parallel)
- 5.3: Combat system
- 5.4-5.5: World systems + DM chat

### Week 4: Polish (Phase 6)
- Security review
- Performance optimization
- E2E testing

---

## Success Metrics

### Phase 4.6 Complete When:
- [ ] 0 invalid proposals for conversation actions
- [ ] Debug trace shows exact agent inputs
- [ ] No state sync issues in 50+ turns

### Phase 5 Complete When:
- [ ] Equipment stats affect combat outcomes
- [ ] Skills gain XP and level up
- [ ] Power words unlock at thresholds
- [ ] Combat tracks enemy HP to death
- [ ] Time/weather progress and affect gameplay
- [ ] DM chat works without turns

### Competitive Parity When:
- [ ] Narrative quality matches/exceeds Fables.gg
- [ ] State management as reliable as ACE-1
- [ ] Trope prevention working

### Competitive Advantage When:
- [ ] Full context enables callbacks competitors can't do
- [ ] Power word system is unique and engaging
- [ ] Skill progression feels meaningful
- [ ] Players prefer Waypoint's narrative depth
