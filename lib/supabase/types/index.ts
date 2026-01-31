// Re-export base types
export type { Json } from "./json";

// Re-export individual table types
export type { WaypointCharactersTable } from "./waypoint-characters";
export type { WaypointTurnsTable } from "./waypoint-turns";
export type { WaypointWorldStateTable } from "./waypoint-world-state";
export type {
  WaypointNpcsTable,
  WaypointCharacterNpcsTable,
} from "./waypoint-npcs";
export type {
  WaypointQuestsTable,
  WaypointCharacterQuestsTable,
} from "./waypoint-quests";
export type { WaypointCodexEntriesTable } from "./waypoint-codex";
export type {
  WaypointLocationsTable,
  WaypointCharacterLocationsTable,
} from "./waypoint-locations";
export type {
  WaypointWorldNewsTable,
  WaypointCharacterNewsReadTable,
} from "./waypoint-news";
export type { WaypointSessionsTable } from "./waypoint-sessions";
export type { WaypointWeatherScheduleTable } from "./waypoint-weather-schedule";
export type { WaypointLocationSummariesTable } from "./waypoint-location-summaries";

// Import for Database composition
import type { Json } from "./json";
import type { WaypointCharactersTable } from "./waypoint-characters";
import type { WaypointTurnsTable } from "./waypoint-turns";
import type { WaypointWorldStateTable } from "./waypoint-world-state";
import type {
  WaypointNpcsTable,
  WaypointCharacterNpcsTable,
} from "./waypoint-npcs";
import type {
  WaypointQuestsTable,
  WaypointCharacterQuestsTable,
} from "./waypoint-quests";
import type { WaypointCodexEntriesTable } from "./waypoint-codex";
import type {
  WaypointLocationsTable,
  WaypointCharacterLocationsTable,
} from "./waypoint-locations";
import type {
  WaypointWorldNewsTable,
  WaypointCharacterNewsReadTable,
} from "./waypoint-news";
import type { WaypointSessionsTable } from "./waypoint-sessions";
import type { WaypointWeatherScheduleTable } from "./waypoint-weather-schedule";
import type { WaypointLocationSummariesTable } from "./waypoint-location-summaries";

// Combined Database type for Supabase client
export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      waypoint_characters: WaypointCharactersTable;
      waypoint_turns: WaypointTurnsTable;
      waypoint_world_state: WaypointWorldStateTable;
      waypoint_npcs: WaypointNpcsTable;
      waypoint_character_npcs: WaypointCharacterNpcsTable;
      waypoint_quests: WaypointQuestsTable;
      waypoint_character_quests: WaypointCharacterQuestsTable;
      waypoint_codex_entries: WaypointCodexEntriesTable;
      waypoint_locations: WaypointLocationsTable;
      waypoint_character_locations: WaypointCharacterLocationsTable;
      waypoint_world_news: WaypointWorldNewsTable;
      waypoint_character_news_read: WaypointCharacterNewsReadTable;
      waypoint_sessions: WaypointSessionsTable;
      waypoint_weather_schedule: WaypointWeatherScheduleTable;
      waypoint_location_summaries: WaypointLocationSummariesTable;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
