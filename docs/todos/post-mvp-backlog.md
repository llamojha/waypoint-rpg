---
inclusion: manual
---

# Post-MVP Backlog

Features and improvements to implement after MVP is stable and demo-ready.

## Priority 1: Conversation Compression

**Status:** Planned for MVP+1
**Spec:** See `llm-integration.md` → "Conversation Compression System"

Location-based and turn-threshold compression to reduce token usage by 50-77%.

---

## Priority 2: Player-Driven Quest Generation

**Status:** Deferred (recorded from content-generator planning)

Runtime quest generation triggered by player actions, using existing world entities.

### Triggers
- **Explicit request** - Player types "I want to find work" or "Any jobs around here?"
- **NPC interaction** - When relationship with NPC reaches threshold, they offer quests
- **Location-based** - Entering certain locations reveals available quests

### Approval Workflow
- Generated quests enter as "rumor" status
- Become "canon" after validation/completion
- Admin review queue for edge cases

### Implementation Notes
- Reuse content-generator templates for schema enforcement
- Context-aware: reference existing NPCs, locations, lore
- Interconnected: quests involve existing entities

---

## Priority 3: Telemetry & Analytics

**Status:** Blocked (PostHog project limit)
**Unblock:** After MVP, when dedicated PostHog project available

### PostHog Integration

Track gameplay metrics for balancing and optimization:

**Events to Track:**

| Event                     | Properties                                   | Purpose                 |
| ------------------------- | -------------------------------------------- | ----------------------- |
| `turn_completed`          | `turn_count`, `location`, `had_skill_check`  | Session length analysis |
| `skill_check`             | `skill`, `dc`, `outcome`, `power_words_used` | Balance tuning          |
| `character_created`       | `description_length`, `portrait_generated`   | Onboarding funnel       |
| `quest_started`           | `quest_id`, `source` (rumor/npc/discovery)   | Content engagement      |
| `quest_completed`         | `quest_id`, `turns_to_complete`              | Pacing analysis         |
| `npc_relationship_change` | `npc_id`, `delta`, `new_value`               | Social system health    |
| `item_equipped`           | `item_type`, `slot`, `rarity`                | Economy balance         |
| `session_start`           | `returning_user`, `character_level`          | Retention               |
| `session_end`             | `duration_minutes`, `turns_played`           | Engagement              |
| `error_occurred`          | `error_type`, `context`                      | Debugging               |

**LLM Cost Tracking:**

| Metric                  | Purpose                                                         |
| ----------------------- | --------------------------------------------------------------- |
| `llm_call`              | `model`, `input_tokens`, `output_tokens`, `latency_ms`, `agent` |
| `compression_triggered` | `trigger_type`, `turns_compressed`, `tokens_saved`              |
| `validation_retry`      | `reason`, `attempt_number`                                      |

**Implementation Notes:**

```typescript
// Future: lib/analytics.ts
import posthog from "posthog-js";

export const trackTurn = (props: TurnEventProps) => {
  posthog.capture("turn_completed", props);
};

export const trackLLMCall = (props: LLMCallProps) => {
  posthog.capture("llm_call", {
    ...props,
    // Calculate cost estimate
    estimated_cost_usd: calculateGeminiCost(
      props.input_tokens,
      props.output_tokens
    ),
  });
};
```

**Environment Setup:**

```env
# Future: add to .env.local
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

---

## Priority 3: Image Generation

**Status:** Deferred to post-MVP
**Spec:** See `image-generation.md`

Character portraits, NPC portraits, location art via Replicate API.

---

## Priority 4: Full Agent Pipeline (Tool Calling)

**Status:** Deferred (using simplified single-LLM approach for MVP)

Implement complete 6-agent architecture using tool calling throughout:

- Lorekeeper (codex queries via `query_codex` tool)
- Rune Marshal (intent detection via `detect_intent` tool) — **Foundation built in 2.2**
- Orchestrator (event proposals via `propose_*` tools)
- World Arbiter (validation via `validate_event` tool)
- Chronicler (narration via JSON mode — prose doesn't need tools)
- Content Sentinel (safety via deterministic filtering)

See `agent-system.md` for full spec.

**Note:** Tool calling foundation is established in Phase 2 (specs 2.1 and 2.2). The deferred agents (2.5-2.7) will follow the same pattern.

---

## Priority 5: Living World Features

**Status:** Post-MVP exploration

- Time-based world events
- NPC movements between locations
- Consequences between sessions
- Async multiplayer effects

See `mvp-scope.md` → "Post-MVP Considerations"

---

## Parking Lot (No Timeline)

Ideas captured but not prioritized:

- Voice input/output
- Mobile native apps
- Community marketplace for quests
- Vector memory for long-term NPC relationships
- Multiplayer co-op sessions
- Custom world creation tools
- Achievement system
- Leaderboards (quest completion speed, etc.)

---

## Priority 4: Content Generator Enhancements

**Status:** Deferred (post-MVP)
**Depends on:** Content Generator Agent (implemented)

Enhancements to the content-generator Kiro agent for richer world building.

### Enemy/Bestiary Generation
- Generate enemy stat blocks matching `bestiary.md` schema
- Include HP, damage dice, defense, XP, behavior patterns
- Loot tables with rarity tiers
- Tie enemies to locations (spawn tables)

### Item Generation
- Generate weapons, armor, consumables matching `Item` type
- Respect rarity bounds from `ITEM_BOUNDS` in steering docs
- Shop inventory generation for merchant NPCs
- Quest reward item generation

### Batch Generation
- "Generate 5 NPCs for this tavern" workflow
- Bulk location generation for new regions
- Quest chains with multiple connected quests

### Content Discovery Commands
- Quick queries: "show all NPCs in Ash Coast"
- Relationship mapping: "who knows who"
- Location graph: "what's near the docks"

### Relationship Pre-seeding
- Option to set initial NPC-to-NPC relationships
- Faction membership tracking
- Rivalry/alliance networks
