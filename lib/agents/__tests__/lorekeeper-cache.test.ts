import { describe, it, expect, beforeEach } from 'vitest';
import {
  initCache,
  isCacheLoaded,
  getAllEntries,
  searchByKeywords,
  searchByCategory,
  getByTitle,
  clearCache,
} from '../lorekeeper/cache';
import type { CodexEntry } from '@/types';

const mockEntries: CodexEntry[] = [
  {
    id: '1',
    title: 'Windhollow Vale',
    category: 'Locations',
    text: 'A peaceful prairie region known for rolling grasslands.',
    status: 'canon',
    tags: ['region', 'safe', 'windhollow'],
  },
  {
    id: '2',
    title: 'Goblin Scavengers',
    category: 'Bestiary',
    text: 'Small, nimble creatures that use pack tactics.',
    status: 'canon',
    tags: ['enemy', 'humanoid'],
  },
  {
    id: '3',
    title: 'The Silent King',
    category: 'History',
    text: 'A ruler who commanded armies with a gesture.',
    status: 'rumor',
    tags: ['legend', 'royal'],
  },
];

describe('lorekeeper/cache', () => {
  beforeEach(() => {
    clearCache();
  });

  describe('initCache', () => {
    it('loads entries into cache', () => {
      expect(isCacheLoaded()).toBe(false);
      initCache(mockEntries);
      expect(isCacheLoaded()).toBe(true);
      expect(getAllEntries()).toHaveLength(3);
    });
  });

  describe('searchByKeywords', () => {
    beforeEach(() => {
      initCache(mockEntries);
    });

    it('returns empty array when cache not loaded', () => {
      clearCache();
      expect(searchByKeywords(['goblin'])).toEqual([]);
    });

    it('returns empty array for empty keywords', () => {
      expect(searchByKeywords([])).toEqual([]);
    });

    it('finds entries by title match', () => {
      const results = searchByKeywords(['windhollow']);
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Windhollow Vale');
    });

    it('finds entries by text match', () => {
      const results = searchByKeywords(['prairie']);
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Windhollow Vale');
    });

    it('finds entries by tag match', () => {
      const results = searchByKeywords(['enemy']);
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Goblin Scavengers');
    });

    it('ranks title matches higher than text matches', () => {
      const results = searchByKeywords(['goblin']);
      expect(results[0].title).toBe('Goblin Scavengers');
    });

    it('respects limit parameter', () => {
      initCache([...mockEntries, ...mockEntries]); // 6 entries
      const results = searchByKeywords(['a'], 2);
      expect(results).toHaveLength(2);
    });

    it('handles case-insensitive search', () => {
      const results = searchByKeywords(['GOBLIN']);
      expect(results).toHaveLength(1);
    });
  });

  describe('searchByCategory', () => {
    beforeEach(() => {
      initCache(mockEntries);
    });

    it('returns entries matching category', () => {
      const results = searchByCategory('Bestiary');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Goblin Scavengers');
    });

    it('handles case-insensitive category', () => {
      const results = searchByCategory('history');
      expect(results).toHaveLength(1);
    });

    it('returns empty for non-existent category', () => {
      const results = searchByCategory('Magic');
      expect(results).toHaveLength(0);
    });
  });

  describe('getByTitle', () => {
    beforeEach(() => {
      initCache(mockEntries);
    });

    it('returns entry by exact title', () => {
      const entry = getByTitle('Goblin Scavengers');
      expect(entry).not.toBeNull();
      expect(entry?.id).toBe('2');
    });

    it('handles case-insensitive title', () => {
      const entry = getByTitle('goblin scavengers');
      expect(entry).not.toBeNull();
    });

    it('returns null for non-existent title', () => {
      const entry = getByTitle('Unknown Entry');
      expect(entry).toBeNull();
    });
  });
});
