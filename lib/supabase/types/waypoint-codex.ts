import type { Json } from "./json";

export type WaypointCodexEntriesTable = {
  Row: {
    category: string;
    created_at: string | null;
    discovered_by: string | null;
    id: string;
    image_url: string | null;
    status: string | null;
    tags: Json | null;
    text: string | null;
    title: string;
  };
  Insert: {
    category: string;
    created_at?: string | null;
    discovered_by?: string | null;
    id?: string;
    image_url?: string | null;
    status?: string | null;
    tags?: Json | null;
    text?: string | null;
    title: string;
  };
  Update: {
    category?: string;
    created_at?: string | null;
    discovered_by?: string | null;
    id?: string;
    image_url?: string | null;
    status?: string | null;
    tags?: Json | null;
    text?: string | null;
    title?: string;
  };
  Relationships: [];
};
