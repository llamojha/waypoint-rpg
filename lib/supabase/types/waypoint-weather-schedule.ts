export type WaypointWeatherScheduleTable = {
  Row: {
    id: string;
    region: string;
    date: string;
    weather: string;
    created_at: string | null;
  };
  Insert: {
    id?: string;
    region?: string;
    date: string;
    weather: string;
    created_at?: string | null;
  };
  Update: {
    id?: string;
    region?: string;
    date?: string;
    weather?: string;
    created_at?: string | null;
  };
  Relationships: [];
};
