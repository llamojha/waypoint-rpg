import type { Json } from "./json";

export type WaypointQuestsTable = {
  Row: {
    created_at: string | null;
    description: string | null;
    id: string;
    is_preseeded: boolean | null;
    leads: Json | null;
    title: string;
    total_progress: number | null;
  };
  Insert: {
    created_at?: string | null;
    description?: string | null;
    id?: string;
    is_preseeded?: boolean | null;
    leads?: Json | null;
    title: string;
    total_progress?: number | null;
  };
  Update: {
    created_at?: string | null;
    description?: string | null;
    id?: string;
    is_preseeded?: boolean | null;
    leads?: Json | null;
    title?: string;
    total_progress?: number | null;
  };
  Relationships: [];
};

export type WaypointCharacterQuestsTable = {
  Row: {
    character_id: string;
    id: string;
    progress: number | null;
    quest_id: string;
    status: string | null;
  };
  Insert: {
    character_id: string;
    id?: string;
    progress?: number | null;
    quest_id: string;
    status?: string | null;
  };
  Update: {
    character_id?: string;
    id?: string;
    progress?: number | null;
    quest_id?: string;
    status?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: "waypoint_character_quests_character_id_fkey";
      columns: ["character_id"];
      isOneToOne: false;
      referencedRelation: "waypoint_characters";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "waypoint_character_quests_quest_id_fkey";
      columns: ["quest_id"];
      isOneToOne: false;
      referencedRelation: "waypoint_quests";
      referencedColumns: ["id"];
    }
  ];
};
