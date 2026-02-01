import { describe, it, expect } from 'vitest';
import { buildTurnPrompt } from '../prompts';
import type { Character, WorldContext, Turn } from '@/types';
import type { NpcVoice, Atmosphere } from '@/lib/agents/lorekeeper/handlers';

const mockCharacter: Character = {
  id: 'char-1',
  name: 'Test Hero',
  hp: 20,
  maxHp: 20,
  gold: 100,
  skills: {},
  equipment: {
    mainHand: null,
    offHand: null,
    head: null,
    chest: null,
    arms: null,
    legs: null,
    cloak: null,
    trinket: null,
  },
  inventory: [],
  conditions: [],
  isMagicUnlocked: false,
};

const mockWorld: WorldContext = {
  name: 'The Highlands',
  region: 'The Highlands',
  poi: 'The Waystone',
  time: { day: 1, phase: 'Morning' },
  weather: 'Clear',
  description: 'An ancient stone marker',
  tags: [],
  nearbyPoi: ['Village Square'],
  entities: [],
  memory: [],
  activeCombat: null,
};

const mockTurns: Turn[] = [];

describe('buildTurnPrompt', () => {
  it('includes NPC voice data in prompt', () => {
    const npcVoices: NpcVoice[] = [
      { name: 'Mira', personality: ['cunning', 'greedy'], dialogueHints: ['speaks in riddles'], speechPattern: 'speaks in riddles' },
    ];

    const prompt = buildTurnPrompt(
      mockCharacter,
      mockWorld,
      mockTurns,
      'Talk to Mira',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      npcVoices,
      null
    );

    expect(prompt).toContain('NPC VOICE GUIDE');
    expect(prompt).toContain('Mira');
    expect(prompt).toContain('speaks in riddles');
    expect(prompt).toContain('cunning, greedy');
  });

  it('includes atmosphere data in prompt', () => {
    const atmosphere: Atmosphere = {
      mood: 'tense',
      descriptors: ['smoky', 'crowded'],
      ambiance: 'rain pattering',
    };

    const prompt = buildTurnPrompt(
      mockCharacter,
      mockWorld,
      mockTurns,
      'Look around',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      [],
      atmosphere
    );

    expect(prompt).toContain('SCENE ATMOSPHERE');
    expect(prompt).toContain('tense');
    expect(prompt).toContain('smoky, crowded');
    expect(prompt).toContain('rain pattering');
  });

  it('handles empty voice and atmosphere gracefully', () => {
    const prompt = buildTurnPrompt(
      mockCharacter,
      mockWorld,
      mockTurns,
      'Walk forward',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      [],
      null
    );

    // Should not contain these sections when empty
    expect(prompt).not.toContain('NPC VOICE GUIDE');
    expect(prompt).not.toContain('SCENE ATMOSPHERE');
  });
});
