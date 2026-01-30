import type { Json } from "./json";

export type WaypointWorldStateTable = {
  Row: {
    character_id: string;
    description: string | null;
    entities: Json | null;
    id: string;
    memories: Json | null;
    nearby_poi: Json | null;
    poi: string | null;
    region: string | null;
    tags: Json | null;
    time_day: number | null;
    time_phase: string | null;
    updated_at: string | null;
    weather: string | null;
    active_combat: Json | null;
  };
  Insert: {
    character_id: string;
    description?: string | null;
    entities?: Json | null;
    id?: string;
    memories?: Json | null;
    nearby_poi?: Json | null;
    poi?: string | null;
    region?: string | null;
    tags?: Json | null;
    time_day?: number | null;
    time_phase?: string | null;
    updated_at?: string | null;
    weather?: string | null;
    active_combat?: Json | null;
  };
  Update: {
    character_id?: string;
    description?: string | null;
    entities?: Json | null;
    id?: string;
    memories?: Json | null;
    nearby_poi?: Json | null;
    poi?: string | null;
    region?: string | null;
    tags?: Json | null;
    time_day?: number | null;
    time_phase?: string | null;
    updated_at?: string | null;
    weather?: string | null;
    active_combat?: Json | null;
  };
  Relationships: [
    {
      foreignKeyName: "waypoint_world_state_character_id_fkey";
      columns: ["character_id"];
      isOneToOne: true;
      referencedRelation: "waypoint_characters";
      referencedColumns: ["id"];
    }
  ];
};
