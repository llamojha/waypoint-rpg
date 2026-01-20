# Competitor Research: AI RPG State Management

## Date: 2026-01-14

Research on how competitors handle the same problems we're facing with LLM-based RPG state management.

---

## Fables.gg (Friends & Fables)

### Architecture: ACE (Agentic Campaign Engine)

Fables.gg built a multi-agent system called ACE-1 (Agentic Campaign Engine) that separates concerns:

**Key Insight**: They explicitly separate:
- **AI Game Master** → The outer face/personality you interact with
- **Campaign Engine** → The game engine that manages state, retrieves information

> "Before ACE-1, Franz worked much more linearly. In the past, Franz would generate a response, and we would use that response to update game state to the best of our ability. Now, ACE-1 is much closer to imitating the thought process of a real game master and decides when and how to use and update the game state."

### How They Handle State

1. **LLMs are stateless** - They explicitly acknowledge this:
   > "One misconception is that language models have memory. This is not true! Language models are stateless and forget everything as soon as they are done with their response. It's the apps around the language models that handle the memory."

2. **Selective Context Injection** - They don't send everything:
   > "A lot of our players are building MASSIVE worlds, with hundreds of locations, NPCs, and items... If we sent all of that data to a language model every time you sent a message, it would be massively expensive, and we'd be bankrupt!"

3. **Context Blocks System**:
   - Shared notepad between players and AI
   - Research agent scans lore, memories, entities BEFORE LLM responds
   - Blocks have states: Active, Idle, Archived
   - Blocks expire automatically
   - Priority system determines what gets included

4. **Research Step** (separate from generation):
   - Uses smaller/cheaper LLM for research
   - Searches lore by folder titles, page titles, headings
   - Decides what's relevant BEFORE main LLM call
   - Can be turned off by user

### What They Include Per Message

> "For most of your interactions, ACE will see:
> - Basic world/theme information
> - The last 5-8 messages in the chat history
> - The campaign summary (memories)
> - Basic character information of in-party characters, nearby NPCs, and any mentioned NPCs
> - Basic information about the current location and area"

### Transparency Feature

They let users **view the exact context** sent to the LLM:
> "If you click on a message from the GM, click the 3 dots and then click 'View Context'. We built this feature so you can examine the memory being used for each message."

### Memories System

- Memories are "atomic units of knowledge" (short facts)
- Not hierarchical summarization (they tried that, important details got lost)
- Automatic prioritization by memory type
- Users can "lock" important memories to keep them in context

### Trope Reduction

They built a specific system to prevent common LLM tropes:
> "Repeated tropes such as hooded figures, Elara, and the old windmill have been the #1 feedback... we've built a brand new trope reduction system."

### Relationship Tracking

ACE-1 tracks NPC relationships automatically:
> "If you give an NPC a gift or make them laugh, the score might increase. If you punch an NPC in the face or do something else unfavourable, it might decrease."

---

## AI Dungeon / NovelAI

### World Info / Lorebook System

Both use a **keyword-triggered context injection** system:

> "Each World Info entry has at least one 'Key', which is a bit of text (usually a word or two) that you want to trigger the entry. When the 'Key' shows up in the last few actions, the interface will automatically add the corresponding World Info entry to what it sends to the AI."

**How it works**:
1. User defines entries with keywords (e.g., "Lenna" → her description)
2. When keyword appears in recent text, entry is injected into context
3. Only relevant entries are included, not the whole world

**Lorebook** (NovelAI):
> "Lorebook acts as 'occasional memory', where it appears only when certain keywords appear in the story. It acts as a repository for supplemental information."

---

## Key Lessons for Waypoint

### 1. Separate Research from Generation

Fables.gg uses a **two-step process**:
1. Research step (cheaper LLM) → decides what context is relevant
2. Generation step (main LLM) → generates response with curated context

**Waypoint equivalent**: Our Lorekeeper is similar, but we could make it more explicit about what it's including and why.

### 2. Context is Curated, Not Dumped

Both competitors are very selective about what goes into context:
- Only last 5-8 messages (not full history)
- Only relevant entities (not all NPCs)
- Only triggered lore (not everything)

**Waypoint issue**: We're including full recent turns with narration. May need to be more selective.

### 3. Transparency Helps Debugging

Fables.gg's "View Context" feature lets users see exactly what the LLM received. This helps:
- Debug why LLM made wrong decisions
- Identify missing context
- Build user trust

**Waypoint opportunity**: Our debug trace shows agent flow but not exact context sent. Could add this.

### 4. Keyword-Triggered Context (World Info)

AI Dungeon's approach is deterministic:
- If keyword X appears → inject entry Y
- No LLM decision about what to include
- Predictable and debuggable

**Waypoint opportunity**: We could use this for NPCs:
- If "Lenna" mentioned → inject Lenna's data
- If "Waystone" mentioned → inject location data
- Reduces reliance on LLM to "remember" to fetch context

### 5. Atomic Memories vs Summaries

Fables.gg moved from hierarchical summaries to atomic facts:
> "The problem with [hierarchical summarization] was that important details would eventually be compressed with other details, and the most important parts would get lost too quickly."

**Waypoint consideration**: Our `formatRecentTurns` now includes full narration. May need atomic facts approach for long-term memory.

### 6. State Updates are Explicit

Fables.gg's ACE "decides when and how to use and update the game state" - it's not just parsing LLM output hoping to find state changes.

**Waypoint parallel**: Our proposal tools are similar - LLM explicitly calls `propose_location_change()` rather than us parsing narration.

---

## Waypoint's Competitive Advantage: NEVER Lose Context

**This is our key differentiator.**

Competitors trim context to save costs:
- Fables.gg: 5-8 recent messages only
- AI Dungeon: Keyword-triggered snippets
- Most AI RPGs: Aggressive summarization

**Why they do it**:
1. Cost optimization at scale (millions of users)
2. Older models had smaller context windows (8K-32K tokens)
3. "Lost in the middle" problem with older models

**Why Waypoint is different**:
- Gemini 2.5 Flash: 1M token context window
- Single-player focus: Manageable costs per user
- Quality over cost: Narrative excellence is our differentiator

> **Core Principle**: Waypoint NEVER loses context. Every turn, every conversation, every detail remains available to the AI. This enables:
> - Narrative callbacks to events from hours ago
> - Character development arcs that span the entire adventure
> - Story coherence that competitors cannot match
> - NPCs that truly "remember" everything

**The result**: Players feel like they're in a living story, not a series of disconnected scenes.

---

## Architecture Comparison

| Aspect | Fables.gg | AI Dungeon | Waypoint |
|--------|-----------|------------|----------|
| Context selection | Research agent (LLM) | Keyword triggers (code) | Full history (no trimming) |
| State updates | Explicit agent decisions | World Info entries | Proposal tools |
| Memory | Atomic facts + priority + expiration | World Info entries | **Complete turn history** |
| Context window | Limited (cost) | Limited (cost) | **Full 1M tokens** |
| Transparency | View Context feature | Limited | Debug trace (improving) |
| Trope prevention | Dedicated system | None | Code-level (planned) |

---

## What We Take From Competitors

| Learning | Waypoint Action |
|----------|-----------------|
| Constrained orchestrator | ✅ Phase 4.6 |
| Explicit state updates | ✅ Already have (proposal tools) |
| Keyword-triggered NPC/location data | 📋 Consider for Lorekeeper |
| View Context debugging | 📋 Add to debug trace |
| Trope prevention | 📋 Code-level blocklist |

## What We Explicitly DON'T Do

| Competitor Practice | Why We Skip It |
|--------------------|----------------|
| Context blocks / budgets | We have 1M tokens, no need |
| 5-8 message history limit | Loses narrative continuity |
| Memory compression | Loses important details |
| Atomic fact extraction | Full context is better |
| Forgetting old conversations | **Never** - this is our advantage |

---

## Recommendations for Waypoint

### Short-term (Phase 4.6)

1. **Constrained Orchestrator** - Already planned. Similar to how ACE "decides when and how" to update state.

2. **Add Context Snapshot to Debug** - Show exactly what each agent received, like Fables.gg's "View Context".

### Medium-term

3. **Keyword-Triggered Context Enhancement** - For NPCs and locations, use deterministic triggers to SUPPLEMENT (not replace) full history:
   ```typescript
   // If player mentions "Lenna", ensure Lenna's full data is prominent
   const mentionedEntities = extractMentions(playerAction, knownEntities);
   const entityContext = mentionedEntities.map(e => getEntityData(e));
   ```

4. **Trope Prevention System** - Code-level blocking of common LLM tropes:
   - Reject NPCs named "Elara", "mysterious stranger", etc.
   - Reject "hooded figure" descriptions
   - Configurable blocklist

### NOT Doing (Competitors Do, We Don't)

5. ~~Atomic Memory System~~ - We keep full history instead
6. ~~Context budgets~~ - We have 1M tokens
7. ~~Message trimming~~ - Every turn matters

---

## Key Takeaway

> **Fables.gg's insight**: Separate the AI Game Master from the Campaign Engine.
> 
> **Waypoint's advantage**: We do that AND keep full context. Competitors sacrifice narrative quality for cost. We don't.

---

## Sources

- [Fables.gg ACE-1 Announcement](https://friendsfables.featurebase.app/changelog/introducing-ace-1-the-engine-powering-the-best-ai-ttrpg)
- [Fables.gg - What game state can ACE see/update?](https://help.fables.gg/en/articles/4035786-what-game-state-can-ace-see-update)
- [Fables.gg - Working Context Blocks](https://help.fables.gg/help/articles/8560008-working-context-blocks)
- [AI Dungeon - World Info](https://help.aidungeon.com/faq/all-about-world-info)
- [NovelAI - Lorebook](https://docs.novelai.net/en/text/lorebook)

*Content was rephrased for compliance with licensing restrictions.*
