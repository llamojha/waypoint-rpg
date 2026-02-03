# Waypoint RPG — Gemini 3 Hackathon Write-up

## What is Waypoint?

Waypoint is an AI-powered tabletop RPG where Gemini 3 acts as a true Dungeon Master — not a chatbot pretending to be one. Players explore a persistent fantasy world with real game state, deterministic mechanics, and narrative continuity that competitors cannot match.

## Gemini 3 Integration

Waypoint uses a **hub-and-spoke agent architecture** with 6 specialized Gemini 3 agents:

| Agent | Role | Gemini 3 Feature |
|-------|------|------------------|
| **Orchestrator** | Intent detection, event proposals | Tool calling (15+ functions) |
| **Lorekeeper** | Canon retrieval, world knowledge | Tool calling + context injection |
| **Arbiter** | Validation (code layer) | — |
| **Chronicler** | Narrative generation | Streaming + temperature 0.8 |
| **Rune Marshal** | Skill check detection | Tool calling |
| **Content Sentinel** | Safety filtering | — |

### Key Gemini 3 Features Used

1. **Tool Calling** — Schema-enforced structured outputs via `FunctionDeclaration`. Agents output proposals like `propose_stat_change`, `propose_relationship_change`, eliminating JSON parsing failures.

2. **Temperature Control** — Mechanical agents (Orchestrator, Rune Marshal) use 0.1 for deterministic decisions. Creative agents (Chronicler) use 0.8 for vivid narration.

3. **1M Token Context Window** — Full conversation history retained. No summarization, no forgetting. This is our competitive advantage over AI RPGs that limit context to 5-8 messages.

4. **Streaming (SSE)** — Chronicler streams narration chunks for responsive storytelling.

### Hybrid Architecture: "LLM Proposes, Code Disposes"

Gemini 3 handles judgment and creativity. Deterministic code handles mechanics:

- **Gemini decides**: What skill check to trigger, what events to propose, how to narrate
- **Code executes**: Dice rolls, modifier calculation, validation, state persistence

This separation ensures game state integrity while leveraging Gemini 3's reasoning capabilities.

## Why Gemini 3 is Central

Without Gemini 3's tool calling, our multi-agent architecture wouldn't work. Without the 1M context window, we'd lose narrative continuity. Waypoint isn't an app with AI features — it's an AI-native game where Gemini 3 is the core engine.
