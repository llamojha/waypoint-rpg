# Implementation Plan: Supabase Setup

## Overview

Apply database migrations via Supabase MCP to create all Waypoint RPG tables, indexes, and RLS policies. Then configure storage and update environment documentation.

## Tasks

- [x] 1. Create core character and turn tables

  - [x] 1.1 Apply migration for `characters` table
    - Create table with all columns from backend-infrastructure.md
    - Include JSONB fields for stats, skills, equipment, inventory, conditions
    - _Requirements: 1.1_
  - [x] 1.2 Apply migration for `turns` table
    - Create table with character_id FK, player_action, narration, mechanics, diffs, suggested_actions
    - _Requirements: 1.2_
  - [x] 1.3 Apply migration for `world_state` table
    - Create table with unique character_id constraint
    - Include region, poi, time_day, time_phase, weather, memories
    - _Requirements: 1.3_
  - [x] 1.4 Apply migration for `sessions` table
    - Create table with status check constraint (active/completed)
    - _Requirements: 1.13_

- [x] 2. Create NPC and relationship tables

  - [x] 2.1 Apply migration for `npcs` table
    - Create table with name, role, location, personality, dialogue_hints
    - Include is_preseeded and discovered_by columns
    - _Requirements: 1.4_
  - [x] 2.2 Apply migration for `character_npcs` table
    - Create junction table with relationship constraint (-5 to +5)
    - Include unique constraint on (character_id, npc_id)
    - _Requirements: 1.5_

- [x] 3. Create quest tables

  - [x] 3.1 Apply migration for `quests` table
    - Create table with title, description, total_progress, leads
    - _Requirements: 1.6_
  - [x] 3.2 Apply migration for `character_quests` table
    - Create junction table with status check constraint (active/completed/failed)
    - _Requirements: 1.7_

- [x] 4. Create world content tables

  - [x] 4.1 Apply migration for `codex_entries` table
    - Create table with title, category, text, status (canon/rumor)
    - _Requirements: 1.8_
  - [x] 4.2 Apply migration for `locations` table
    - Create table with name, type, region, coordinates, art_url
    - _Requirements: 1.9_
  - [x] 4.3 Apply migration for `character_locations` table
    - Create junction table with status check constraint
    - _Requirements: 1.10_
  - [x] 4.4 Apply migration for `world_news` table
    - Create table with title, text, news_type, status
    - _Requirements: 1.11_
  - [x] 4.5 Apply migration for `character_news_read` table
    - Create junction table for tracking read news
    - _Requirements: 1.12_

- [x] 5. Checkpoint - Verify all tables created

  - Run `list_tables` to confirm all 13 Waypoint tables exist
  - Ensure all tests pass, ask the user if questions arise

- [x] 6. Create indexes for performance

  - [x] 6.1 Apply migration for all indexes
    - Create index on turns.character_id
    - Create index on character_npcs.character_id
    - Create index on character_quests.character_id
    - Create index on world_news.created_at DESC
    - Create index on npcs.location
    - Create index on locations.region
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 7. Enable RLS and create policies

  - [x] 7.1 Apply migration to enable RLS on all tables
    - Enable RLS on all 13 Waypoint tables
    - _Requirements: 3.1_
  - [x] 7.2 Apply migration for character data policies
    - Create SELECT, UPDATE, INSERT policies for characters table
    - Use (select auth.uid()) = user_id pattern
    - _Requirements: 3.2, 3.3, 3.4_
  - [x] 7.3 Apply migration for shared data policies
    - Create SELECT policies for npcs, world_news, codex_entries, locations, quests
    - Allow all authenticated users to read
    - _Requirements: 3.5, 3.6, 3.7, 3.8, 3.9_
  - [x] 7.4 Apply migration for junction table policies
    - Create policies for character_npcs, character_quests, character_locations, character_news_read
    - Users can only access their own character's junction records
    - _Requirements: 3.2_

- [x] 8. Run security advisors

  - Run `get_advisors` with type "security" to check for RLS issues
  - Fix any identified problems with additional migrations
  - Ensure all tests pass, ask the user if questions arise

- [x] 9. Configure storage bucket

  - [x] 9.1 Create waypoint-images bucket via Supabase Dashboard
    - Create bucket named `waypoint-images`
    - Configure public read access
    - _Requirements: 4.1, 4.3_
  - [x] 9.2 Configure storage policies via Dashboard
    - Allow authenticated users to upload to `characters/{auth.uid()}/*`
    - _Requirements: 4.2_

- [x] 10. Update environment configuration

  - [x] 10.1 Update .env.local.example with Supabase variables
    - Add NEXT_PUBLIC_SUPABASE_URL placeholder
    - Add NEXT_PUBLIC_SUPABASE_ANON_KEY placeholder
    - Add SUPABASE_SERVICE_KEY placeholder (server-side only)
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 11. Generate TypeScript types

  - [x] 11.1 Generate and save database types
    - Run `supabase gen types --linked`
    - Save to `lib/supabase/database.types.ts`
    - _Requirements: 1.1-1.13_

- [x] 12. Final checkpoint
  - Verify all 13 tables exist with correct schema
  - Verify all indexes exist
  - Verify RLS is enabled on all tables
  - Ensure all tests pass, ask the user if questions arise

## Notes

- All migrations executed via Supabase MCP `apply_migration` tool
- Project ID: `xxgapdjmcwbarncppntp` (llamojha-projects)
- **All Waypoint tables use `waypoint_` prefix** (e.g., `waypoint_characters`, `waypoint_npcs`) to distinguish from other projects in the shared Supabase instance
- Storage bucket configuration requires Supabase Dashboard (MCP limitation)
- Property tests for RLS policies can be added post-MVP
