import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        or: vi.fn(() => ({
          limit: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
        ilike: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  })),
}));

import type { QuestStep, QuestRewards, ActiveQuest, QuestState, NpcQuest } from '../quest-agent/handlers';

describe('Quest Agent Types', () => {
  describe('QuestStep', () => {
    it('has correct structure', () => {
      const step: QuestStep = {
        step: 1,
        goal: 'Talk to the captain',
        type: 'dialogue',
      };
      expect(step.step).toBe(1);
      expect(step.goal).toBe('Talk to the captain');
      expect(step.type).toBe('dialogue');
    });

    it('supports all step types', () => {
      const types: QuestStep['type'][] = ['dialogue', 'exploration', 'combat', 'fetch', 'deliver', 'discover'];
      types.forEach(type => {
        const step: QuestStep = { step: 1, goal: 'Test', type };
        expect(step.type).toBe(type);
      });
    });
  });

  describe('QuestRewards', () => {
    it('supports gold rewards', () => {
      const rewards: QuestRewards = { gold: 50 };
      expect(rewards.gold).toBe(50);
    });

    it('supports xp rewards', () => {
      const rewards: QuestRewards = { xp: { Melee: 30, Perception: 20 } };
      expect(rewards.xp?.Melee).toBe(30);
    });

    it('supports item rewards', () => {
      const rewards: QuestRewards = { items: ['Sword', 'Shield'] };
      expect(rewards.items).toHaveLength(2);
    });

    it('supports reputation rewards', () => {
      const rewards: QuestRewards = { reputation: [{ npc: 'Helga', delta: 2 }] };
      expect(rewards.reputation?.[0].npc).toBe('Helga');
    });
  });

  describe('ActiveQuest', () => {
    it('has correct structure', () => {
      const quest: ActiveQuest = {
        id: 'quest-1',
        title: 'The Boar Hunt',
        description: 'Hunt a boar',
        progress: 1,
        totalProgress: 3,
        currentStep: 2,
        currentGoal: 'Hunt the boar',
        steps: [
          { step: 1, goal: 'Find tracks', type: 'exploration' },
          { step: 2, goal: 'Hunt the boar', type: 'combat' },
        ],
        rewards: { gold: 50 },
        giverNpc: 'Adrian',
      };
      expect(quest.currentStep).toBe(2);
      expect(quest.currentGoal).toBe('Hunt the boar');
    });
  });

  describe('QuestState', () => {
    it('includes next goal', () => {
      const state: QuestState = {
        questId: 'quest-1',
        title: 'Test Quest',
        progress: 0,
        totalProgress: 2,
        currentStep: 1,
        currentGoal: 'Step 1',
        nextGoal: 'Step 2',
        steps: [],
        rewards: {},
        status: 'active',
      };
      expect(state.nextGoal).toBe('Step 2');
    });
  });

  describe('NpcQuest', () => {
    it('represents available quest from NPC', () => {
      const quest: NpcQuest = {
        id: 'quest-1',
        title: 'Berry Gathering',
        description: 'Find berries',
        steps: [{ step: 1, goal: 'Find berries', type: 'exploration' }],
        rewards: { gold: 35 },
        totalProgress: 1,
      };
      expect(quest.title).toBe('Berry Gathering');
    });
  });
});
