/**
 * Conversation Compression Module
 * 
 * Compresses older turn history into location-based summaries
 * to manage context window size while preserving narrative continuity.
 */

export { generateLocationSummary, type LocationSummary } from "./summarize";
export { compressLocationTurns, getLocationSummaries } from "./queue";
