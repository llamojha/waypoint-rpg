# Phase 4.5: Constrained Orchestrator Architecture

## Overview

This phase evolves the current "LLM proposes freely → Code validates" architecture to "Code constrains → LLM proposes within bounds → Code validates".

**Goal**: Prevent invalid proposals at the source rather than catching them after the fact.

---

## Current Architecture (Post Rules Engine)

```
Player Action
     ↓
┌─────────────────────────────────────────────────────────┐
│ Rune Marshal                                            │
│   - Detects skill, DC, power words                      │
│   - Outputs: requires_roll, skill, dc                   │
│   - Does NOT constrain what Orchestrator can do         │
└─────────────────────┬───────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ Orchestrator (LLM)                                      │
│   - Receives ALL proposal tools                         │
│   - Can propose ANYTHING                                │
│   - Prompt says "don't do X" but LLM ignores it         │
└─────────────────────┬───────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ Arbiter (Code + Rules Engine)                           │
│   - Validates proposals AFTER they're made              │
│   - Rejects invalid ones                                │
│   - Wasted LLM call if proposal was junk                │
└─────────────────────────────────────────────────────────┘
```

**Problem**: LLM proposes relationship changes for "What should we do?" because it CAN. Prompt rules don't reliably prevent this.

---

## Target Architecture (Constrained Orchestrator)

```
Player Action
     ↓
┌─────────────────────────────────────────────────────────┐
│ Rune Marshal (Enhanced)                                 │
│   - Detects skill, DC, power words (existing)           │
│   - NEW: Classifies action_type                         │
│   - Outputs: action_type, requires_roll, skill, dc      │
└─────────────────────┬───────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ Proposal Constraint Layer (NEW - Code)                  │
│   - Maps action_type → allowed_proposal_types[]         │
│   - Filters tool list for Orchestrator                  │
│   - conversation → [] (no tools)                        │
│   - travel → [location_change]                          │
│   - interaction → [relationship_change, quest_start]    │
└─────────────────────┬───────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ Orchestrator (LLM)                                      │
│   - Receives ONLY allowed proposal tools                │
│   - Cannot propose what it doesn't have access to       │
│   - Constrained by design, not by prompt                │
└─────────────────────┬───────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ Arbiter (Code + Rules Engine)                           │
│   - Still validates data bounds                         │
│   - But fewer invalid proposals to catch                │
│   - Defense in depth                                    │
└─────────────────────────────────────────────────────────┘
```

---

## Action Types

| Action Type | Description | Examples |
|-------------|-------------|----------|
| `conversation` | Talking, asking questions, small talk | "What should we do?", "Hello", "Tell me about..." |
| `travel` | Moving to a different location | "I go to X", "Travel to X", "Head to X" |
| `observation` | Looking, examining, perceiving | "Look around", "Examine the X", "What do I see?" |
| `interaction` | Meaningful NPC interaction | "I help Lenna", "I thank the captain", "I insult him" |
| `combat` | Fighting, attacking | "I attack", "I strike the goblin" |
| `stealth` | Sneaking, hiding | "I sneak past", "I hide" |
| `manipulation` | Using objects, environment | "I open the chest", "I pull the lever" |
| `quest_action` | Accepting/progressing quests | "I accept the quest", "I'll help you" |
| `commerce` | Buying, selling, trading | "I buy the sword", "I sell my herbs" |

---

## Proposal Constraints by Action Type

| Action Type | Allowed Proposals | Rationale |
|-------------|-------------------|-----------|
| `conversation` | `[]` (none) | Talking doesn't change state |
| `travel` | `[location_change]` | Only location changes |
| `observation` | `[]` (none) | Looking doesn't change state |
| `interaction` | `[relationship_change]` | NPC relationship only |
| `combat` | `[stat_change, inventory_add]` | HP loss, loot drops |
| `stealth` | `[stat_change]` | Possible detection/damage |
| `manipulation` | `[inventory_add, inventory_remove, stat_change]` | Object interactions |
| `quest_action` | `[quest_start, quest_progress, relationship_change]` | Quest state changes |
| `commerce` | `[inventory_add, inventory_remove, stat_change]` | Items and gold |

---

## Implementation Tasks

### Pre-requisite: Fix State Sync Bug
- [ ] Audit all DB writes for missing `await`
- [ ] Add client-side debouncing (prevent fast requests)
- [ ] Add server state to debug trace response
- [ ] Verify state sync is working

**Estimate**: 1 hour

---

### Task 1: Enhance Rune Marshal

**File**: `lib/agents/rune-marshal/index.ts`

**Changes**:
- Add `actionType` to output schema
- Update prompt to classify action type
- Map detected intent to action type

**Schema Change**:
```typescript
// Current
interface RuneMarshalOutput {
  requires_roll: boolean;
  skill?: string;
  dc?: number;
  power_words?: string[];
  intent?: string;
}

// New
interface RuneMarshalOutput {
  action_type: ActionType;  // NEW
  requires_roll: boolean;
  skill?: string;
  dc?: number;
  power_words?: string[];
  intent?: string;
}

type ActionType = 
  | "conversation"
  | "travel" 
  | "observation"
  | "interaction"
  | "combat"
  | "stealth"
  | "manipulation"
  | "quest_action"
  | "commerce";
```

**Estimate**: 1 hour

---

### Task 2: Create Proposal Constraint Layer

**New File**: `lib/rules/proposal-constraints.ts`

**Purpose**: Map action types to allowed proposal tools

```typescript
import { ActionType } from "@/lib/agents/rune-marshal";
import { PROPOSAL_TOOLS } from "@/lib/agents/tools/proposal-tools";

const ACTION_TYPE_CONSTRAINTS: Record<ActionType, string[]> = {
  conversation: [],
  travel: ["propose_location_change"],
  observation: [],
  interaction: ["propose_relationship_change"],
  combat: ["propose_stat_change", "propose_inventory_add"],
  stealth: ["propose_stat_change"],
  manipulation: ["propose_inventory_add", "propose_inventory_remove", "propose_stat_change"],
  quest_action: ["propose_quest_start", "propose_quest_progress", "propose_relationship_change"],
  commerce: ["propose_inventory_add", "propose_inventory_remove", "propose_stat_change"],
};

export function getAllowedProposalTools(actionType: ActionType) {
  const allowedNames = ACTION_TYPE_CONSTRAINTS[actionType] || [];
  return PROPOSAL_TOOLS.filter(tool => allowedNames.includes(tool.name));
}
```

**Option**: Store constraints in DB table for flexibility without redeployment.

**Estimate**: 30 minutes

---

### Task 3: Refactor Orchestrator Tool Injection

**File**: `lib/agents/orchestrator.ts`

**Current**:
```typescript
const allTools = [...READ_TOOLS, ...PROPOSAL_TOOLS];  // Always all tools

const response = await ai.models.generateContent({
  tools: [{ functionDeclarations: allTools }],
  // ...
});
```

**New**:
```typescript
export async function runOrchestrator(
  playerAction: string,
  character: Character,
  world: WorldContext,
  recentTurns: Turn[],
  allowedProposalTools: FunctionDeclaration[],  // NEW parameter
  // ...
) {
  const allTools = [...READ_TOOLS, ...allowedProposalTools];  // Dynamic

  const response = await ai.models.generateContent({
    tools: [{ functionDeclarations: allTools }],
    // ...
  });
}
```

**Also update prompt** to only document allowed tools (optional but cleaner).

**Estimate**: 1.5 hours

---

### Task 4: Wire Together in Route

**File**: `app/api/turn/route.ts`

**Current**:
```typescript
const intent = await runRuneMarshal(playerAction, character, world);
// ... skill check logic ...
const orchestratorResult = await runOrchestrator(
  playerAction, character, world, recentTurns, ...
);
```

**New**:
```typescript
const intent = await runRuneMarshal(playerAction, character, world);
// ... skill check logic ...

// NEW: Get allowed tools based on action type
const allowedTools = getAllowedProposalTools(intent.actionType);

const orchestratorResult = await runOrchestrator(
  playerAction, character, world, recentTurns,
  allowedTools,  // Pass constrained tools
  ...
);
```

**Estimate**: 30 minutes

---

### Task 5: Handle Edge Cases

**Mixed Actions**: "I thank Lenna and head to the outpost"
- Option A: Classify as primary action type (interaction)
- Option B: Allow union of both action types' tools
- Option C: Split into two turns (complex)

**Recommendation**: Option A for MVP - classify by primary intent.

**Ambiguous Actions**: "I do something"
- Fallback to `observation` (safest, no proposals)
- Or ask for clarification via Chronicler

**No Tools Allowed**:
- If `allowedTools = []`, Orchestrator just returns empty proposals
- Chronicler still generates narration (conversation response)

**Estimate**: 1.5 hours

---

### Task 6: Testing

**Test Matrix**:

| Action | Expected Type | Expected Tools | Test |
|--------|---------------|----------------|------|
| "What should we do?" | conversation | [] | No proposals |
| "I go to Nomante" | travel | [location_change] | Only location |
| "Look around" | observation | [] | No proposals |
| "I thank Lenna" | interaction | [relationship_change] | Only relationship |
| "I attack the goblin" | combat | [stat_change, inventory_add] | Combat tools |
| "I accept the quest" | quest_action | [quest_*, relationship] | Quest tools |

**Estimate**: 2 hours

---

## Total Estimate

| Task | Estimate |
|------|----------|
| Pre-req: State sync fix | 1 hour |
| Task 1: Rune Marshal | 1 hour |
| Task 2: Constraint layer | 30 min |
| Task 3: Orchestrator refactor | 1.5 hours |
| Task 4: Route wiring | 30 min |
| Task 5: Edge cases | 1.5 hours |
| Task 6: Testing | 2 hours |
| **Total** | **8 hours** |

---

## Success Criteria

- [ ] "What should we do?" produces 0 proposals
- [ ] "I go to X" only produces location_change
- [ ] "I thank Lenna" only produces relationship_change
- [ ] Combat actions can produce stat_change and inventory_add
- [ ] No proposal type appears that wasn't in allowed list
- [ ] Chronicler still generates appropriate narration for all action types
- [ ] 20+ turns without invalid proposals

---

## Rollback Plan

If constrained orchestrator causes issues:
1. Revert to passing all tools (one line change)
2. Keep Arbiter validation as safety net
3. Investigate specific failures

The Arbiter remains as defense-in-depth, so even if constraints are wrong, invalid proposals still get caught.

---

## Future Enhancements

1. **DB-driven constraints**: Store action_type → tools mapping in database
2. **Context-aware constraints**: Location type affects allowed actions
3. **Quest-aware constraints**: Active quest goals expand allowed tools
4. **Learning**: Track which proposals get rejected, tune constraints

---

## Dependencies

- Rune Marshal must reliably classify action types
- If classification is wrong, wrong tools are allowed
- May need to tune/test Rune Marshal classification accuracy first
