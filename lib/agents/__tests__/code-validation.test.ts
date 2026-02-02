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
  activeCombat: null,
};

const ctx: CodeValidationContext = {
  character: mockCharacter,
  world: mockWorld,
  validLocations: ['Town Square', 'Market', 'Tavern'],
};

describe('code-validation', () => {
  describe('relationship cap', () => {
    it('allows delta within ±2', async () => {
      const proposal: ProposalResult = {
        type: 'propose_relationship_change',
        data: { npc: 'Bob', delta: 2, reason: 'Helped' },
      };
      const result = await runCodeValidation(proposal, ctx);
      expect(result.valid).toBe(true);
      expect(result.modified).toBeUndefined();
    });

    it('caps delta > 2 to 2', async () => {
      const proposal: ProposalResult = {
        type: 'propose_relationship_change',
        data: { npc: 'Bob', delta: 5, reason: 'Saved life' },
      };
      const result = await runCodeValidation(proposal, ctx);
      expect(result.valid).toBe(true);
      expect(result.modified).toBeDefined();
      expect((result.modified as any).data.delta).toBe(2);
    });

    it('caps delta < -2 to -2', async () => {
      const proposal: ProposalResult = {
        type: 'propose_relationship_change',
        data: { npc: 'Bob', delta: -10, reason: 'Betrayal' },
      };
      const result = await runCodeValidation(proposal, ctx);
      expect(result.modified).toBeDefined();
      expect((result.modified as any).data.delta).toBe(-2);
    });
  });

  describe('HP bounds', () => {
    it('allows valid HP change', async () => {
      const proposal: ProposalResult = {
        type: 'propose_stat_change',
        data: { stat: 'hp', delta: -5, reason: 'Damage' },
      };
      const result = await runCodeValidation(proposal, ctx);
      expect(result.valid).toBe(true);
    });

    it('caps HP to not go below 0', async () => {
      const proposal: ProposalResult = {
        type: 'propose_stat_change',
        data: { stat: 'hp', delta: -20, reason: 'Big damage' },
      };
      const result = await runCodeValidation(proposal, ctx);
      expect(result.valid).toBe(true);
      expect((result.modified as any).data.delta).toBe(-15); // 15 - 15 = 0
    });

    it('caps HP to not exceed maxHp', async () => {
      const proposal: ProposalResult = {
        type: 'propose_stat_change',
        data: { stat: 'hp', delta: 10, reason: 'Healing' },
      };
      const result = await runCodeValidation(proposal, ctx);
      expect(result.valid).toBe(true);
      expect((result.modified as any).data.delta).toBe(5); // 15 + 5 = 20 (maxHp)
    });
  });

  describe('gold bounds', () => {
    it('allows valid gold change', async () => {
      const proposal: ProposalResult = {
        type: 'propose_stat_change',
        data: { stat: 'gold', delta: -30, reason: 'Purchase' },
      };
      const result = await runCodeValidation(proposal, ctx);
      expect(result.valid).toBe(true);
    });

    it('rejects gold going negative', async () => {
      const proposal: ProposalResult = {
        type: 'propose_stat_change',
        data: { stat: 'gold', delta: -100, reason: 'Too expensive' },
      };
      const result = await runCodeValidation(proposal, ctx);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Insufficient gold');
    });
  });

  describe('location change', () => {
    it('allows travel to nearby location', async () => {
      const proposal: ProposalResult = {
        type: 'propose_location_change',
        data: { location: 'Market', reason: 'Travel' },
      };
      const result = await runCodeValidation(proposal, ctx);
      expect(result.valid).toBe(true);
    });

    it('rejects travel to invalid location', async () => {
      const proposal: ProposalResult = {
        type: 'propose_location_change',
        data: { location: 'Mordor', reason: 'Travel' },
      };
      const result = await runCodeValidation(proposal, ctx);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('not a known location');
    });
  });

  describe('inventory remove', () => {
    it('allows removing existing item', async () => {
      const proposal: ProposalResult = {
        type: 'propose_inventory_remove',
        data: { item_name: 'Sword', reason: 'Dropped' },
      };
      const result = await runCodeValidation(proposal, ctx);
      expect(result.valid).toBe(true);
    });

    it('rejects removing non-existent item', async () => {
      const proposal: ProposalResult = {
        type: 'propose_inventory_remove',
        data: { item_name: 'Magic Wand', reason: 'Use' },
      };
      const result = await runCodeValidation(proposal, ctx);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('not in inventory');
    });
  });

  describe('relationship polite action validation', () => {
    it('rejects negative delta for "thank you" actions', async () => {
      const proposal: ProposalResult = {
        type: 'propose_relationship_change',
        data: { npc: 'Bob', delta: -1, reason: 'Left conversation' },
      };
      const ctxWithAction = { ...ctx, playerAction: "Thank you for your help, I'll go talk to Alice now" };
      const result = await runCodeValidation(proposal, ctxWithAction);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('polite');
    });

    it('rejects negative delta for farewell actions', async () => {
      const proposal: ProposalResult = {
        type: 'propose_relationship_change',
        data: { npc: 'Bob', delta: -1, reason: 'Goodbye' },
      };
      const ctxWithAction = { ...ctx, playerAction: "Goodbye Bob, take care!" };
      const result = await runCodeValidation(proposal, ctxWithAction);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('polite');
    });

    it('allows negative delta for hostile actions', async () => {
      const proposal: ProposalResult = {
        type: 'propose_relationship_change',
        data: { npc: 'Bob', delta: -2, reason: 'Insulted' },
      };
      const ctxWithAction = { ...ctx, playerAction: "I insult Bob and call him a fool" };
      const result = await runCodeValidation(proposal, ctxWithAction);
      expect(result.valid).toBe(true);
    });

    it('allows positive delta for polite actions', async () => {
      const proposal: ProposalResult = {
        type: 'propose_relationship_change',
        data: { npc: 'Alice', delta: 1, reason: 'Friendly greeting' },
      };
      const ctxWithAction = { ...ctx, playerAction: "Thank you Alice, I appreciate your help" };
      const result = await runCodeValidation(proposal, ctxWithAction);
      expect(result.valid).toBe(true);
    });

    it('allows negative delta when action is both polite and hostile', async () => {
      const proposal: ProposalResult = {
        type: 'propose_relationship_change',
        data: { npc: 'Bob', delta: -1, reason: 'Threatened' },
      };
      const ctxWithAction = { ...ctx, playerAction: "Thanks for nothing, I threaten to report you" };
      const result = await runCodeValidation(proposal, ctxWithAction);
      expect(result.valid).toBe(true);
    });

    it('rejects relationship change for NPC mentioned only in future intent', async () => {
      const proposal: ProposalResult = {
        type: 'propose_relationship_change',
        data: { npc: 'Alice', delta: 1, reason: 'Going to talk' },
      };
      const ctxWithAction = { ...ctx, playerAction: "I'll go talk to Alice now" };
      const result = await runCodeValidation(proposal, ctxWithAction);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('future intent');
    });

    it('allows relationship change when NPC is directly addressed', async () => {
      const proposal: ProposalResult = {
        type: 'propose_relationship_change',
        data: { npc: 'Alice', delta: 1, reason: 'Greeted' },
      };
      const ctxWithAction = { ...ctx, playerAction: "Hello Alice, how are you today?" };
      const result = await runCodeValidation(proposal, ctxWithAction);
      expect(result.valid).toBe(true);
    });
  });
});
