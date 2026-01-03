# Requirements Document

## Introduction

This spec covers setting up the Supabase project and database schema for Waypoint RPG. It establishes the foundational data layer including all tables, indexes, Row Level Security policies, and storage buckets required for the MVP.

## Glossary

- **Supabase**: Backend-as-a-Service platform providing PostgreSQL database, authentication, and storage
- **RLS**: Row Level Security - PostgreSQL feature to restrict data access at the row level
- **Migration**: SQL script that creates or modifies database schema
- **Storage_Bucket**: Supabase Storage container for file uploads (images)

## Requirements

### Requirement 1: Database Tables

**User Story:** As a developer, I want all core database tables created, so that the application can persist game state.

#### Acceptance Criteria

1. THE Migration SHALL create a `characters` table with columns for user_id, name, gender, description, portrait_url, stats (JSONB), level, xp, hp, max_hp, gold, skills (JSONB), equipment (JSONB), inventory (JSONB), conditions (JSONB), is_magic_unlocked, and timestamps
2. THE Migration SHALL create a `turns` table with columns for character_id, player_action, narration, mechanics (JSONB), diffs (JSONB), suggested_actions (JSONB), and created_at
3. THE Migration SHALL create a `world_state` table with columns for character_id (unique), region, poi, time_day, time_phase, weather, description, tags (JSONB), nearby_poi (JSONB), entities (JSONB), memories (JSONB), and updated_at
4. THE Migration SHALL create an `npcs` table with columns for name, role, location, personality (JSONB), dialogue_hints (JSONB), portrait_url, is_preseeded, discovered_by, and created_at
5. THE Migration SHALL create a `character_npcs` table with columns for character_id, npc_id, relationship (constrained -5 to +5), notes (JSONB), and history (JSONB)
6. THE Migration SHALL create a `quests` table with columns for title, description, total_progress, leads (JSONB), is_preseeded, and created_at
7. THE Migration SHALL create a `character_quests` table with columns for character_id, quest_id, status (constrained to active/completed/failed), and progress
8. THE Migration SHALL create a `codex_entries` table with columns for title, category, text, status (constrained to canon/rumor), tags (JSONB), image_url, discovered_by, and created_at
9. THE Migration SHALL create a `locations` table with columns for name, type, region, coordinates (JSONB), description, art_url, is_preseeded, discovered_by, and created_at
10. THE Migration SHALL create a `character_locations` table with columns for character_id, location_id, status (constrained to visited/known/unknown/locked), and discovered_at
11. THE Migration SHALL create a `world_news` table with columns for title, text, news_type, status (constrained to canon/rumor), related_entity_type, related_entity_id, and created_at
12. THE Migration SHALL create a `character_news_read` table with columns for character_id, news_id, and read_at
13. THE Migration SHALL create a `sessions` table with columns for character_id, title, location, summary, status (constrained to active/completed), started_at, and ended_at

### Requirement 2: Database Indexes

**User Story:** As a developer, I want appropriate indexes on frequently queried columns, so that database queries perform efficiently.

#### Acceptance Criteria

1. THE Migration SHALL create an index on `turns.character_id`
2. THE Migration SHALL create an index on `character_npcs.character_id`
3. THE Migration SHALL create an index on `character_quests.character_id`
4. THE Migration SHALL create an index on `world_news.created_at` (descending)
5. THE Migration SHALL create an index on `npcs.location`
6. THE Migration SHALL create an index on `locations.region`

### Requirement 3: Row Level Security Policies

**User Story:** As a developer, I want RLS policies enforced, so that users can only access their own data while shared data remains readable.

#### Acceptance Criteria

1. THE Migration SHALL enable RLS on all tables
2. THE Migration SHALL create a policy allowing users to SELECT their own characters (where auth.uid() = user_id)
3. THE Migration SHALL create a policy allowing users to UPDATE their own characters
4. THE Migration SHALL create a policy allowing users to INSERT their own characters
5. THE Migration SHALL create a policy allowing authenticated users to SELECT all NPCs
6. THE Migration SHALL create a policy allowing authenticated users to SELECT all world_news
7. THE Migration SHALL create a policy allowing authenticated users to SELECT all codex_entries
8. THE Migration SHALL create a policy allowing authenticated users to SELECT all locations
9. THE Migration SHALL create a policy allowing authenticated users to SELECT all quests

### Requirement 4: Storage Bucket

**User Story:** As a developer, I want a storage bucket configured, so that character portraits and location art can be stored.

#### Acceptance Criteria

1. THE Setup SHALL create a storage bucket named `waypoint-images`
2. THE Setup SHALL configure the bucket to allow authenticated users to upload to their own character folder path (`characters/{user_id}/*`)
3. THE Setup SHALL configure the bucket to allow public read access for all images

### Requirement 5: Environment Configuration

**User Story:** As a developer, I want environment variables documented, so that the application can connect to Supabase.

#### Acceptance Criteria

1. THE Setup SHALL document the required `SUPABASE_URL` environment variable
2. THE Setup SHALL document the required `SUPABASE_ANON_KEY` environment variable
3. THE Setup SHALL document the required `SUPABASE_SERVICE_KEY` environment variable
4. THE Setup SHALL provide an example `.env.local` file with placeholder values
