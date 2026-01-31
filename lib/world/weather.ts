/**
 * Global Weather System
 * 
 * Weather is shared across all players per region.
 * Changes once per real-world day with logical transitions.
 */

import { createAdminClient } from "@/lib/supabase/server";

export type WeatherType = 
  | "Clear"
  | "Cloudy"
  | "Rain"
  | "Storm"
  | "Foggy"
  | "Snow"
  | "Wind"
  | "Heatwave";

export interface WeatherInfo {
  type: WeatherType;
  icon: string;
  description: string;
}

/** Weather metadata with icons and descriptions */
export const WEATHER_DATA: Record<WeatherType, WeatherInfo> = {
  Clear: { type: "Clear", icon: "☀️", description: "Bright sun, clear skies" },
  Cloudy: { type: "Cloudy", icon: "☁️", description: "Grey skies, muted light" },
  Rain: { type: "Rain", icon: "🌧️", description: "Steady rain, muddy paths" },
  Storm: { type: "Storm", icon: "⛈️", description: "Thunder rumbles, lightning flashes" },
  Foggy: { type: "Foggy", icon: "🌫️", description: "Thick mist, low visibility" },
  Snow: { type: "Snow", icon: "❄️", description: "Falling snow, cold air" },
  Wind: { type: "Wind", icon: "💨", description: "Strong gusts, swirling dust" },
  Heatwave: { type: "Heatwave", icon: "🔥", description: "Scorching heat, shimmering air" },
};

/**
 * Valid weather transitions with weights.
 * Higher weight = more likely to transition to that weather.
 */
export const WEATHER_TRANSITIONS: Record<WeatherType, Partial<Record<WeatherType, number>>> = {
  Clear: { Clear: 50, Cloudy: 35, Foggy: 10, Wind: 5 },
  Cloudy: { Cloudy: 30, Clear: 30, Rain: 25, Foggy: 10, Snow: 5 },
  Rain: { Rain: 40, Cloudy: 35, Storm: 25 },
  Storm: { Storm: 20, Rain: 50, Cloudy: 30 },
  Foggy: { Foggy: 30, Clear: 45, Cloudy: 25 },
  Snow: { Snow: 45, Cloudy: 35, Clear: 20 },
  Wind: { Wind: 30, Clear: 35, Cloudy: 25, Storm: 10 },
  Heatwave: { Heatwave: 40, Clear: 45, Wind: 15 },
};

/**
 * Get next weather based on current weather using weighted random selection.
 */
export function getNextWeather(current: WeatherType): WeatherType {
  const transitions = WEATHER_TRANSITIONS[current];
  const entries = Object.entries(transitions) as [WeatherType, number][];
  
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const [weather, weight] of entries) {
    random -= weight;
    if (random <= 0) return weather;
  }
  
  return current; // Fallback
}

/**
 * Generate weather schedule for N days starting from a date.
 */
export function generateWeatherSchedule(
  startWeather: WeatherType,
  days: number
): WeatherType[] {
  const schedule: WeatherType[] = [startWeather];
  
  for (let i = 1; i < days; i++) {
    schedule.push(getNextWeather(schedule[i - 1]));
  }
  
  return schedule;
}

/**
 * Get today's date as YYYY-MM-DD string.
 */
function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Get weather for today, generating schedule if needed.
 * This is the main entry point for the turn pipeline.
 */
export async function getWeatherForToday(region: string = "Ash Coast"): Promise<WeatherInfo> {
  const supabase = createAdminClient();
  const today = getTodayDateString();
  
  // Try to get today's weather
  const { data: existing } = await supabase
    .from("waypoint_weather_schedule")
    .select("weather")
    .eq("region", region)
    .eq("date", today)
    .single();
  
  if (existing?.weather) {
    const weatherType = existing.weather as WeatherType;
    return WEATHER_DATA[weatherType] || WEATHER_DATA.Clear;
  }
  
  // No weather for today - generate a week's schedule
  // First, get yesterday's weather to continue the pattern
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  
  const { data: yesterdayWeather } = await supabase
    .from("waypoint_weather_schedule")
    .select("weather")
    .eq("region", region)
    .eq("date", yesterdayStr)
    .single();
  
  const startWeather = (yesterdayWeather?.weather as WeatherType) || "Clear";
  const schedule = generateWeatherSchedule(startWeather, 7);
  
  // Insert the schedule (skip first day if it's yesterday's continuation)
  const inserts = schedule.map((weather, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return {
      region,
      date: date.toISOString().split("T")[0],
      weather,
    };
  });
  
  // Upsert to handle race conditions
  await supabase
    .from("waypoint_weather_schedule")
    .upsert(inserts, { onConflict: "region,date" });
  
  // Return today's weather (first in schedule)
  return WEATHER_DATA[schedule[0]] || WEATHER_DATA.Clear;
}

/**
 * Check if a weather transition is valid (for testing).
 */
export function isValidTransition(from: WeatherType, to: WeatherType): boolean {
  const transitions = WEATHER_TRANSITIONS[from];
  return to in transitions;
}
