-- Migration: Enable RLS and create policies for shared/global Waypoint tables
-- Requirements: 5.5, 5.6
--
-- Shared tables are readable by all authenticated users but cannot be modified
-- directly by users. Only the system (service role) can write to these tables.

-- ============================================================================
-- waypoint_npcs: Global NPC registry (SELECT only for authenticated users)
-- ============================================================================

-- Enable RLS
ALTER TABLE waypoint_npcs ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read NPCs
CREATE POLICY "Authenticated users can view NPCs"
  ON waypoint_npcs
  FOR SELECT
  TO authenticated
  USING (true);

-- Note: No INSERT, UPDATE, or DELETE policies for regular users
-- NPCs are created/modified by the system (service role) when discovered

-- ============================================================================
-- waypoint_quests: Global quest definitions (SELECT only for authenticated users)
-- ============================================================================

-- Enable RLS
ALTER TABLE waypoint_quests ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read quests
CREATE POLICY "Authenticated users can view quests"
  ON waypoint_quests
  FOR SELECT
  TO authenticated
  USING (true);

-- Note: No INSERT, UPDATE, or DELETE policies for regular users
-- Quests are created/modified by the system (service role) or pre-seeded

-- ============================================================================
-- waypoint_codex_entries: Global lore/codex (SELECT only for authenticated users)
-- ============================================================================

-- Enable RLS
ALTER TABLE waypoint_codex_entries ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read codex entries
CREATE POLICY "Authenticated users can view codex entries"
  ON waypoint_codex_entries
  FOR SELECT
  TO authenticated
  USING (true);

-- Note: No INSERT, UPDATE, or DELETE policies for regular users
-- Codex entries are created/modified by the system (service role) when discovered

-- ============================================================================
-- waypoint_locations: Global location registry (SELECT only for authenticated users)
-- ============================================================================

-- Enable RLS
ALTER TABLE waypoint_locations ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read locations
CREATE POLICY "Authenticated users can view locations"
  ON waypoint_locations
  FOR SELECT
  TO authenticated
  USING (true);

-- Note: No INSERT, UPDATE, or DELETE policies for regular users
-- Locations are created/modified by the system (service role) when discovered

-- ============================================================================
-- waypoint_world_news: Global news/events (SELECT only for authenticated users)
-- ============================================================================

-- Enable RLS
ALTER TABLE waypoint_world_news ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read world news
CREATE POLICY "Authenticated users can view world news"
  ON waypoint_world_news
  FOR SELECT
  TO authenticated
  USING (true);

-- Note: No INSERT, UPDATE, or DELETE policies for regular users
-- World news is created/modified by the system (service role) when events occur
