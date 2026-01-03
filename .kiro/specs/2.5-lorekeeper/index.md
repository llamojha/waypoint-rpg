# Spec: Lorekeeper (with Tool Calling)

## Status: ⏸️ DEFERRED (Post-Demo)

## Overview

Implement the Lorekeeper agent using tool calling to query the codex and return relevant canon snippets for context enrichment.

## Estimate

4-6 hours

## Dependencies

- 2.4 content-sentinel
- Codex entries populated in database

## Outputs

- Lorekeeper agent queries codex_entries via tool
- Returns relevant snippets based on context
- Integrates with turn pipeline

## Key Files

- `lib/agents/lorekeeper.ts`
- `lib/agents/tools/lorekeeper-tools.ts` (tool declarations)
- `app/api/turn/route.ts` (integration)

## Tool Calling Approach

```typescript
export const queryCodexTool: FunctionDeclaration = {
  name: "query_codex",
  description: "Search the codex for relevant lore entries",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query_type: {
        type: Type.STRING,
        enum: ["location", "npc", "item", "history", "faction"],
      },
      entity_name: { type: Type.STRING },
      context_keywords: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
    required: ["query_type"],
  },
};
```

## Acceptance Criteria

- [ ] Tool declarations for codex queries
- [ ] Queries return relevant codex entries
- [ ] Snippets included in narration context
- [ ] Performance acceptable (<300ms)

## Notes

This spec is deferred until after the demo. Builds on tool calling foundation from 2.1/2.2.
