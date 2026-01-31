import type { Json } from "./json";

export type WaypointLocationSummariesTable = {
  Row: {
    id: string;
    character_id: string;
    location: string;
    visit_number: number;
    turn_range_start: number;
    turn_range_end: number;
    summary: string;
    key_events: Json;
    npcs_encountered: Json;
    items_gained: Json;
    items_lost: Json;
    quest_progress: Json;
    created_at: string;
  };
  Insert: {
    id?: string;
    character_id: string;
    location: string;
    visit_number?: number;
    turn_range_start: number;
    turn_range_end: number;
    summary: string;
    key_events?: Json;
    npcs_encountered?: Json;
    items_gained?: Json;
    items_lost?: Json;
    quest_progress?: Json;
    created_at?: string;
  };
  Update: {
    id?: string;
    character_id?: string;
    location?: string;
    visit_number?: number;
    turn_range_start?: number;
    turn_range_end?: number;
    summary?: string;
    key_events?: Json;
    npcs_encountered?: Json;
    items_gained?: Json;
    items_lost?: Json;
    quest_progress?: Json;
    created_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: "waypoint_location_summaries_character_id_fkey";
      columns: ["character_id"];
      isOneToOne: false;
      referencedRelation: "waypoint_characters";
      referencedColumns: ["id"];
    }
  ];
};
