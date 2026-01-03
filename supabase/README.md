# Supabase Migrations

This directory contains SQL migrations for the Waypoint RPG database.

## Applying Migrations

### Option 1: Supabase Dashboard (Recommended for initial setup)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of each migration file
4. Execute the SQL

### Option 2: Supabase CLI

If you have the Supabase CLI installed:

```bash
# Link to your project (first time only)
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase db push
```

## Migration Files

### `20260102_waypoint_rls_user_scoped.sql`

Enables Row Level Security (RLS) on user-scoped tables:

- `waypoint_characters` - Users can only access their own characters
- `waypoint_turns` - Users can only access turns for their own characters
- `waypoint_world_state` - Users can only access world state for their own characters
- `waypoint_character_npcs` - Users can only access NPC relationships for their own characters
- `waypoint_character_quests` - Users can only access quest progress for their own characters
- `waypoint_character_locations` - Users can only access location discovery for their own characters
- `waypoint_sessions` - Users can only access sessions for their own characters
- `waypoint_character_news_read` - Users can only access news read status for their own characters

**Requirements covered:** 5.1, 5.2, 5.3, 5.4

### `20260102_waypoint_rls_shared_tables.sql`

Enables Row Level Security (RLS) on shared/global tables:

- `waypoint_npcs` - All authenticated users can read, no direct modifications
- `waypoint_quests` - All authenticated users can read, no direct modifications
- `waypoint_codex_entries` - All authenticated users can read, no direct modifications
- `waypoint_locations` - All authenticated users can read, no direct modifications
- `waypoint_world_news` - All authenticated users can read, no direct modifications

**Requirements covered:** 5.5, 5.6

## RLS Policy Design

### User-Scoped Tables

For tables with direct `user_id` column (e.g., `waypoint_characters`):

- Policy checks `auth.uid() = user_id`

For tables linked via `character_id`:

- Policy uses a subquery to verify the character belongs to the authenticated user
- Example: `EXISTS (SELECT 1 FROM waypoint_characters WHERE id = character_id AND user_id = auth.uid())`

### Shared Tables

- Only `SELECT` policies are created for authenticated users
- `INSERT`, `UPDATE`, and `DELETE` operations require the service role
- This ensures data integrity for shared game content

## Service Role Access

The service role (used by server-side API routes) bypasses RLS policies. This allows:

- Creating NPCs when players discover them
- Adding world news when events occur
- Managing quest definitions
- Updating shared game content

Always use the service role key (`SUPABASE_SERVICE_KEY`) for server-side operations that need to modify shared tables.
