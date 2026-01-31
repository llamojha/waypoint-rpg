/**
 * Unit tests for weather system
 */

import { describe, it, expect } from "vitest";
import {
  getNextWeather,
  generateWeatherSchedule,
  isValidTransition,
  WEATHER_TRANSITIONS,
  type WeatherType,
} from "../weather";

describe("Weather System", () => {
  describe("WEATHER_TRANSITIONS", () => {
    it("has transitions for all weather types", () => {
      const weatherTypes: WeatherType[] = [
        "Clear", "Cloudy", "Rain", "Storm", "Foggy", "Snow", "Wind", "Heatwave"
      ];
      
      for (const type of weatherTypes) {
        expect(WEATHER_TRANSITIONS[type]).toBeDefined();
        expect(Object.keys(WEATHER_TRANSITIONS[type]).length).toBeGreaterThan(0);
      }
    });

    it("has valid transition weights (positive numbers)", () => {
      for (const [from, transitions] of Object.entries(WEATHER_TRANSITIONS)) {
        for (const [to, weight] of Object.entries(transitions)) {
          expect(weight).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("isValidTransition", () => {
    it("returns true for valid transitions", () => {
      expect(isValidTransition("Clear", "Cloudy")).toBe(true);
      expect(isValidTransition("Cloudy", "Rain")).toBe(true);
      expect(isValidTransition("Rain", "Storm")).toBe(true);
    });

    it("returns false for invalid transitions", () => {
      // Snow cannot transition directly to Heatwave
      expect(isValidTransition("Snow", "Heatwave")).toBe(false);
      // Heatwave cannot transition directly to Snow
      expect(isValidTransition("Heatwave", "Snow")).toBe(false);
      // Storm cannot transition directly to Clear
      expect(isValidTransition("Storm", "Clear")).toBe(false);
    });
  });

  describe("getNextWeather", () => {
    it("returns a valid weather type", () => {
      const validTypes: WeatherType[] = [
        "Clear", "Cloudy", "Rain", "Storm", "Foggy", "Snow", "Wind", "Heatwave"
      ];
      
      for (const current of validTypes) {
        const next = getNextWeather(current);
        expect(validTypes).toContain(next);
      }
    });

    it("returns a valid transition from current weather", () => {
      // Run multiple times to test randomness
      for (let i = 0; i < 20; i++) {
        const current: WeatherType = "Clear";
        const next = getNextWeather(current);
        expect(isValidTransition(current, next)).toBe(true);
      }
    });
  });

  describe("generateWeatherSchedule", () => {
    it("generates correct number of days", () => {
      const schedule = generateWeatherSchedule("Clear", 7);
      expect(schedule).toHaveLength(7);
    });

    it("starts with the provided weather", () => {
      const schedule = generateWeatherSchedule("Rain", 5);
      expect(schedule[0]).toBe("Rain");
    });

    it("generates valid transitions between consecutive days", () => {
      const schedule = generateWeatherSchedule("Clear", 10);
      
      for (let i = 0; i < schedule.length - 1; i++) {
        expect(isValidTransition(schedule[i], schedule[i + 1])).toBe(true);
      }
    });

    it("never has snow followed by heatwave", () => {
      // Generate many schedules to test
      for (let j = 0; j < 50; j++) {
        const schedule = generateWeatherSchedule("Snow", 14);
        
        for (let i = 0; i < schedule.length - 1; i++) {
          if (schedule[i] === "Snow") {
            expect(schedule[i + 1]).not.toBe("Heatwave");
          }
          if (schedule[i] === "Heatwave") {
            expect(schedule[i + 1]).not.toBe("Snow");
          }
        }
      }
    });
  });
});
