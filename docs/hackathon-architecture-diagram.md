# Waypoint Architecture Diagram Specification

This document specifies the visual architecture diagram for the Gemini 3 Hackathon submission.

## Diagram Overview

**Title**: "Hub-and-Spoke Agent Architecture with Gemini 3 Tool Calling"

**Style**: Clean, modern, dark theme (matches game UI). Use rounded rectangles, connecting arrows, and color coding.

## Color Scheme

| Element | Color | Hex |
|---------|-------|-----|
| Gemini 3 Agents (LLM) | Purple/Violet | `#8B5CF6` |
| Code Layer | Blue | `#3B82F6` |
| Data Flow Arrows | Gray | `#6B7280` |
| User/UI | Green | `#10B981` |
| Database | Orange | `#F59E0B` |

## Main Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              WAYPOINT AGENT PIPELINE                         │
│                         Gemini 3 Tool Calling Architecture                   │
└─────────────────────────────────────────────────────────────────────────────┘

                                    ┌─────────┐
                                    │  USER   │
                                    │  INPUT  │
                                    └────┬────┘
                                         │
                                         ▼
                              ┌──────────────────────┐
                              │   CONTENT SENTINEL   │  ← Code (safety filter)
                              │      (Code Layer)    │
                              └──────────┬───────────┘
                                         │
                                         ▼
                              ┌──────────────────────┐
                              │    RUNE MARSHAL      │  ← Gemini 3 (temp 0.1)
                              │   Intent Detection   │    Tool: detect_action_type
                              │      [GEMINI 3]      │
                              └──────────┬───────────┘
                                         │
                                         ▼
                              ┌──────────────────────┐
                              │     ORCHESTRATOR     │  ← Gemini 3 (temp 0.1)
                              │    (Central Hub)     │    15+ Tool Declarations
                              │      [GEMINI 3]      │
                              │                      │
                              │  Tools:              │
                              │  • detect_intent     │
                              │  • propose_stat_*    │
                              │  • propose_quest_*   │
                              │  • propose_npc_*     │
                              └──────────┬───────────┘
                                         │
                         ┌───────────────┼───────────────┐
                         │               │               │
                         ▼               ▼               ▼
              ┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
              │    LOREKEEPER   │ │   ARBITER   │ │  QUEST AGENT    │
              │  Canon Retrieval│ │ Validation  │ │ Quest Context   │
              │   [GEMINI 3]    │ │ (Code Layer)│ │   (Code Layer)  │
              │                 │ │             │ │                 │
              │ Tools:          │ │ Validates:  │ │ Provides:       │
              │ • query_codex   │ │ • HP bounds │ │ • Active quests │
              │ • get_npcs_at_* │ │ • Item caps │ │ • Quest hooks   │
              │ • get_location  │ │ • Relations │ │                 │
              └────────┬────────┘ └──────┬──────┘ └────────┬────────┘
                       │                 │                 │
                       └─────────────────┼─────────────────┘
                                         │
                                         ▼
                              ┌──────────────────────┐
                              │      COLLECTOR       │  ← Code (merges results)
                              │   Gathers approved   │
                              │   events + lore      │
                              └──────────┬───────────┘
                                         │
                                         ▼
                              ┌──────────────────────┐
                              │     APPLY STATE      │  ← Code (DB writes)
                              │   Persist changes    │
                              │   Return consequences│
                              └──────────┬───────────┘
                                         │
                                         ▼
                              ┌──────────────────────┐
                              │     CHRONICLER       │  ← Gemini 3 (temp 0.8)
                              │   Narrative Gen      │    Streaming SSE
                              │      [GEMINI 3]      │
                              │                      │
                              │ Tools:               │
                              │ • get_npc_voice      │
                              │ • get_atmosphere     │
                              └──────────┬───────────┘
                                         │
                                         ▼
                              ┌──────────────────────┐
                              │         UI           │
                              │   Streaming chunks   │
                              │   + State updates    │
                              └──────────────────────┘
```

## Tool Calling Detail Panel

Include a side panel showing example tool declarations:

```typescript
// Orchestrator Proposal Tools
{
  name: "propose_stat_change",
  parameters: {
    stat: "hp" | "gold",
    delta: number,
    reason: string
  }
}

{
  name: "propose_relationship_change",
  parameters: {
    npc: string,
    delta: number,  // -2 to +2
    reason: string
  }
}

// Lorekeeper Read Tools
{
  name: "query_codex",
  parameters: {
    query_type: "location" | "npc" | "item" | "lore",
    entity_refs: string[]
  }
}
```

## Hybrid Architecture Callout

Add a callout box explaining the core principle:

```
┌─────────────────────────────────────────────────────────┐
│  "LLM PROPOSES, CODE DISPOSES"                          │
│                                                         │
│  Gemini 3 handles:          Code handles:               │
│  • Intent detection         • Dice rolls (d20)          │
│  • Event proposals          • Modifier calculation      │
│  • Narrative generation     • Validation rules          │
│  • Context relevance        • State persistence         │
│                                                         │
│  Result: Creative AI + Deterministic game mechanics     │
└─────────────────────────────────────────────────────────┘
```

## Temperature Visualization

Show temperature settings per agent:

```
Agent Temperatures:
├── Rune Marshal     → 0.1 (deterministic)
├── Orchestrator     → 0.1 (deterministic)
├── Lorekeeper       → 0.1 (factual)
├── Chronicler       → 0.8 (creative)
└── Content Sentinel → N/A (code only)
```

## Data Flow Legend

```
─────►  Data flow
═════►  Gemini 3 tool call
- - -►  Context injection
```

## Recommended Tools for Creation

1. **Figma** — Best for clean, exportable diagrams
2. **Excalidraw** — Quick hand-drawn style
3. **Mermaid** — Code-based diagrams (for README)
4. **draw.io** — Free, feature-rich

## Export Requirements

- **Format**: PNG or SVG
- **Resolution**: Minimum 1920x1080 for video
- **Background**: Dark (#1a1a2e) or transparent
- **Font**: Inter or system sans-serif

## Simplified Version for Video

For the 3-minute video, use this condensed version:

```
User Input
    │
    ▼
┌─────────────┐
│ Rune Marshal│ ← Gemini 3: Intent detection
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Orchestrator│ ← Gemini 3: 15+ tool calls
└──────┬──────┘
       │
   ┌───┴───┐
   ▼       ▼
Arbiter  Lorekeeper  ← Parallel (Code + Gemini 3)
   │       │
   └───┬───┘
       ▼
┌─────────────┐
│ Chronicler  │ ← Gemini 3: Streaming narration
└──────┬──────┘
       │
       ▼
     UI
```
