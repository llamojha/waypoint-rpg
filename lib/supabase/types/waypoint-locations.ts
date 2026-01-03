import type { Json } from "./json";

export type WaypointLocationsTable = {
  Row: {
    art_url: string | null;
    coordinates: Json | null;
    created_at: string | null;
    description: string | null;
    discovered_by: string | null;
    id: string;
    is_preseeded: boolean | null;
    name: string;
    region: string | null;
    type: string | null;
  };
  Insert: {
    art_url?: string | null;
    coordinates?: Json | null;
    created_at?: string | null;
    description?: string | null;
    discovered_by?: string | null;
    id?: string;
    is_preseeded?: boolean | null;
    name: string;
    region?: string | null;
    type?: string | null;
  };
  Update: {
    art_url?: string | null;
    coordinates?: Json | null;
    created_at?: string | null;
    description?: string | null;
    discovered_by?: string | null;
    id?: string;
    is_preseeded?: boolean | null;
    name?: string;
    region?: string | null;
    type?: string | null;
  };
  Relationships: [];
};

export type WaypointCharacterLocationsTable = {
  Row: {
    character_id: string;
    discovered_at: string | null;
    id: string;
    location_id: string;
    status: string | null;
  };
  Insert: {
    character_id: string;
    discovered_at?: string | null;
    id?: string;
    location_id: string;
    status?: string | null;
  };
  Update: {
    character_id?: string;
    discovered_at?: string | null;
    id?: string;
    location_id?: string;
    status?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: "waypoint_character_locations_character_id_fkey";
      columns: ["character_id"];
      isOneToOne: false;
      referencedRelation: "waypoint_characters";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "waypoint_character_locations_location_id_fkey";
      columns: ["location_id"];
      isOneToOne: false;
      referencedRelation: "waypoint_locations";
      referencedColumns: ["id"];
    }
  ];
};
