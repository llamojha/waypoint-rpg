# Backend Infrastructure

## Stack

- **Runtime**: Node.js (Next.js API Routes)
- **Deployment**: Vercel (serverless functions)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (Magic Link + OAuth)
- **Storage**: Supabase Storage (images)
- **LLM**: Google Gemini (`gemini-2.5-flash-lite` or `gemini-2.0-flash-exp`)
- **Image Gen**: Gemini image generation for MVP

## Authentication

### Supabase Auth Setup

- Magic Link (email) — primary for MVP
- OAuth providers (Google, Discord) — configured in Supabase dashboard
- No passwords to manage

### Auth Flow

```
[Landing] → [Sign In Button]
                ↓
         [Magic Link / OAuth]
                ↓
         [Supabase handles redirect]
                ↓
         [Session established]
                ↓
         [Check for existing character]
                ↓
    ┌─────────────┴─────────────┐
    ↓                           ↓
[Has Character]           [No Character]
    ↓                           ↓
[Resume Game]            [Character Creation]
```

### Session Management

- Supabase handles JWT tokens
- Client uses `@supabase/supabase-js`
- Row Level Security (RLS) on all tables
- User can only access their own character data

### RLS Policies

```sql
-- Characters: users can only see/edit their own
CREATE POLICY "Users can view own characters"
  ON waypoint_characters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own characters"
  ON waypoint_characters FOR UPDATE
  USING (auth.uid() = user_id);

-- NPCs: everyone can read, only system can write
CREATE POLICY "Anyone can view NPCs"
  ON waypoint_npcs FOR SELECT
  TO authenticated
  USING (true);

-- World news: everyone can read
CREATE POLICY "Anyone can view world news"
  ON waypoint_world_news FOR SELECT
  TO authenticated
  USING (true);
```

## API Structure

```
/api
├── /auth
│   └── /callback     GET - OAuth callback handler
├── /turn             POST - Process player turn (Edge, SSE)
├── /character        GET/POST/PATCH - Character CRUD
├── /world            GET/PATCH - Current world state
├── /npcs             GET - NPC registry (with relationship for character)
├── /quests           GET - Quest state for character
├── /codex            GET - Codex entries
├── /news             GET - World news (unread first)
├── /news/read        POST - Mark news as read
├── /locations        GET - Discovered locations
└── /image
    └── /generate     POST - Queue image generation
```

## Database Schema (Supabase)

> **IMPORTANT**: All Waypoint tables use the `waypoint_` prefix (e.g., `waypoint_characters`, `waypoint_npcs`) to distinguish from other projects in the shared Supabase instance.

### Core Tables

```sql
-- Characters (per user) - SIMPLIFIED MODEL
CREATE TABLE waypoint_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name VARCHAR(30) NOT NULL,
  gender VARCHAR(20),              -- Optional, free-form
  portrait_url TEXT,
  hp INT DEFAULT 20,
  max_hp INT DEFAULT 20,
  gold INT DEFAULT 10,
  skills JSONB DEFAULT '{}',       -- All skills start at level 0
  equipment JSONB DEFAULT '{}',
  inventory JSONB DEFAULT '[]',
  conditions JSONB DEFAULT '[]',
  is_magic_unlocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTE: No stats, level, xp, description columns
-- "Overall level" is calculated as sum of skill levels in UI

-- Turns (per character)
CREATE TABLE waypoint_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES waypoint_characters(id) NOT NULL,
  player_action TEXT NOT NULL,
  narration TEXT,
  mechanics JSONB,
  diffs JSONB DEFAULT '[]',
  suggested_actions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- World state (per character)
CREATE TABLE waypoint_world_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES waypoint_characters(id) UNIQUE NOT NULL,
  region VARCHAR(100),
  poi VARCHAR(100),
  time_day INT DEFAULT 1,
  time_phase VARCHAR(20) DEFAULT 'Morning',
  weather VARCHAR(50),
  description TEXT,
  tags JSONB DEFAULT '[]',
  nearby_poi JSONB DEFAULT '[]',
  entities JSONB DEFAULT '[]',
  memories JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- NPCs (global, shared)
CREATE TABLE waypoint_npcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  role VARCHAR(100),
  location VARCHAR(100),
  personality JSONB DEFAULT '[]',
  dialogue_hints JSONB DEFAULT '[]',
  portrait_url TEXT,
  is_preseeded BOOLEAN DEFAULT FALSE,
  discovered_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player-NPC relationships (per character)
CREATE TABLE waypoint_character_npcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES waypoint_characters(id) NOT NULL,
  npc_id UUID REFERENCES waypoint_npcs(id) NOT NULL,
  relationship INT DEFAULT 0 CHECK (relationship >= -5 AND relationship <= 5),
  notes JSONB DEFAULT '[]',
  history JSONB DEFAULT '[]',
  UNIQUE(character_id, npc_id)
);

-- Quests (definitions, global)
CREATE TABLE waypoint_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  total_progress INT DEFAULT 1,
  leads JSONB DEFAULT '[]',
  is_preseeded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player quest progress (per character)
CREATE TABLE waypoint_character_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES waypoint_characters(id) NOT NULL,
  quest_id UUID REFERENCES waypoint_quests(id) NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
  progress INT DEFAULT 0,
  UNIQUE(character_id, quest_id)
);

-- Codex entries (global, shared)
CREATE TABLE waypoint_codex_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL,
  text TEXT,
  status VARCHAR(20) DEFAULT 'canon' CHECK (status IN ('canon', 'rumor')),
  tags JSONB DEFAULT '[]',
  image_url TEXT,
  discovered_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Locations (global, shared)
CREATE TABLE waypoint_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50),
  region VARCHAR(100),
  coordinates JSONB,
  description TEXT,
  art_url TEXT,
  is_preseeded BOOLEAN DEFAULT FALSE,
  discovered_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player location discovery (per character)
CREATE TABLE waypoint_character_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES waypoint_characters(id) NOT NULL,
  location_id UUID REFERENCES waypoint_locations(id) NOT NULL,
  status VARCHAR(20) DEFAULT 'known' CHECK (status IN ('visited', 'known', 'unknown', 'locked')),
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, location_id)
);

-- World news (global, shared)
CREATE TABLE waypoint_world_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  text TEXT,
  news_type VARCHAR(50),
  status VARCHAR(20) DEFAULT 'rumor' CHECK (status IN ('canon', 'rumor')),
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player news read status
CREATE TABLE waypoint_character_news_read (
  character_id UUID REFERENCES waypoint_characters(id) NOT NULL,
  news_id UUID REFERENCES waypoint_world_news(id) NOT NULL,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (character_id, news_id)
);

-- Sessions (per character)
CREATE TABLE waypoint_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES waypoint_characters(id) NOT NULL,
  title VARCHAR(200),
  location VARCHAR(100),
  summary TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);
```

### Indexes

```sql
CREATE INDEX idx_waypoint_turns_character ON waypoint_turns(character_id);
CREATE INDEX idx_waypoint_character_npcs_character ON waypoint_character_npcs(character_id);
CREATE INDEX idx_waypoint_character_quests_character ON waypoint_character_quests(character_id);
CREATE INDEX idx_waypoint_world_news_created ON waypoint_world_news(created_at DESC);
CREATE INDEX idx_waypoint_npcs_location ON waypoint_npcs(location);
CREATE INDEX idx_waypoint_locations_region ON waypoint_locations(region);
```

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# LLM
NEXT_PUBLIC_GEMINI_API_KEY=
```

## Vercel Configuration

- Streaming responses via Edge Functions for SSE
- Standard serverless for CRUD operations
- Environment variables in Vercel dashboard

## SSE Streaming (Vercel Edge)

```typescript
// api/turn.ts
export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Stream narration chunks
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`)
      );
      // Final event with diffs
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ complete: true, diffs })}\n\n`)
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
}
```
