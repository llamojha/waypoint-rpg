export type WaypointSessionsTable = {
  Row: {
    character_id: string;
    ended_at: string | null;
    id: string;
    location: string | null;
    started_at: string | null;
    status: string | null;
    summary: string | null;
    title: string | null;
  };
  Insert: {
    character_id: string;
    ended_at?: string | null;
    id?: string;
    location?: string | null;
    started_at?: string | null;
    status?: string | null;
    summary?: string | null;
    title?: string | null;
  };
  Update: {
    character_id?: string;
    ended_at?: string | null;
    id?: string;
    location?: string | null;
    started_at?: string | null;
    status?: string | null;
    summary?: string | null;
    title?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: "waypoint_sessions_character_id_fkey";
      columns: ["character_id"];
      isOneToOne: false;
      referencedRelation: "waypoint_characters";
      referencedColumns: ["id"];
    }
  ];
};
