import { describe, it, expect } from 'vitest';
import {
  collectParallelOutputs,
  buildChroniclerContext,
} from '../collector';
import type { ArbiterOutput } from '../arbiter';
import type { LorekeeperOutput } from '../lorekeeper';
import type { ApplyEventsResult } from '@/lib/turn/apply';

const mockArbiterOutput: ArbiterOutput = {
  results: [],
  approved: [
    { type: 'propose_stat_change', data: { stat: 'hp', delta: -5, reason: 'Damage' } },
  ],
  rejected: [],
};

const mockLorekeeperOutput: LorekeeperOutput = {
  npcsPresent: [
    { id: '1', name: 'Lucie', role: 'Scholar', personality: ['shy'], dialogueHints: ['Researching'] },
  ],
  locationDetails: { name: 'The Waystone', type: 'landmark', region: 'The Highlands', description: 'Ancient stone' },
  codexSnippets: [
    { id: 'c1', title: 'Waystones', category: 'History', text: 'Ancient markers', status: 'canon', tags: [] },
  ],
  npcVoices: [
    { name: 'Lucie', personality: ['shy', 'curious'], dialogueHints: ['Researching ancient texts'], speechPattern: 'speaks softly' },
  ],
  atmosphere: { mood: 'calm', descriptors: ['ancient', 'mystical'], ambiance: 'clear skies' },
};

const mockApplyResult: ApplyEventsResult = {
  characterUpdates: { hp: 15 },
  worldUpdates: {},
  diffs: [{ type: 'stat', text: 'HP', value: '-5' }],
  relationshipChanges: [],
  questChanges: [],
  combatEvents: [],
  consequences: [
    { type: 'character_critical_hp', hp: 15, maxHp: 20 },
  ],
};

describe('collector', () => {
  describe('collectParallelOutputs', () => {
    it('merges arbiter and lorekeeper outputs', () => {
      const result = collectParallelOutputs(mockArbiterOutput, mockLorekeeperOutput);
      
      expect(result.arbiter).toBe(mockArbiterOutput);
      expect(result.lore).toBe(mockLorekeeperOutput);
    });
  });

  describe('buildChroniclerContext', () => {
    it('builds full context for Chronicler', () => {
      const collected = collectParallelOutputs(mockArbiterOutput, mockLorekeeperOutput);
      const context = buildChroniclerContext(collected, mockApplyResult);

      expect(context.approvedEvents).toBe(mockArbiterOutput.approved);
      expect(context.npcsPresent).toBe(mockLorekeeperOutput.npcsPresent);
      expect(context.locationDetails).toBe(mockLorekeeperOutput.locationDetails);
      expect(context.codexSnippets).toBe(mockLorekeeperOutput.codexSnippets);
      expect(context.consequences).toBe(mockApplyResult.consequences);
      expect(context.finalCharacterState).toBe(mockApplyResult.characterUpdates);
      expect(context.finalWorldState).toBe(mockApplyResult.worldUpdates);
    });

    it('includes consequences from apply result', () => {
      const collected = collectParallelOutputs(mockArbiterOutput, mockLorekeeperOutput);
      const context = buildChroniclerContext(collected, mockApplyResult);

      expect(context.consequences).toHaveLength(1);
      expect(context.consequences[0].type).toBe('character_critical_hp');
    });

    it('includes npcVoices and atmosphere from lorekeeper', () => {
      const collected = collectParallelOutputs(mockArbiterOutput, mockLorekeeperOutput);
      const context = buildChroniclerContext(collected, mockApplyResult);

      expect(context.npcVoices).toHaveLength(1);
      expect(context.npcVoices[0].name).toBe('Lucie');
      expect(context.npcVoices[0].speechPattern).toBe('speaks softly');
      expect(context.atmosphere).not.toBeNull();
      expect(context.atmosphere?.mood).toBe('calm');
      expect(context.atmosphere?.descriptors).toContain('ancient');
    });
  });
});
