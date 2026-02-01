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
    title: 'The Highlands',
    category: 'Locations',
    text: 'A peaceful upland region known for rolling grasslands.',
    status: 'canon',
    tags: ['region', 'safe', 'highlands'],
  },
  {
    id: '2',
    title: 'Highlands Wolves',
    category: 'Bestiary',
    text: 'Grey wolves that hunt in packs across the highlands.',
    status: 'canon',
    tags: ['enemy', 'wildlife'],
  },
  {
    id: '3',
    title: 'The Bandit Problem',
    category: 'History',
    text: 'Outlaws have plagued the trade roads for years.',
    status: 'canon',
    tags: ['threat', 'humanoid'],
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
      expect(searchByKeywords(['wolf'])).toEqual([]);
    });

    it('returns empty array for empty keywords', () => {
      expect(searchByKeywords([])).toEqual([]);
    });

    it('finds entries by title match', () => {
      const results = searchByKeywords(['highlands']);
      expect(results).toHaveLength(2); // Both "The Highlands" and "Highlands Wolves"
      expect(results.map(r => r.title)).toContain('The Highlands');
    });

    it('finds entries by text match', () => {
      const results = searchByKeywords(['upland']);
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('The Highlands');
    });

    it('finds entries by tag match', () => {
      const results = searchByKeywords(['enemy']);
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Highlands Wolves');
    });

    it('ranks title matches higher than text matches', () => {
      const results = searchByKeywords(['wolves']);
      expect(results[0].title).toBe('Highlands Wolves');
    });

    it('respects limit parameter', () => {
      initCache([...mockEntries, ...mockEntries]); // 6 entries
      const results = searchByKeywords(['a'], 2);
      expect(results).toHaveLength(2);
    });

    it('handles case-insensitive search', () => {
      const results = searchByKeywords(['WOLVES']);
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
      expect(results[0].title).toBe('Highlands Wolves');
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
      const entry = getByTitle('Highlands Wolves');
      expect(entry).not.toBeNull();
      expect(entry?.id).toBe('2');
    });

    it('handles case-insensitive title', () => {
      const entry = getByTitle('highlands wolves');
      expect(entry).not.toBeNull();
    });

    it('returns null for non-existent title', () => {
      const entry = getByTitle('Unknown Entry');
      expect(entry).toBeNull();
    });
  });
});
