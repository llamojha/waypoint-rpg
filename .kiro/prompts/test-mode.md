---
title: Test Mode
description: Run and evaluate Waypoint integration tests
---

# Waypoint Integration Test Mode

When the user asks to "run tests", "enter test mode", or "test the game", follow this guide to execute and evaluate integration tests.

## Quick Start

To run integration tests:

```bash
# Run deterministic tests (uses default test user)
npm run test:integration

# Run with Gemini QA validation
npm run test:integration -- --gemini-qa

# Override test user if needed
TEST_USER_ID="custom-uuid" npm run test:integration
```

## Test Scenarios

Reference: `docs/phase4-demo-testing.md` contains 12 test scenarios.

### Scenario 1: Look Around (Passive)
- **Action**: "I look around"
- **Expected**: No roll, no proposals, descriptive narration
- **Validate**: Sentinel passes, Rune Marshal says "routine action", 0 proposals

### Scenario 2: Skill Check
- **Action**: "I carefully check for traps"
- **Expected**: Roll required, DC 10-14, outcome affects narration
- **Validate**: Rune Marshal detects skill check, roll resolves, narration matches outcome

### Scenario 3: NPC Interaction
- **Action**: "I talk to Lenna about the waystone"
- **Expected**: No roll, may have relationship change
- **Validate**: Lorekeeper fetches NPC data, narration uses NPC voice

### Scenario 4: Location Change
- **Action**: "I walk to Nomante Outpost"
- **Expected**: No roll, location_change proposal
- **Validate**: Only location proposal allowed, world state updates

## Evaluating Test Results

When running tests in Kiro, evaluate the trace output:

### 1. Check Agent Flow
All these agents should appear in traces:
- `sentinel` - Input safety check
- `rune_marshal` - Intent detection
- `orchestrator` - Proposal generation
- `arbiter` - Validation
- `lorekeeper` - Context fetching
- `chronicler` - Narration generation

### 2. Check Trace Status
- ✓ `success` - Agent completed normally
- ✗ `error` - Agent failed (investigate)
- ○ `skipped` - Agent was skipped (may be expected)

### 3. Validate Proposals
For each action type, only certain proposals are allowed:
- `passive` → No proposals
- `conversation` → relationship_change only
- `travel` → location_change only
- `interaction` → relationship_change, stat_change
- `combat` → stat_change, inventory changes

### 4. Check Narration Quality
- Does it describe the action taken?
- Does it match the roll outcome (if any)?
- Is it appropriate tone (PG-13 fantasy)?
- Does it mention relevant NPCs/locations?

## Manual Test Execution

To manually test a specific scenario:

```typescript
import { resetJourney, executeTurn, validateTrace, SCENARIO_EXPECTATIONS } from "@/lib/testing";

// Reset to fresh state
const { characterId } = await resetJourney(testUserId);

// Execute turn
const result = await executeTurn(characterId, "I look around");

// Validate
const validation = validateTrace(result, SCENARIO_EXPECTATIONS.lookAround);
console.log(validation.passed ? "✅ PASS" : "❌ FAIL");
console.log(validation.failures);
```

## Debugging Failed Tests

If a test fails:

1. **Check the trace** - Which agent failed?
2. **Check proposals** - Were invalid proposals made?
3. **Check rejections** - Did Arbiter reject something?
4. **Check narration** - Is it empty or malformed?

Common issues:
- `Orchestrator proposals: expected max 0, got N` → Action type not constraining tools
- `Arbiter rejections: expected max 0, got N` → Invalid proposal made
- `Narration is empty` → Chronicler failed or was skipped
- `Rune Marshal trace not found` → Pipeline error before intent detection

## Adding New Test Scenarios

1. Add scenario to `docs/phase4-demo-testing.md`
2. Create expectations in `lib/testing/validate.ts`:
   ```typescript
   export const SCENARIO_EXPECTATIONS = {
     // ... existing
     newScenario: {
       sentinel: { status: "success" },
       runeMarshal: { requiresRoll: false, actionType: "passive" },
       orchestrator: { maxProposals: 0 },
       arbiter: { maxRejections: 0 },
       chronicler: { narrationMinLength: 50 },
     },
   };
   ```
3. Add test case to `lib/testing/__tests__/`
