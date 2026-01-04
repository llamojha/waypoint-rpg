# Spec: Chronicler Streaming (SSE)

## Status: ✅ COMPLETE

## Overview

Add Server-Sent Events (SSE) streaming for narration so text appears progressively as Gemini generates it. This improves perceived latency and creates a more engaging "typewriter" effect.

## Estimate

4-6 hours

## Dependencies

- 2.2 skill-checks-mechanics (turn API structure)

## User Story

As a player, I want to see narration text appear word-by-word as it's generated, so the game feels more responsive and immersive.

## Outputs

- Streaming turn endpoint using Edge Runtime
- Gemini streaming integration
- Client-side SSE consumption with progressive text display
- Final event with diffs/metadata after narration complete

## Key Files

- `app/api/turn/stream/route.ts` (new - Edge streaming endpoint)
- `lib/gemini/stream.ts` (new - streaming generation)
- `App.tsx` (updated - SSE client logic)
- `components/CenterColumn.tsx` (updated - streaming text display)

## Technical Approach

### SSE Event Format

```
event: chunk
data: {"text": "You step into "}

event: chunk
data: {"text": "the shadows..."}

event: complete
data: {"diffs": [...], "suggestedActions": [...], "turnId": "..."}
```

### Edge Runtime (Vercel)

```typescript
// app/api/turn/stream/route.ts
export const runtime = "edge";

export async function POST(request: Request) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      // Stream narration chunks
      for await (const chunk of generateStream(...)) {
        controller.enqueue(
          encoder.encode(`event: chunk\ndata: ${JSON.stringify({ text: chunk })}\n\n`)
        );
      }
      // Final event with metadata
      controller.enqueue(
        encoder.encode(`event: complete\ndata: ${JSON.stringify({ diffs, suggestedActions, turnId })}\n\n`)
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
```

### Gemini Streaming

```typescript
// lib/gemini/stream.ts
export async function* generateTurnStream(prompt: string): AsyncGenerator<string> {
  const response = await ai.models.generateContentStream({
    model: modelName,
    contents: prompt,
    config: { temperature: 0.7 },
  });

  for await (const chunk of response) {
    const text = chunk.text;
    if (text) yield text;
  }
}
```

### Client SSE Consumption

```typescript
// In App.tsx processTurn()
const eventSource = new EventSource(`/api/turn/stream?...`);
// OR use fetch with ReadableStream for POST:

const response = await fetch("/api/turn/stream", {
  method: "POST",
  body: JSON.stringify({ characterId, playerAction }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const text = decoder.decode(value);
  // Parse SSE events and update narration progressively
}
```

## Implementation Tasks

### Task 1: Gemini Streaming Helper
Create `lib/gemini/stream.ts` with:
- `generateTurnStream()` - async generator yielding text chunks
- Handle JSON response parsing for proposed_events at end
- Error handling with fallback

### Task 2: Edge Streaming Endpoint
Create `app/api/turn/stream/route.ts`:
- Edge runtime for streaming support
- Load character/world state (use service role client)
- Call `generateTurnStream()` and pipe to SSE
- Parse final JSON for diffs/events
- Validate and apply events
- Send `complete` event with metadata

### Task 3: Client SSE Integration
Update `App.tsx`:
- New `processStreamingTurn()` function
- Use fetch + ReadableStream for POST with streaming
- Parse SSE events (`chunk` vs `complete`)
- Update turn narration progressively
- Handle abort/cancel

### Task 4: UI Streaming Display
Update `CenterColumn.tsx`:
- Show cursor/typing indicator while `isStreaming: true`
- Smooth text append without layout jumps
- Auto-scroll as text appears

## Acceptance Criteria

- [ ] Narration text appears progressively (not all at once)
- [ ] First text visible within 500ms of request
- [ ] `isStreaming: true` shows typing indicator
- [ ] Final diffs/suggestedActions applied after stream complete
- [ ] Cancel button aborts stream mid-generation
- [ ] Fallback to non-streaming on error
- [ ] Works with skill check flow (pending roll → roll → stream narration)

## Edge Cases

- **Network disconnect**: Detect and show error state
- **Gemini timeout**: 30s timeout, fallback response
- **Malformed chunks**: Skip invalid JSON, continue stream
- **Empty response**: Show fallback narration

## Non-Goals (Out of Scope)

- Streaming for intent detection (keep synchronous, low-latency)
- Streaming for validation (deterministic, fast)
- Character-by-character animation (chunk-level is sufficient)

## 🎮 CHECKPOINT 3 (partial)

After completing this spec:
- Streaming narration (text appears as it generates)
- Responsive feel (<500ms to first text)
- Still need 2.4 content-sentinel for full Checkpoint 3
