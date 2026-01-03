import type { Json } from "./json";

export type WaypointTurnsTable = {
  Row: {
    character_id: string;
    created_at: string | null;
    diffs: Json | null;
    id: string;
    mechanics: Json | null;
    narration: string | null;
    player_action: string;
    suggested_actions: Json | null;
  };
  Insert: {
    character_id: string;
    created_at?: string | null;
    diffs?: Json | null;
    id?: string;
    mechanics?: Json | null;
    narration?: string | null;
    player_action: string;
    suggested_actions?: Json | null;
  };
  Update: {
    character_id?: string;
    created_at?: string | null;
    diffs?: Json | null;
    id?: string;
    mechanics?: Json | null;
    narration?: string | null;
    player_action?: string;
    suggested_actions?: Json | null;
  };
  Relationships: [
    {
      foreignKeyName: "waypoint_turns_character_id_fkey";
      columns: ["character_id"];
      isOneToOne: false;
      referencedRelation: "waypoint_characters";
      referencedColumns: ["id"];
    }
  ];
};
