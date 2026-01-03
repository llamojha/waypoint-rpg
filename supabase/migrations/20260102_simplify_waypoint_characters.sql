-- Migration: Simplify waypoint_characters table
-- Date: 2026-01-02
-- Description: Remove unused columns from the simplified character model
--
-- Removed columns:
-- - level: Overall level is now calculated as sum of skill levels (UI only)
-- - xp: No character-level XP, only skill-based XP
-- - stats: No STR/DEX/CON/INT/WIS/CHA stats
-- - description: Removed from character model
--
-- Updated columns:
-- - gender: Default changed from 'Unknown' to NULL (optional field)

ALTER TABLE waypoint_characters
  DROP COLUMN IF EXISTS level,
  DROP COLUMN IF EXISTS xp,
  DROP COLUMN IF EXISTS stats,
  DROP COLUMN IF EXISTS description;

-- Update gender default from 'Unknown' to NULL (optional field)
ALTER TABLE waypoint_characters
  ALTER COLUMN gender DROP DEFAULT;

ALTER TABLE waypoint_characters
  ALTER COLUMN gender SET DEFAULT NULL;
