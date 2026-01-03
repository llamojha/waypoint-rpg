-- Migration: Enable RLS and create policies for user-scoped Waypoint tables
-- Requirements: 5.1, 5.2, 5.3, 5.4
--
-- User-scoped tables require that users can only access their own data.
-- For tth direct user_id: check auth.uid() = user_id
-- For tables linked via character_id: join to waypoint_characters to verify ownership

-- ============================================================================
-- waypoint_characters: Direct user ownership
-- ============================================================================

-- Enable RLS
ALTER TABLE waypoint_characters ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT only their own characters
CREATE POLICY "Users can view own characters"
  ON waypoint_characters
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can INSERT characters only with their own user_id
CREATE POLICY "Users can create own characters"
  ON waypoint_characters
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can UPDATE only their own characters
CREATE POLICY "Users can update own characters"
  ON waypoint_characters
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can DELETE only their own characters
CREATE POLICY "Users can delete own characters"
  ON waypoint_characters
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- waypoint_turns: Linked via character_id
-- ============================================================================

-- Enable RLS
ALTER TABLE waypoint_turns ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT turns for their own characters
CREATE POLICY "Users can view own character turns"
  ON waypoint_turns
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM waypoint_characters
      WHERE waypoint_characters.id = waypoint_turns.character_id
      AND waypoint_characters.user_id = auth.uid()
    )
  );

-- Policy: Users can INSERT turns for their own characters
CREATE POLICY "Users can create turns for own characters"
  ON waypoint_turns
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM waypoint_characters
      WHERE waypoint_characters.id = waypoint_turns.character_id
      AND waypoint_characters.user_id = auth.uid()
    )
  );

-- Policy: Users can UPDATE turns for their own characters
CREATE POLICY "Users can update own character turns"
  ON waypoint_turns
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM waypoint_characters
      WHERE waypoint_characters.id = waypoint_turns.character_id
      AND waypoint_characters.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM waypoint_characters
      WHERE waypoint_characters.id = waypoint_turns.character_id
      AND waypoint_characters.user_id = auth.uid()
    )
  );

-- Policy: Users can DELETE turns for their own characters
CREATE POLICY "Users can delete own character turns"
  ON waypoint_turns
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM waypoint_characters
      WHERE waypoint_characters.id = waypoint_turns.character_id
      AND waypoint_characters.user_id = auth.uid()
    )
  );

-- ============================================================================
-- waypoint_world_state: Linked via character_id (one-to-one)
-- ============================================================================

-- Enable RLS
ALTER TABLE waypoint_world_state ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT world state for their own characters
CREATE POLICY "Users can view own character world state"
  ON waypoint_world_state
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM waypoint_characters
      WHERE waypoint_characters.id = waypoint_world_state.character_id
      AND waypoint_characters.user_id = auth.uid()
    )
  );

-- Policy: Users can INSERT world state for their own characters
CREATE POLICY "Users can create world state for own characters"
  ON waypoint_world_state
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM waypoint_characters
      WHERE waypoint_characters.id = waypoint_world_state.character_id
      AND waypoint_characters.user_id = auth.uid()
    )
  );

-- Policy: Users can UPDATE world state for their own characters
CREATE POLICY "Users can update own character world state"
  ON waypoint_world_state
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM waypoint_characters
      WHERE waypoint_characters.id = waypoint_world_state.character_id
      AND waypoint_characters.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM waypoint_characters
      WHERE waypoint_characters.id = waypoint_world_state.character_id
      AND waypoint_characters.user_id = auth.uid()
    )
  );

-- Policy: Users can DELETE world state for their own characters
CREATE POLICY "Users can delete own character world state"
  ON waypoint_world_state
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM waypoint_characters
      WHERE waypoint_characters.id = waypoint_world_state.character_id
      AND waypoint_characters.user_id = auth.uid()
    )
  );

-- ============================================================================
-- waypoint_character_npcs: Linked via character_id
-- ============================================================================

-- Enable RLS
ALTER TABLE waypoint_character_npcs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT NPC relationships for their own characters
CREATE POLICY "Users can view own character NPC relationships"
  ON waypoint_character_npcs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM waypoint_characters
      WHERE waypoint_characters.id = waypoint_character_npcs.character_id
      AND waypoint_characters.user_id = auth.uid()
    )
  );

-- Policy: Users can INSERT NPC relationships for their own characters
CREATE POLICY "Users can create NPC relationships for own characters"
  ON waypoint_character_npcs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM waypoint_characters
      WHERE waypoint_characters.id = waypoint_character_npcs.character_id
      AND waypoint_characters.user_id = auth.uid()
    )
  );

-- Policy: Users can UPDATE NPC relationships for their own characters
CREATE POLICY "Users can update own character NPC relationships"
  ON waypoint_character_npcs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM waypoint_characters
      WHERE waypoint_characters.id = waypoint_character_npcs.character_id
      AND waypoint_characters.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM waypoint_characters
      WHERE waypoint_characters.id = waypoint_character_npcs.character_id
      AND waypoint_characters.user_id = auth.uid()
    )
  );

-- Policy: Users can DELETE NPC relationships for their own characters
CREATE POLICY "Users can delete own character NPC relationships"
  ON waypoint_character_npcs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM waypoint_characters
      WHERE waypoint_characters.id = waypoint_character_npcs.character_id
      AND waypoint_characters.user_id = auth.uid()
    )
  );

-- ============================================================================
-- waypoint_character_quests: Linked via character_id
-- ============================================================================

-- Enable RLS
ALTER TABLE waypoint_character_quests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT quest progress for their own characters
CREATE POLICY "Users can view own character quest progress"
  ON waypoint_character_quests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM waypoint_characters
      WHERE waypoint_characters.id = waypoint_character_quests.character_id
      AND waypoint_characters.user_id = auth.uid()
    )
  );

-- Policy: Users can INSERT quest progress for their own characters
CREATE POLICY "Users can create quest progress for own characters"
  ON waypoint_character_quests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM waypoint_characters
      WHERE waypoint_characters.id = waypoint_character_quests.character_id
      AND waypoint_characters.user_id = auth.uid()
    )
  );

-- Policy: Users can UPDATE quest progress for their own characters
CREATE POLICY "Users can update own character quest progress"
  ON waypoint_character_quests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM waypoint_characters
      WHERE waypoint_characters.id = waypoint_character_quests.character_id
      AND waypoint_characters.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM waypoint_characters
      WHERE waypoint_characters.id = waypoint_character_quests.character_id
      AND waypoint_characters.user_id = auth.uid()
    )
  );

-- Policy: Users can DELETE quest progress for their own characters
CREATE POLICY "Users can delete own character quest progress"
  ON waypoint_character_quests
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM waypoint_characters
      WHERE waypoint_characters.id = waypoint_character_quests.character_id
      AND waypoint_characters.user_id = auth.uid()
    )
  );

-- ============================================================================
-- waypoint_character_locations: Linked via character_id
-- ============================================================================

-- Enable RLS
ALTER TABLE waypoint_character_locations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT location discovery for their own characters
CREATE POLICY "Users can view own character location discovery"
  ON waypoint_character_locations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM waypoint_characters
      WHERE waypoint_characters.id = waypoint_character_locations.character_id
      AND waypoint_characters.user_id = auth.uid()
    )
  );

-- Policy: Users can INSERT location discovery for their own characters
CREATE POLICY "Users can create location discovery for own characters"
  ON waypoint_character_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM waypoint_characters
      WHERE waypoint_characters.id = waypoint_character_locations.character_id
      AND waypoint_characters.user_id = auth.uid()
    )
  );

-- Policy: Users can UPDATE location discovery for their own characters
CREATE POLICY "Users can update own character location discovery"
  ON waypoint_character_locations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM waypoint_characters
      WHERE waypoint_characters.id = waypoint_character_locations.character_id
      AND waypoint_characters.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM waypoint_characters
      WHERE waypoint_characters.id = waypoint_character_locations.character_id
      AND waypoint_characters.user_id = auth.uid()
    )
  );

-- Policy: Users can DELETE location discovery for their own characters
CREATE POLICY "Users can delete own character location discovery"
  ON waypoint_character_locations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM waypoint_characters
      WHERE waypoint_characters.id = waypoint_character_locations.character_id
      AND waypoint_characters.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Additional user-scoped tables (from database schema)
-- ============================================================================

-- waypoint_sessions: Linked via character_id
ALTER TABLE waypoint_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own character sessions"
  ON waypoint_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM waypoint_characters
      WHERE waypoint_characters.id = waypoint_sessions.character_id
      AND waypoint_characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create sessions for own characters"
  ON waypoint_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM waypoint_characters
      WHERE waypoint_characters.id = waypoint_sessions.character_id
      AND waypoint_characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own character sessions"
  ON waypoint_sessions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM waypoint_characters
      WHERE waypoint_characters.id = waypoint_sessions.character_id
      AND waypoint_characters.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM waypoint_characters
      WHERE waypoint_characters.id = waypoint_sessions.character_id
      AND waypoint_characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own character sessions"
  ON waypoint_sessions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM waypoint_characters
      WHERE waypoint_characters.id = waypoint_sessions.character_id
      AND waypoint_characters.user_id = auth.uid()
    )
  );

-- waypoint_character_news_read: Linked via character_id
ALTER TABLE waypoint_character_news_read ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own character news read status"
  ON waypoint_character_news_read
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM waypoint_characters
      WHERE waypoint_characters.id = waypoint_character_news_read.character_id
      AND waypoint_characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can mark news as read for own characters"
  ON waypoint_character_news_read
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM waypoint_characters
      WHERE waypoint_characters.id = waypoint_character_news_read.character_id
      AND waypoint_characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update news read status for own characters"
  ON waypoint_character_news_read
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM waypoint_characters
      WHERE waypoint_characters.id = waypoint_character_news_read.character_id
      AND waypoint_characters.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM waypoint_characters
      WHERE waypoint_characters.id = waypoint_character_news_read.character_id
      AND waypoint_characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete news read status for own characters"
  ON waypoint_character_news_read
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM waypoint_characters
      WHERE waypoint_characters.id = waypoint_character_news_read.character_id
      AND waypoint_characters.user_id = auth.uid()
    )
  );
