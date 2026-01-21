# Agent Architecture Lessons Learned

## Date: 2026-01-14

This document captures issues discovered during development and testing, and lessons for building reliable agentic systems.

---

## Pre-Rules Engine Issues (Phase 4)

These issues were discovered BEFORE implementing the Rules Engine:

### 1. Chronicler Always Describing Location

**Symptom**: Every turn, Chronicler would describe the location even when player had been there for multiple turns.

**Root Cause**: 
- Atmosphere data was always included in prompt
- Conflicting instruction said "describe the CURRENT location fresh"

**Fix Applied**: 
- Only include atmosphere when `isNewLocation` is true
- Made SCENE CONTEXT instruction explicit about not describing location when player hasn't moved

---

### 2. Arbiter Retry Loop Wasting LLM Calls

**Symptom**: Arbiter retried 3 times for unfixable rejections like "Quest not active" or "Already at location".

**Root Cause**: Two competing retry mechanisms - one in `continueWithNarration` (for loop) and one in `completeTurnPipeline` (recursive). Neither checked if rejection was fixable.

**Fix Applied**: Smart retry logic - only retry for fixable rejections (capped values), not unfixable ones (invalid quest, wrong location).

---

### 3. Lorekeeper Running Multiple Times

**Symptom**: Lorekeeper ran on every retry attempt, wasting LLM calls.

**Root Cause**: Lorekeeper was inside the retry loop via `Promise.all`.

**Fix Applied**: Added `cachedLorekeeperResult` parameter - only run Lorekeeper on first attempt, reuse on retries.

---

### 4. Quest Validation Using Wrong Identifier

**Symptom**: Quest Agent reported quest as active, but Arbiter rejected quest progress as "not active".

**Root Cause**: Orchestrator proposed quest progress using quest **title** ("Welcome to Windhollow"), but Arbiter only checked against quest **UUIDs**.

**Fix Applied**: Added `activeQuestTitles` to Arbiter context, check both ID and title in validation.

---

### 5. Quest Progress Without Matching Action

**Symptom**: Orchestrator proposed quest progress just for chatting with NPC, even when quest goal was "Travel to Nomante Outpost" (exploration type).

**Root Cause**: LLM was being too eager, not checking if action matches current goal type.

**Discussion**: This led to the Rules Engine implementation - the realization that LLM behavior is non-deterministic and critical game rules need code enforcement.

---

## Post-Rules Engine Issues (Current)

### 1. State Synchronization Bug (Critical - Root Cause)

**Symptom**: Debug trace header showed `Location: Nomante Outpost` but agents received `The Waystone`.

**Evidence**:
```
## CONTEXT
Location: Nomante Outpost (Windhollow Vale)  ← UI shows this
Entities: Aran Nomante, Adrian, Helga

[ORCHESTRATOR] → Travel to: Nomante Outpost  ← Thinks player needs to travel there
[LOREKEEPER] Fetched context for The Waystone  ← Fetched wrong location!
[ARBITER] ✓ lenna +1  ← Approved NPC not present at Nomante Outpost
```

**Deep Dive - What's Happening**:

```
Timeline of a turn:

1. Turn N: Player at "The Waystone"
   - Player says "I travel to Nomante Outpost"
   - Backend loads world: poi = "The Waystone"
   - Orchestrator proposes location_change to "Nomante Outpost"
   - Arbiter approves
   - Apply State writes poi = "Nomante Outpost" to DB
   - Response sent to UI
   - UI updates its world state to "Nomante Outpost"

2. Turn N+1: Player asks "What should I do?"
   - UI shows "Nomante Outpost" (correct, updated from Turn N response)
   - UI generates debug header showing "Nomante Outpost"
   - Request sent to backend...
   
   HERE'S THE PROBLEM:
   - Backend loads world from DB
   - DB query returns... "The Waystone"? or "Nomante Outpost"?
   
   If DB returns "The Waystone":
   - All agents receive world.poi = "The Waystone"
   - Orchestrator thinks player is at Waystone, proposes travel to Nomante
   - Arbiter checks world.entities from Waystone (Lenna), approves lenna +1
   - Lorekeeper fetches context for Waystone
   - Everything is wrong because input was wrong
```

**Possible Causes** (Single-Player, Single DB):

1. **Race Condition - Fast Requests**: User types/clicks quickly
   ```
   Turn N: Apply State → DB.write(poi="Nomante")  [async, takes 50ms]
   Turn N+1: DB.read(poi) → returns "Waystone"    [request arrives at 30ms]
   ```
   Most likely cause - user sends next request before previous write completes.

2. **Transaction Not Committed**: Write is in a transaction that hasn't committed
   ```
   BEGIN TRANSACTION
     UPDATE world_state SET poi = 'Nomante'
     -- other operations...
   COMMIT  ← hasn't happened yet when next request reads
   ```

3. **Await Missing**: DB write not properly awaited before response sent
   ```typescript
   // Bug: not awaiting the write
   supabase.from("world_state").update({poi: "Nomante"});  // fire and forget!
   return response;  // sent before write completes
   
   // Correct:
   await supabase.from("world_state").update({poi: "Nomante"});
   return response;
   ```

4. **Write Happening After Response**: State applied but response sent first
   ```typescript
   // Bug: response sent before state persisted
   const response = buildResponse(turn);
   applyStateToDb(changes);  // happens after response sent
   return response;
   ```

**Note**: Replication lag and caching are NOT factors here - single player, single Supabase DB, no replicas configured.

**Why Debug Header Shows Different Data**:

```
Debug Header Generation:
  - Generated CLIENT-SIDE in TurnTrace.tsx
  - Uses UI's `world` state prop
  - UI state was updated from Turn N response
  - Shows: "Nomante Outpost" ✓

Agent Execution:
  - Happens SERVER-SIDE in route.ts
  - Loads `world` fresh from DB at request start
  - DB returned stale data
  - Agents receive: "The Waystone" ✗

Result: Debug shows X, agents received Y
```

**Why This Breaks Everything**:

```
With stale world state, ALL validation is wrong:

1. Location validation:
   - world.poi = "The Waystone" (stale)
   - world.nearbyPoi = ["Nomante Outpost", "Wilderness"]
   - Player says "what should I do?"
   - Orchestrator proposes travel to Nomante (thinks player isn't there)
   - Arbiter checks: is "Nomante Outpost" in nearbyPoi? YES → approved
   - But player IS already at Nomante!

2. NPC validation:
   - world.entities = ["Lenna"] (stale, from Waystone)
   - Orchestrator proposes lenna +1
   - Arbiter checks: is "Lenna" in world.entities? YES → approved
   - But Lenna is NOT at Nomante Outpost!

3. Lorekeeper context:
   - Fetches NPCs for world.poi = "The Waystone"
   - Returns Lenna's voice data
   - Chronicler writes dialogue for Lenna
   - But Lenna isn't there!
```

**Verification Steps**:

To confirm this is the issue, we need to:

1. **Check DB state directly**:
   ```sql
   SELECT poi, entities, updated_at 
   FROM waypoint_world_state 
   WHERE character_id = 'xxx';
   ```

2. **Add server-side logging**:
   ```typescript
   console.log('Loaded world state:', {
     poi: world.poi,
     entities: world.entities,
     loadedAt: new Date().toISOString()
   });
   ```

3. **Include input snapshot in response**:
   ```typescript
   return {
     turn: {...},
     _debug: {
       serverReceivedWorld: {
         poi: world.poi,
         entities: world.entities
       }
     }
   };
   ```

**Solution Options** (Single-Player Context):

1. **Client-Side Debouncing** (simplest):
   ```typescript
   // Prevent sending new turn until previous completes
   const [isProcessing, setIsProcessing] = useState(false);
   
   const submitTurn = async (action) => {
     if (isProcessing) return;
     setIsProcessing(true);
     try {
       await sendTurn(action);
     } finally {
       setIsProcessing(false);
     }
   };
   ```

2. **Ensure Writes Are Awaited**:
   ```typescript
   // Audit all DB writes to ensure they're awaited
   await supabase.from("waypoint_world_state").update({...});
   // Only THEN send response
   return NextResponse.json({...});
   ```

3. **Server-Side Request Lock** (if client debouncing isn't enough):
   ```typescript
   // Simple in-memory lock per character
   const activeTurns = new Map<string, Promise<any>>();
   
   if (activeTurns.has(characterId)) {
     await activeTurns.get(characterId);  // wait for previous
   }
   const turnPromise = processTurn(...);
   activeTurns.set(characterId, turnPromise);
   ```

4. **Include Server State in Debug** (for diagnosis):
   ```typescript
   return {
     turn: {...},
     _debug: {
       serverLoadedWorld: { poi: world.poi, entities: world.entities }
     }
   };
   ```

**For Multiplayer (Future)**: Would need optimistic locking, version vectors, or event sourcing. But that's out of scope for MVP.

---

### 2. LLM Ignoring Explicit Prompt Instructions (Critical)

**Symptom**: Despite explicit instructions saying "What should we do?" = NO proposals, Orchestrator kept proposing:
- Relationship changes for simple questions
- Location changes when already at destination  
- Quest progress for non-existent quests

**Evidence**:
```
Player: "What should we do today?"
Orchestrator: propose_relationship_change(lenna, -1), propose_quest_progress("Awaken", 1)
```

The prompt explicitly said:
```
- Asking questions like "What should we do?" / "What's next?" → NO proposals
- If "Active Quests" shows "No active quests", do NOT propose any quest_progress
```

**Root Cause**: LLMs are probabilistic and don't reliably follow instructions, especially negative constraints ("do NOT").

**Lesson**: 
- Prompt engineering is NOT sufficient for critical game rules
- Code-level validation must be the primary enforcement mechanism
- LLM should be treated as "unreliable proposer" - assume it will make mistakes

---

### 3. Validation Checking Wrong Things (Critical)

**Symptom**: Arbiter approved `lenna +1` when Lenna was NOT present at the location.

**Evidence**:
```
Entities: Aran Nomante, Adrian, Helga  ← Lenna not here
[ARBITER] ✓ lenna +1  ← But this was approved!
```

**Root Cause**: The validation code checks `world.entities` but received stale `world` data where Lenna WAS present (at The Waystone).

**Lesson**: Validation is only as good as its input data. Garbage in = garbage out.

---

### 4. Multiple Conflicting Proposals (Fixed)

**Symptom**: Orchestrator proposed TWO location changes in one turn, both approved.

**Evidence**:
```
[ORCHESTRATOR] Generated 2 proposal(s)
    - → Travel to: Nomante Outpost
    - → Travel to: Windhollow Wilderness
[ARBITER] Validated all 2 proposal(s)
    - ✓ Travel to: Nomante Outpost
    - ✓ Travel to: Windhollow Wilderness
```

**Root Cause**: Validation checked each proposal independently, not for conflicts.

**Fix Applied**: Added `validateNoConflictingProposals()` to reject duplicate location changes.

**Lesson**: Validate proposals as a SET, not just individually.

---

### 5. Delta=0 Proposals (Fixed)

**Symptom**: Orchestrator proposed relationship change with delta=0 (no-op).

**Evidence**:
```
[ORCHESTRATOR] → lenna 0
[ARBITER] ✓ lenna 0
```

**Fix Applied**: Added rejection for delta=0 in relationship validation.

**Lesson**: Validate that proposals represent actual changes, not no-ops.

---

### 6. Chronicler Lacking Narrative Context

**Symptom**: Chronicler re-introduced Lenna as if meeting for first time, even though player had been talking to her.

**Evidence**:
```
Turn 1: Player asks "What should we do?"
Turn 2: Player asks about Lenna's favorite food
Chronicler: "You turn your attention to Lenna, the scholar who has been diligently studying..."
```

**Root Cause**: `formatRecentTurns()` only showed player actions, not narration. Chronicler had no context of previous conversation flow.

**Fix Applied**: Include full narration in recent turns context.

**Lesson**: Narrative agents need full conversation history, not just action summaries.

---

## Architectural Lessons

### 1. Trust Hierarchy

```
MOST TRUSTED (deterministic)
    ↓
Database State (source of truth)
    ↓
Code Validation (enforces rules)
    ↓
LLM Proposals (suggestions only)
    ↓
LEAST TRUSTED (probabilistic)
```

**Principle**: Never trust LLM output without code validation. The LLM is a creative proposer, not a rule enforcer.

---

### 2. Data Flow Must Be Traceable

Every agent should log:
1. **Input received** - exact data, not references
2. **Decision made** - what and why
3. **Output produced** - exact proposals/results

Debug traces should show what agents ACTUALLY received, not what the UI thinks they received.

---

### 3. Validation Layers

```
Layer 1: Input Validation
  - Is the world state fresh?
  - Are entities actually present?
  - Is the data internally consistent?

Layer 2: Proposal Validation (individual)
  - Is delta non-zero?
  - Is NPC present?
  - Is location valid?
  - Is quest active?

Layer 3: Proposal Validation (set)
  - No conflicting proposals (multiple locations)
  - No redundant proposals (same NPC twice)
  - Proposals are coherent together

Layer 4: Context Validation
  - Does action match proposal type?
  - Is this a conversational action? (reject state changes)
  - Does proposal make narrative sense?
```

---

### 4. Negative Constraints Don't Work in Prompts

LLMs struggle with "do NOT" instructions. Instead:

**Bad**: "Do NOT propose relationship changes for questions"
**Good**: Code that rejects relationship changes when action matches question patterns

**Bad**: "NEVER propose multiple location changes"  
**Good**: Code that keeps only first location change, rejects rest

---

### 5. State Must Be Loaded Fresh

The `world` variable loaded at request start becomes stale if:
- Previous request's writes haven't propagated
- There's any caching layer
- Client sends requests faster than DB writes complete

**Solution Options**:
1. Re-load state after Apply State, before Chronicler
2. Include state snapshot in debug trace
3. Add request sequencing/locking per character

---

### 6. Debug Traces Must Be Server-Generated

Current problem: Debug header generated client-side shows different state than server received.

**Solution**: Server should include full context snapshot in response:
```typescript
response: {
  turn: {...},
  debug: {
    inputContext: {
      location: "The Waystone",  // What server actually loaded
      entities: ["Lenna"],
      // ...
    },
    agentInputs: {
      orchestrator: {...},
      arbiter: {...},
      lorekeeper: {...},
    }
  }
}
```

---

## Recommended Architecture Changes

### Short-term Fixes

1. [ ] Server includes `inputContext` in response for accurate debug traces
2. [ ] Add "conversational action" detection in Arbiter (code-level)
3. [ ] Validate proposal set for conflicts before individual validation
4. [ ] Log exact `world` state received by each agent

### Medium-term Improvements

1. [ ] Request sequencing per character (prevent race conditions)
2. [ ] State version/timestamp to detect stale reads
3. [ ] Separate "proposal generation" from "proposal validation" more clearly
4. [ ] Add integration tests that verify state consistency

### Long-term Architecture

1. [ ] Event sourcing for state changes (append-only log)
2. [ ] Optimistic locking on world state
3. [ ] Agent input/output schemas with runtime validation
4. [ ] Replay capability for debugging (re-run turn with same inputs)

---

## Testing Checklist (Updated)

Before any turn is considered valid:

### State Consistency
- [ ] World state loaded matches expected location
- [ ] Entities present match location's NPCs
- [ ] Active quests match database

### Proposal Validation
- [ ] No delta=0 proposals
- [ ] No conflicting proposals (multiple locations)
- [ ] NPCs in proposals are present at location
- [ ] Quests in proposals are active
- [ ] Locations in proposals are valid destinations

### Context Validation  
- [ ] Conversational actions produce no state changes
- [ ] Observation actions produce no inventory changes
- [ ] Travel actions only when player explicitly requests

### Narrative Consistency
- [ ] Chronicler has full conversation history
- [ ] NPCs not re-introduced if already met
- [ ] Location not re-described if player hasn't moved

---

## Key Takeaway

> **"LLM proposes, code disposes"** is not just a principle - it's a survival strategy.
> 
> The LLM will make mistakes. The code must catch them. Every time.
> 
> If a rule is important, it MUST be enforced in code, not just prompted.
