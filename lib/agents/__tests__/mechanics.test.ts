import { describe, it, expect } from 'vitest';
import {
  rollD20,
  rollDice,
  calculateSkillModifier,
  calculatePowerWordBonus,
  resolveSkillCheck,
  rollDiceNotation,
} from '../mechanics';

describe('mechanics', () => {
  describe('rollD20', () => {
    it('returns value between 1 and 20', () => {
      for (let i = 0; i < 100; i++) {
        const result = rollD20();
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(20);
      }
    });
  });

  describe('rollDice', () => {
    it('returns correct number of dice', () => {
      const result = rollDice(6, 3);
      expect(result).toHaveLength(3);
    });

    it('values are within die range', () => {
      const result = rollDice(6, 10);
      result.forEach(v => {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(6);
      });
    });
  });

  describe('calculateSkillModifier', () => {
    it('returns 0 for levels 0-9', () => {
      expect(calculateSkillModifier(0)).toBe(0);
      expect(calculateSkillModifier(5)).toBe(0);
      expect(calculateSkillModifier(9)).toBe(0);
    });

    it('returns +1 for levels 10-19', () => {
      expect(calculateSkillModifier(10)).toBe(1);
      expect(calculateSkillModifier(15)).toBe(1);
    });

    it('returns +2 for levels 20-29', () => {
      expect(calculateSkillModifier(20)).toBe(2);
      expect(calculateSkillModifier(25)).toBe(2);
    });
  });

  describe('calculatePowerWordBonus', () => {
    it('returns tier value', () => {
      expect(calculatePowerWordBonus(1)).toBe(1);
      expect(calculatePowerWordBonus(2)).toBe(2);
      expect(calculatePowerWordBonus(3)).toBe(3);
    });

    it('returns 0 for undefined', () => {
      expect(calculatePowerWordBonus(undefined)).toBe(0);
    });
  });

  describe('resolveSkillCheck', () => {
    it('calculates total correctly', () => {
      const result = resolveSkillCheck('Melee', 15, 2, 12);
      expect(result.total).toBe(result.rolled + result.modifier + result.bonus);
    });

    it('determines success when total >= DC', () => {
      // Run multiple times to get both outcomes
      let sawSuccess = false;
      let sawFailure = false;
      for (let i = 0; i < 100; i++) {
        const result = resolveSkillCheck('Melee', 0, 0, 10);
        if (result.success) sawSuccess = true;
        else sawFailure = true;
      }
      expect(sawSuccess).toBe(true);
      expect(sawFailure).toBe(true);
    });
  });

  describe('rollDiceNotation', () => {
    it('parses 1d6', () => {
      for (let i = 0; i < 50; i++) {
        const result = rollDiceNotation('1d6');
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(6);
      }
    });

    it('parses 2d6+3', () => {
      for (let i = 0; i < 50; i++) {
        const result = rollDiceNotation('2d6+3');
        expect(result).toBeGreaterThanOrEqual(5);  // 2 + 3
        expect(result).toBeLessThanOrEqual(15);    // 12 + 3
      }
    });

    it('returns 0 for invalid notation', () => {
      expect(rollDiceNotation('invalid')).toBe(0);
    });
  });
});
