import type { Json } from "./json";

export type WaypointCharactersTable = {
  Row: {
    conditions: Json | null;
    created_at: string | null;
    equipment: Json | null;
    gender: string | null;
    gold: number | null;
    hp: number | null;
    id: string;
    inventory: Json | null;
    is_magic_unlocked: boolean | null;
    max_hp: number | null;
    name: string;
    portrait_url: string | null;
    skills: Json | null;
    updated_at: string | null;
    user_id: string;
  };
  Insert: {
    conditions?: Json | null;
    created_at?: string | null;
    equipment?: Json | null;
    gender?: string | null;
    gold?: number | null;
    hp?: number | null;
    id?: string;
    inventory?: Json | null;
    is_magic_unlocked?: boolean | null;
    max_hp?: number | null;
    name: string;
    portrait_url?: string | null;
    skills?: Json | null;
    updated_at?: string | null;
    user_id: string;
  };
  Update: {
    conditions?: Json | null;
    created_at?: string | null;
    equipment?: Json | null;
    gender?: string | null;
    gold?: number | null;
    hp?: number | null;
    id?: string;
    inventory?: Json | null;
    is_magic_unlocked?: boolean | null;
    max_hp?: number | null;
    name?: string;
    portrait_url?: string | null;
    skills?: Json | null;
    updated_at?: string | null;
    user_id?: string;
  };
  Relationships: [];
};
