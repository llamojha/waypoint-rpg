export type WaypointWorldNewsTable = {
  Row: {
    created_at: string | null;
    id: string;
    news_type: string | null;
    related_entity_id: string | null;
    related_entity_type: string | null;
    status: string | null;
    text: string | null;
    title: string;
  };
  Insert: {
    created_at?: string | null;
    id?: string;
    news_type?: string | null;
    related_entity_id?: string | null;
    related_entity_type?: string | null;
    status?: string | null;
    text?: string | null;
    title: string;
  };
  Update: {
    created_at?: string | null;
    id?: string;
    news_type?: string | null;
    related_entity_id?: string | null;
    related_entity_type?: string | null;
    status?: string | null;
    text?: string | null;
    title?: string;
  };
  Relationships: [];
};

export type WaypointCharacterNewsReadTable = {
  Row: {
    character_id: string;
    news_id: string;
    read_at: string | null;
  };
  Insert: {
    character_id: string;
    news_id: string;
    read_at?: string | null;
  };
  Update: {
    character_id?: string;
    news_id?: string;
    read_at?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: "waypoint_character_news_read_character_id_fkey";
      columns: ["character_id"];
      isOneToOne: false;
      referencedRelation: "waypoint_characters";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "waypoint_character_news_read_news_id_fkey";
      columns: ["news_id"];
      isOneToOne: false;
      referencedRelation: "waypoint_world_news";
      referencedColumns: ["id"];
    }
  ];
};
