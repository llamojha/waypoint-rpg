# Spec: Skill Checks & Mechanics (with Tool Calling)

## Status: ✅ COMPLETE

## Overview

Implement mechanics detection using Gemini tool calling for reliable, typed intent parsing. Uses dedicated low-temperature LLM call with function declarations for power word detection, skill check determination, and roll resolution.

## Estimate

5-7 hours

## Dependencies

- 2.1 gemini-client (tool calling infrastructure)
- 1.2 authentication

## Outputs

- `detect_intent` tool for mechanics parsing
- Power word detection against SKILL_TREE
- Skill check determination (when to roll)
- DC calculation based on context
- Modifier calculation (skill level + power word bonus)
- Roll button resolves checks server-side

## Key Files

- `lib/mechanics/tools.ts` (new - tool declarations)
- `lib/mechanics/detect.ts` (uses tool calling)
- `lib/mechanics/checks.ts`
- `lib/mechanics/modifiers.ts`
- `app/api/turn/route.ts` (updated)
- `components/CenterColumn.tsx` (roll integration)

## Tool Calling Implementation

Uses the `@google/genai` SDK (migrated in 2.1):

```typescript
import { FunctionDeclaration, Type } from "@google/genai";
import { SKILL_NAMES } from "@/constants";

export const detectIntentTool: FunctionDeclaration = {
  name: "detect_intent",
  description: "Analyze player action to determine skill check requirements",
  parameters: {
    type: Type.OBJECT,
    properties: {
      primary_skill: {
        type: Type.STRING,
        enum: SKILL_NAMES,
        description: "The main skill being used",
      },
      power_words: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Power words detected in the action",
      },
      tier: {
        type: Type.NUMBER,
        enum: [1, 2, 3],
        description: "Power word tier (1=basic, 2=advanced, 3=master)",
      },
      bonus: {
        type: Type.NUMBER,
        description: "Total bonus from power words (+1/+2/+3)",
      },
      requires_roll: {
        type: Type.BOOLEAN,
        description: "Whether this action requires a skill check",
      },
      dc: {
        type: Type.NUMBER,
        description: "Difficulty class if roll required (10-25)",
      },
      denial_reason: {
        type: Type.STRING,
        description: "If action is impossible, explain why",
      },
    },
    required: ["primary_skill", "requires_roll"],
  },
};
```

## Usage

```typescript
import { generateWithTools } from "@/lib/gemini/client";
import { detectIntentTool } from "@/lib/mechanics/tools";

interface DetectIntentResult {
  primary_skill: string;
  power_words: string[];
  tier: 1 | 2 | 3;
  bonus: number;
  requires_roll: boolean;
  dc?: number;
  denial_reason?: string;
}

const result = await generateWithTools<DetectIntentResult>(
  buildIntentPrompt(playerAction, character, context),
  [detectIntentTool],
  0.1 // Low temperature for consistent mechanics
);
```

## Benefits

- **No JSON parsing failures** — Gemini validates against schema
- **Type-safe responses** — TypeScript types match tool declaration
- **Consistent output** — Enum constraints prevent invalid skills
- **Better error handling** — Clear structure for denial reasons

## Acceptance Criteria

- [ ] `detect_intent` tool defined and working
- [ ] "I sneak past the guard" triggers Sneaking check via tool call
- [ ] Power words detected and bonus applied
- [ ] Roll button appears for checks
- [ ] Server-side roll determines outcome
- [ ] Outcome affects narration
- [ ] Tool call latency <500ms (low temp, structured output)

## 🎮 CHECKPOINT 2

After completing this spec:

- Skill checks with roll button
- Power word detection (+1/+2/+3 bonuses)
- DC and modifiers displayed
- Tool calling foundation for future agents
