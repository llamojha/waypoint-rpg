import type { Json } from "./json";

export type WaypointNpcsTable = {
  Row: {
    created_at: string | null;
    dialogue_hints: Json | null;
    discovered_by: string | null;
    id: string;
    is_preseeded: boolean | null;
    location: string | null;
    name: string;
    personality: Json | null;
    portrait_url: string | null;
    role: string | null;
  };
  Insert: {
    created_at?: string | null;
    dialogue_hints?: Json | null;
    discovered_by?: string | null;
    id?: string;
    is_preseeded?: boolean | null;
    location?: string | null;
    name: string;
    personality?: Json | null;
    portrait_url?: string | null;
    role?: string | null;
  };
  Update: {
    created_at?: string | null;
    dialogue_hints?: Json | null;
    discovered_by?: string | null;
    id?: string;
    is_preseeded?: boolean | null;
    location?: string | null;
    name?: string;
    personality?: Json | null;
    portrait_url?: string | null;
    role?: string | null;
  };
  Relationships: [];
};

export type WaypointCharacterNpcsTable = {
  Row: {
    character_id: string;
    history: Json | null;
    id: string;
    notes: Json | null;
    npc_id: string;
    relationship: number | null;
  };
  Insert: {
    character_id: string;
    history?: Json | null;
    id?: string;
    notes?: Json | null;
    npc_id: string;
    relationship?: number | null;
  };
  Update: {
    character_id?: string;
    history?: Json | null;
    id?: string;
    notes?: Json | null;
    npc_id?: string;
    relationship?: number | null;
  };
  Relationships: [
    {
      foreignKeyName: "waypoint_character_npcs_character_id_fkey";
      columns: ["character_id"];
      isOneToOne: false;
      referencedRelation: "waypoint_characters";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "waypoint_character_npcs_npc_id_fkey";
      columns: ["npc_id"];
      isOneToOne: false;
      referencedRelation: "waypoint_npcs";
      referencedColumns: ["id"];
    }
  ];
};
