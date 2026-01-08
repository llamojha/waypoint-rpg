import { describe, it, expect } from 'vitest';
import { getPowerWordTier, getSkillLevel, findPowerWord } from '../tools/read-handlers';
import type { Character } from '@/types';

const mockCharacter: Character = {
  name: 'Test',
  hp: 20,
  maxHp: 20,
  gold: 100,
  skills: {
    Melee: { level: 15, xp: 500, nextLevel: 1000, verbs: ['strike'] },
    Sneaking: { level: 5, xp: 200, nextLevel: 500, verbs: [] },
  },
  equipment: {
    mainHand: null, offHand: null, head: null, chest: null,
    arms: null, legs: null, cloak: null, trinket: null,
  },
  inventory: [],
  conditions: [],
  isMagicUnlocked: false,
};

describe('read-handlers', () => {
  describe('getPowerWordTier', () => {
    it('finds tier 1 power word', () => {
      const result = getPowerWordTier('strike', 'Melee');
      expect(result).toEqual({ tier: 1, bonus: 1, skill: 'Melee' });
    });

    it('finds tier 2 power word', () => {
      const result = getPowerWordTier('cleave', 'Melee');
      expect(result).toEqual({ tier: 2, bonus: 2, skill: 'Melee' });
    });

    it('finds tier 3 power word', () => {
      const result = getPowerWordTier('disarm', 'Melee');
      expect(result).toEqual({ tier: 3, bonus: 3, skill: 'Melee' });
    });

    it('returns null for unknown word', () => {
      const result = getPowerWordTier('unknown', 'Melee');
      expect(result).toBeNull();
    });

    it('is case insensitive', () => {
      const result = getPowerWordTier('STRIKE', 'Melee');
      expect(result).toEqual({ tier: 1, bonus: 1, skill: 'Melee' });
    });
  });

  describe('findPowerWord', () => {
    it('finds word across all skills', () => {
      const result = findPowerWord('sneak');
      expect(result).toEqual({ tier: 1, bonus: 1, skill: 'Sneaking' });
    });

    it('returns null for unknown word', () => {
      const result = findPowerWord('xyzzy');
      expect(result).toBeNull();
    });
  });

  describe('getSkillLevel', () => {
    it('returns skill data for trained skill', () => {
      const result = getSkillLevel(mockCharacter, 'Melee');
      expect(result).toEqual({ level: 15, xp: 500, nextLevel: 1000 });
    });

    it('returns zeros for untrained skill', () => {
      const result = getSkillLevel(mockCharacter, 'Ranged');
      expect(result).toEqual({ level: 0, xp: 0, nextLevel: 100 });
    });
  });
});
