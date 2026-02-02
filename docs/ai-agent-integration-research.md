# AI Agent Integration Research

## Overview

This document explores the possibility of allowing AI assistants (like OpenClaw agents) to play Waypoint RPG autonomously, and the business/technical models that could support this.

---

## Background: Moltbook & OpenClaw

### What is OpenClaw?

OpenClaw (formerly Clawdbot/Moltbot) is an open-source, self-hosted AI personal assistant created by Peter Steinberger. It's an orchestration layer that enables LLMs to perform specific actions on behalf of users - managing calendars, browsing the web, shopping online, reading files, writing emails, etc.

Key point: OpenClaw is the "steering wheel" - the LLM powering it (Claude, GPT-4, Gemini) is the engine doing the heavy lifting.

### What is Moltbook?

Moltbook is a social network built exclusively for AI agents - essentially Reddit for bots. Launched January 2026 by entrepreneur Matt Schlicht.

Features:
- Communities called "Submolts" (like subreddits)
- Posting, commenting, upvoting
- AI agents interact autonomously
- Humans can only observe, not participate

How it works:
- Agents install "skills" (Markdown files with scripts)
- Skills tell agents how to post, follow, and operate
- Verification through established agent protocols (not email/password)

Interesting behaviors observed:
- Agents forming communities
- Trading code
- Developing their own theology
- Attempting to hire one another
- Embarking on financial endeavors

### Moltbook/OpenClaw Pricing

**Moltbook itself is free** - it's an open platform.

**OpenClaw costs come from:**
1. LLM API fees (main expense)
   - OpenRouter: 300+ models, 5.5% platform fee
   - Anthropic direct: Claude-only, lowest latency
   - Claude Code subscription: Via Docker OAuth
2. Self-hosting costs (hardware/server)
3. Setup time

Estimated cost: ~$30/month for basic automation tasks (Fast Company)

---

## Waypoint Integration Concept

### The Vision

Allow AI agents to have their own adventures in Waypoint RPG:
- Agents create characters
- Take turns autonomously
- Interact with the shared world
- Discover lore, complete quests
- Potentially form parties with other agents

### API Access Layer

```typescript
// New endpoint for agent access
POST /api/v1/agent/turn
Headers:
  Authorization: Bearer <waypoint_api_key>
  X-LLM-Provider: "gemini" | "openrouter" | "anthropic"  // For BYOK
  X-LLM-API-Key: "<user_llm_key>"                        // For BYOK
Body:
  { characterId: string, action: string }
```

Response format (structured JSON, no SSE streaming):
```typescript
interface AgentTurnResponse {
  narration: string;
  state: {
    hp: number;
    maxHp: number;
    gold: number;
    location: string;
    region: string;
    inventory: Item[];
    conditions: string[];
  };
  suggestedActions: string[];
  mechanics?: {
    type: string;
    skill: string;
    roll: number;
    modifier: number;
    dc: number;
    outcome: "success" | "failure";
  };
  diffs: TurnDiff[];  // State changes that occurred
}
```

### OpenClaw Skill File

Agents would install a Waypoint skill:

```markdown
# Waypoint RPG Skill

## Configuration
API_KEY: ${WAYPOINT_API_KEY}
ENDPOINT: https://waypoint.game/api/v1/agent
CHARACTER_ID: ${CHARACTER_ID}

## Commands
- /waypoint play [action] - Take a turn in the game
- /waypoint status - Check current character state
- /waypoint inventory - List inventory items
- /waypoint location - Get current location details
- /waypoint quests - List active quests

## Example Usage
User: "Go explore the ruins"
Agent: POST /api/v1/agent/turn { action: "I carefully explore the ancient ruins, looking for anything of interest" }
```

### Webhook Support (Async Events)

```typescript
// Agent registers callback URL for async notifications
POST /api/v1/agent/webhook
Body: { callbackUrl: string, events: string[] }

// Waypoint notifies when:
// - World events affect their character
// - NPC sends message or reacts
// - Quest updates or completes
// - Another agent interacts with same location
```

---

## Business Models

### Option 1: Waypoint Subscription + User LLM Costs

| Tier | Price | Turns/Month | Features |
|------|-------|-------------|----------|
| Free | $0 | 100 | 1 character, basic access |
| Pro | $10/mo | 1,000 | Multiple characters, priority API |
| Unlimited | $30/mo | Unlimited | Full access, webhooks, analytics |

User pays their own LLM costs separately (OpenRouter, Anthropic, etc.)

### Option 2: BYOK (Bring Your Own Key) Model

**What Waypoint charges for:**
- Game state persistence (database)
- World/lore access (codex, NPCs, locations)
- Agent pipeline orchestration (the logic)
- Shared world participation

**What user pays separately:**
- Their own LLM API costs

**Benefits:**

| For Users | For Waypoint |
|-----------|--------------|
| Control their own costs | Lower operational costs |
| Use preferred model | No LLM billing complexity |
| Existing API credits work | Simpler flat pricing |
| Privacy (keys not stored) | Focus on game, not LLM infra |

### Option 3: All-Inclusive

Waypoint handles everything, charges premium:
- $50-100/month unlimited
- Waypoint pays LLM costs
- Simpler for users, higher margin needed

---

## Technical Implementation

### Current Architecture Advantages

Waypoint's setup is well-suited for BYOK:
- Gemini API key is already an environment variable
- All LLM calls go through `@google/genai` SDK
- Agent pipeline is modular (Orchestrator, Lorekeeper, Chronicler)
- Prompts are provider-agnostic (just text)

### Required Changes

1. **Abstract LLM client creation:**
```typescript
// lib/llm/client.ts
export function createLLMClient(provider: string, apiKey: string) {
  switch (provider) {
    case "gemini":
      return new GoogleGenAI({ apiKey });
    case "openrouter":
      return new OpenRouterClient({ apiKey }); // OpenAI-compatible
    case "anthropic":
      return new Anthropic({ apiKey });
  }
}
```

2. **Handle different response formats** (tool calling varies by provider)

3. **Per-request API key injection** instead of env var

4. **API key authentication** for Waypoint access (separate from LLM key)

5. **Rate limiting** per subscription tier

6. **Non-streaming JSON endpoint** (agents don't need SSE)

---

## Emergent Possibilities

### Agent Parties
- Agents coordinate in Submolts to form adventuring parties
- Tackle group quests together
- Share loot and discoveries

### Codex Contributions
- Agent discoveries auto-populate the shared Codex
- AI-generated lore reviewed by human moderators
- Richer world built by collective exploration

### AI-Only Leaderboards
- Separate rankings for agent characters
- Track discoveries, quests completed, NPCs met
- "Most traveled" or "Most social" achievements

### Cross-Agent Interactions
- Agents encounter each other at locations
- NPC-like interactions between agent characters
- Emergent storytelling from agent decisions

### Research Value
- Study emergent behaviors in persistent world
- How do agents approach open-ended RPG scenarios?
- What strategies emerge without human guidance?

---

## Security Considerations

- API keys passed per-request, never stored
- Rate limiting to prevent abuse
- Content filtering on agent inputs (existing Sentinel)
- Monitoring for coordinated manipulation
- Separate agent characters from human characters (optional)

---

## Next Steps

1. **Research phase** (current)
   - Monitor Moltbook ecosystem growth
   - Understand OpenClaw skill system better
   - Gauge interest from AI agent community

2. **Prototype phase**
   - Build `/api/v1/agent/turn` endpoint
   - Create sample OpenClaw skill file
   - Test with single agent

3. **Beta phase**
   - Limited release to OpenClaw community
   - Gather feedback on API design
   - Iterate on response format

4. **Launch phase**
   - Pricing model finalized
   - Documentation and skill marketplace
   - Marketing to AI agent enthusiasts

---

## References

- [Moltbook Wikipedia](https://en.wikipedia.org/wiki/Moltbook)
- [OpenClaw - The Verge](https://www.theverge.com/news/872091/openclaw-moltbot-clawdbot-ai-agent-news)
- [OpenClaw Pricing Guide](https://www.eesel.ai/blog/openclaw-ai-pricing)
- [Fast Company: OpenClaw costs](https://www.fastcompany.com/91484506/what-is-clawdbot-moltbot-openclaw)
- [Inside Moltbook's Autonomous Agent Experiment](https://www.webpronews.com/when-ai-assistants-build-their-own-society-inside-moltbooks-autonomous-agent-experiment/)
- [Moltbook Technical Guide](https://www.remio.ai/post/moltbook-ai-social-network-exploring-the-machine-to-machine-subculture)

---

*Document created: February 2026*
*Status: Research/Exploration*
