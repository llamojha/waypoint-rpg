/**
 * In-memory cache for codex entries
 * 
 * TODO: When lore data expands significantly, migrate to key-map index system
 * See: docs/todos/lore-index-optimization.md
 */

import type { CodexEntry } from "@/types";

interface CacheState {
  entries: CodexEntry[];
  loaded: boolean;
  loadedAt: number | null;
}

// Module-level cache - persists across requests until server restart
const cache: CacheState = {
  entries: [],
  loaded: false,
  loadedAt: null,
};

/**
 * Initialize cache with codex entries from database
 */
export function initCache(entries: CodexEntry[]): void {
  cache.entries = entries;
  cache.loaded = true;
  cache.loadedAt = Date.now();
}

/**
 * Check if cache is loaded
 */
export function isCacheLoaded(): boolean {
  return cache.loaded;
}

/**
 * Get all cached entries
 */
export function getAllEntries(): CodexEntry[] {
  return cache.entries;
}

/**
 * Search cache by keywords (simple case-insensitive matching)
 * Searches title, text, and tags
 */
export function searchByKeywords(keywords: string[], limit: number = 5): CodexEntry[] {
  if (!cache.loaded || keywords.length === 0) return [];

  const keywordsLower = keywords.map(k => k.toLowerCase());

  // Score each entry by keyword matches
  const scored = cache.entries.map(entry => {
    let score = 0;
    const titleLower = entry.title.toLowerCase();
    const textLower = entry.text.toLowerCase();
    const tagsLower = entry.tags.map(t => t.toLowerCase());

    for (const keyword of keywordsLower) {
      // Title match = highest score
      if (titleLower.includes(keyword)) score += 3;
      // Text match
      if (textLower.includes(keyword)) score += 2;
      // Tag match
      if (tagsLower.some(t => t.includes(keyword))) score += 1;
    }

    return { entry, score };
  });

  // Return top matches
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.entry);
}

/**
 * Search cache by category
 */
export function searchByCategory(category: string, limit: number = 5): CodexEntry[] {
  if (!cache.loaded) return [];

  return cache.entries
    .filter(e => e.category.toLowerCase() === category.toLowerCase())
    .slice(0, limit);
}

/**
 * Get entry by title (exact match, case-insensitive)
 */
export function getByTitle(title: string): CodexEntry | null {
  if (!cache.loaded) return null;

  const titleLower = title.toLowerCase();
  return cache.entries.find(e => e.title.toLowerCase() === titleLower) || null;
}

/**
 * Clear cache (for testing)
 */
export function clearCache(): void {
  cache.entries = [];
  cache.loaded = false;
  cache.loadedAt = null;
}
