import { describe, it, expect } from 'vitest';
import { runCodeValidation, CodeValidationContext } from '../arbiter/code-validation';
import type { ProposalResult } from '../tools/proposal-tools';
import type { Character, WorldContext } from '@/types';

const mockCharacter: Character = {
  name: 'Test',
  hp: 15,
  maxHp: 20,
  gold: 50,
  skills: {},
  equipment: {
    mainHand: null, offHand: null, head: null, chest: null,
    arms: null, legs: null, cloak: null, trinket: null,
  },
  inventory: [{ id: '1', name: 'Sword', type: 'weapon', tags: [], description: '' }],
  conditions: [],
  isMagicUnlocked: false,
};

const mockWorld: WorldContext = {
  name: 'Test World',
  region: 'Test Region',
  poi: 'Town Square',
  time: { day: 1, phase: 'Morning' },
  weather: 'Clear',
  description: 'A test location',
  tags: [],
  nearbyPoi: ['Market', 'Tavern'],
  entities: ['Bob', 'Alice'], // NPCs present for relationship tests
  memory: [],
};

const ctx: CodeValidationContext = {
  character: mockCharacter,
  world: mockWorld,
  validLocations: ['Town Square', 'Market', 'Tavern'],
};

describe('code-validation', () => {
  describe('relationship cap', () => {
    it('allows delta within ±2', () => {
      const proposal: ProposalResult = {
        type: 'propose_relationship_change',
        data: { npc: 'Bob', delta: 2, reason: 'Helped' },
      };
      const result = runCodeValidation(proposal, ctx);
      expect(result.valid).toBe(true);
      expect(result.modified).toBeUndefined();
    });

    it('caps delta > 2 to 2', () => {
      const proposal: ProposalResult = {
        type: 'propose_relationship_change',
        data: { npc: 'Bob', delta: 5, reason: 'Saved life' },
      };
      const result = runCodeValidation(proposal, ctx);
      expect(result.valid).toBe(true);
      expect(result.modified).toBeDefined();
      expect((result.modified as any).data.delta).toBe(2);
    });

    it('caps delta < -2 to -2', () => {
      const proposal: ProposalResult = {
        type: 'propose_relationship_change',
        data: { npc: 'Bob', delta: -10, reason: 'Betrayal' },
      };
      const result = runCodeValidation(proposal, ctx);
      expect(result.modified).toBeDefined();
      expect((result.modified as any).data.delta).toBe(-2);
    });
  });

  describe('HP bounds', () => {
    it('allows valid HP change', () => {
      const proposal: ProposalResult = {
        type: 'propose_stat_change',
        data: { stat: 'hp', delta: -5, reason: 'Damage' },
      };
      const result = runCodeValidation(proposal, ctx);
      expect(result.valid).toBe(true);
    });

    it('caps HP to not go below 0', () => {
      const proposal: ProposalResult = {
        type: 'propose_stat_change',
        data: { stat: 'hp', delta: -20, reason: 'Big damage' },
      };
      const result = runCodeValidation(proposal, ctx);
      expect(result.valid).toBe(true);
      expect((result.modified as any).data.delta).toBe(-15); // 15 - 15 = 0
    });

    it('caps HP to not exceed maxHp', () => {
      const proposal: ProposalResult = {
        type: 'propose_stat_change',
        data: { stat: 'hp', delta: 10, reason: 'Healing' },
      };
      const result = runCodeValidation(proposal, ctx);
      expect(result.valid).toBe(true);
      expect((result.modified as any).data.delta).toBe(5); // 15 + 5 = 20 (maxHp)
    });
  });

  describe('gold bounds', () => {
    it('allows valid gold change', () => {
      const proposal: ProposalResult = {
        type: 'propose_stat_change',
        data: { stat: 'gold', delta: -30, reason: 'Purchase' },
      };
      const result = runCodeValidation(proposal, ctx);
      expect(result.valid).toBe(true);
    });

    it('rejects gold going negative', () => {
      const proposal: ProposalResult = {
        type: 'propose_stat_change',
        data: { stat: 'gold', delta: -100, reason: 'Too expensive' },
      };
      const result = runCodeValidation(proposal, ctx);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Insufficient gold');
    });
  });

  describe('location change', () => {
    it('allows travel to nearby location', () => {
      const proposal: ProposalResult = {
        type: 'propose_location_change',
        data: { location: 'Market', reason: 'Travel' },
      };
      const result = runCodeValidation(proposal, ctx);
      expect(result.valid).toBe(true);
    });

    it('rejects travel to invalid location', () => {
      const proposal: ProposalResult = {
        type: 'propose_location_change',
        data: { location: 'Mordor', reason: 'Travel' },
      };
      const result = runCodeValidation(proposal, ctx);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('not a known location');
    });
  });

  describe('inventory remove', () => {
    it('allows removing existing item', () => {
      const proposal: ProposalResult = {
        type: 'propose_inventory_remove',
        data: { item_name: 'Sword', reason: 'Dropped' },
      };
      const result = runCodeValidation(proposal, ctx);
      expect(result.valid).toBe(true);
    });

    it('rejects removing non-existent item', () => {
      const proposal: ProposalResult = {
        type: 'propose_inventory_remove',
        data: { item_name: 'Magic Wand', reason: 'Use' },
      };
      const result = runCodeValidation(proposal, ctx);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('not in inventory');
    });
  });
});
