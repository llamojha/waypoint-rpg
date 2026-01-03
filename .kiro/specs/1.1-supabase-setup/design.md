# Design Document: Supabase Setup

## Overview

This design establishes the Supabase infrastructure for Waypoint RPG. The implementation uses SQL migrations executed via Supabase's migration system, with all schema definitions derived from the backend-infrastructure steering document.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Project                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   PostgreSQL    │  │   Auth (RLS)    │  │   Storage   │ │
│  │   Database      │  │   Policies      │  │   Bucket    │ │
│  └────────┬────────┘  └────────┬────────┘  └──────┬──────┘ │
│           │                    │                   │        │
│           └────────────────────┴───────────────────┘        │
│                              │                              │
│                    ┌─────────┴─────────┐                   │
│                    │  Supabase Client  │                   │
│                    └───────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   Next.js App     │
                    └───────────────────┘
```

## Components and Interfaces

### Migration Files

Migrations will be organized in `supabase/migrations/` directory:

```
supabase/
├── migrations/
│   ├── 001_create_characters.sql
│   ├── 002_create_turns.sql
│   ├── 003_create_world_state.sql
│   ├── 004_create_npcs.sql
│   ├── 005_create_quests.sql
│   ├── 006_create_codex.sql
│   ├── 007_create_locations.sql
│   ├── 008_create_news.sql
│   ├── 009_create_sessions.sql
│   ├── 010_create_indexes.sql
│   └── 011_create_rls_policies.sql
└── config.toml
```

### Supabase Client Interface

```typescript
// lib/supabase/client.ts (already exists)
import { createBrowserClient } from "@supabase/ssr";

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

// lib/supabase/server.ts (already exists)
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const createClient = () => {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        /* cookie handlers */
      },
    }
  );
};
```

## Data Models

> **IMPORTANT**: All Waypoint tables use the `waypoint_` prefix (e.g., `waypoint_characters`, `waypoint_npcs`) to distinguish from other projects in the shared Supabase instance.

### Entity Relationship Diagram

```
┌──────────────┐       ┌───────────────────┐       ┌───────────────┐
│  auth.users  │       │waypoint_characters│       │ waypoint_turns│
│──────────────│       │───────────────────│       │───────────────│
│ id (PK)      │◄──────│ user_id (FK)      │◄──────│ character_id  │
└──────────────┘       │ id (PK)           │       └───────────────┘
                       └─────────┬─────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
┌────────────────────┐  ┌────────────────────────┐  ┌─────────────────────────┐
│waypoint_world_state│  │waypoint_character_npcs │  │waypoint_character_quests│
│────────────────────│  │────────────────────────│  │─────────────────────────│
│ character_id       │  │ character_id           │  │ character_id            │
│ (FK, UNIQUE)       │  │ npc_id (FK)            │  │ quest_id (FK)           │
└────────────────────┘  └───────────┬────────────┘  └────────────┬────────────┘
                                    │                            │
                                    ▼                            ▼
                        ┌───────────────┐            ┌────────────────┐
                        │ waypoint_npcs │            │ waypoint_quests│
                        │───────────────│            │────────────────│
                        │ id (PK)       │            │ id (PK)        │
                        └───────────────┘            └────────────────┘

┌───────────────────────┐  ┌───────────────────┐  ┌────────────────────┐
│waypoint_codex_entries │  │ waypoint_locations│  │ waypoint_world_news│
│───────────────────────│  │───────────────────│  │────────────────────│
│ id (PK)               │  │ id (PK)           │  │ id (PK)            │
│ discovered_by         │  │ discovered_by     │  │ created_at         │
└───────────────────────┘  └───────────────────┘  └────────────────────┘
```

### Table Schemas

All table schemas follow the definitions in `backend-infrastructure.md` steering document. Key design decisions:

1. **JSONB for flexible data**: Stats, skills, equipment, inventory use JSONB for schema flexibility
2. **Check constraints**: Relationship bounded -5 to +5, status enums enforced at DB level
3. **UUID primary keys**: All tables use `gen_random_uuid()` for distributed-safe IDs
4. **Timestamps**: `created_at` and `updated_at` with `TIMESTAMPTZ` for timezone awareness

### Storage Structure

```
waypoint-images/
├── characters/{user_id}/{character_id}/
│   └── portrait.webp
├── npcs/{npc_id}/
│   └── portrait.webp
└── locations/{location_id}/
    └── art.webp
```

### Table Naming Convention

All Waypoint database tables use the `waypoint_` prefix:

| Logical Name        | Actual Table Name            |
| ------------------- | ---------------------------- |
| characters          | waypoint_characters          |
| turns               | waypoint_turns               |
| world_state         | waypoint_world_state         |
| sessions            | waypoint_sessions            |
| npcs                | waypoint_npcs                |
| character_npcs      | waypoint_character_npcs      |
| quests              | waypoint_quests              |
| character_quests    | waypoint_character_quests    |
| codex_entries       | waypoint_codex_entries       |
| locations           | waypoint_locations           |
| character_locations | waypoint_character_locations |
| world_news          | waypoint_world_news          |
| character_news_read | waypoint_character_news_read |

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Character Data Isolation

_For any_ user and _for any_ character record, write operations (INSERT, UPDATE, DELETE) SHALL succeed if and only if the character's `user_id` matches the authenticated user's `auth.uid()`.

**Validates: Requirements 3.2, 3.3, 3.4**

### Property 2: Shared Data Accessibility

_For any_ authenticated user, SELECT operations on shared tables (npcs, world_news, codex_entries, locations, quests) SHALL succeed regardless of who created the data.

**Validates: Requirements 3.5, 3.6, 3.7, 3.8, 3.9**

### Property 3: Storage Upload Isolation

_For any_ authenticated user, file uploads to the `waypoint-images` bucket SHALL succeed if and only if the path matches `characters/{auth.uid()}/*`.

**Validates: Requirements 4.2**

### Property 4: Storage Public Read Access

_For any_ file path in the `waypoint-images` bucket, read operations SHALL succeed without authentication.

**Validates: Requirements 4.3**

## Error Handling

| Error Scenario                | Handling                                            |
| ----------------------------- | --------------------------------------------------- |
| Migration fails               | Rollback transaction, log error, abort deployment   |
| RLS policy violation          | Return 403 Forbidden via Supabase client            |
| Storage upload to wrong path  | Return 403 Forbidden                                |
| Missing environment variables | Application fails to start with clear error message |

## Testing Strategy

### Unit Tests (Examples)

- Verify each table exists with correct columns via `information_schema` queries
- Verify each index exists via `pg_indexes` queries
- Verify RLS is enabled on all tables via `pg_tables` query
- Verify storage bucket exists

### Property Tests

- **Property 1**: Generate random user IDs and character records, verify RLS enforcement
- **Property 2**: Generate random authenticated sessions, verify SELECT access to shared tables
- **Property 3**: Generate random user IDs and upload paths, verify storage policy enforcement
- **Property 4**: Generate random file paths, verify public read access

### Integration Tests

- End-to-end test: Create user → Create character → Verify isolation
- End-to-end test: Upload image → Verify public access

**Testing Framework**: Vitest with Supabase local development stack (`supabase start`)

## Implementation Notes

- **Supabase MCP**: Migrations will be executed via Supabase MCP `apply_migration` tool against project `xxgapdjmcwbarncppntp` (llamojha-projects)
- **Existing Tables**: The project has existing tables from other apps - Waypoint tables will be added alongside them
- **Storage policies**: Configured via Supabase Dashboard (MCP doesn't have storage policy tools)
- **Type Generation**: After migrations, run `supabase gen types --linked` to generate TypeScript types
