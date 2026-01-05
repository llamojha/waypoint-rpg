# Spec: Gemini Client & Tool Calling

## Status: 📋 TODO

## Overview

Add tool calling (function calling) support to the Gemini client. The SDK migration to `@google/genai` is already complete — this spec focuses on adding the tool calling infrastructure.

## Estimate

3-4 hours

## Dependencies

- 1.6 single-llm-turn

## What's Already Done

- ✅ Migrated from `@google/generative-ai` to `@google/genai` SDK
- ✅ `generateTurn()` function working with JSON mode
- ✅ Retry logic (2 attempts)
- ✅ Fallback response handling

## Outputs

- Tool calling infrastructure (`generateWithTools()` function)
- Tool declaration types and helpers
- Token counting utilities
- Temperature configuration per call type

## Key Files

- `lib/gemini/client.ts` (add tool calling)
- `lib/gemini/tools.ts` (new - tool/function declarations)
- `lib/gemini/tokens.ts` (new)

## Tool Calling Implementation

Add a new function for tool-based generation:

```typescript
import {
  GoogleGenAI,
  FunctionCallingConfigMode,
  FunctionDeclaration,
} from "@google/genai";

/**
 * Generate content using tool calling for structured outputs
 * @param prompt - The prompt to send
 * @param tools - Array of function declarations
 * @param temperature - Generation temperature (default 0.1 for consistency)
 * @returns The function call arguments, typed as T
 */
export async function generateWithTools<T>(
  prompt: string,
  tools: FunctionDeclaration[],
  temperature: number = 0.1
): Promise<T> {
  const modelName = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      tools: [{ functionDeclarations: tools }],
      toolConfig: {
        functionCallingConfig: { mode: FunctionCallingConfigMode.ANY },
      },
      temperature,
    },
  });

  if (response.functionCalls && response.functionCalls.length > 0) {
    return response.functionCalls[0].args as T;
  }

  throw new Error("No function call in response");
}
```

## Tool Declaration Helper

```typescript
// lib/gemini/tools.ts
import { FunctionDeclaration, Type } from "@google/genai";

// Re-export Type for convenience
export { Type } from "@google/genai";

// Helper to create tool declarations with proper typing
export function createTool(
  name: string,
  description: string,
  parameters: FunctionDeclaration["parameters"]
): FunctionDeclaration {
  return { name, description, parameters };
}
```

## Acceptance Criteria

- [ ] `generateWithTools<T>()` function added to client
- [ ] Tool declaration types exported from `lib/gemini/tools.ts`
- [ ] Retry logic for tool calls (same as generateTurn)
- [ ] Token counting utilities in `lib/gemini/tokens.ts`
- [ ] Different temperatures configurable per use case
- [ ] Error handling for missing function calls
