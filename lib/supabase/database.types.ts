/**
 * Supabase Database Types
 *
 * This file re-exports types from the modular types/ directory.
 * Each waypoint table has its own file for easier maintenance.
 *
 * To update types after schema changes:
 * 1. Use Supabase power to generate types
 * 2. Update the relevant file in lib/supabase/types/
 */

export * from "./types";

// Convenience type aliases for common operations
export type { Database, Json } from "./types";
