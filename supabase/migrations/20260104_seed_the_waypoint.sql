-- Seed: The Waypoint starting location
INSERT INTO waypoint_locations (name, type, region, description, art_url, is_preseeded)
VALUES (
  'The Waypoint',
  'ruin',
  'Mistshrouded Valley',
  'An ancient monolith pulsing with forgotten power.',
  '/location_waypoint.png',
  true
)
ON CONFLICT DO NOTHING;
