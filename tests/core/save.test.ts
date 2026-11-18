// Save parsing and the migration from the v1 save (src/core/save.ts).
import { describe, expect, it } from 'vitest';
import { defaultSave, migrateV1, parseSave } from '../../src/core/save';

describe('save', () => {
  it('gives the defaults when nothing is stored', () => {
    expect(parseSave(null)).toEqual({ save: defaultSave(), source: 'none' });
  });

  it('migrates a v1 save: cleared sorties, unlocked episodes and settings', () => {
    const v1 = { version: 1, unlockedEpisodes: [2], ep2: { sortiesCleared: [1, 3] }, settings: { lang: 'bn', haptics: false, gunsMode: 'hold' } };
    const { save, source } = parseSave(JSON.stringify(v1));
    expect(source).toBe('v1');
    expect(save.version).toBe(2);
    expect(save.unlockedEpisodes).toEqual(['ep2']);
    // These ids must match the step ids in src/game/episodes/ep2.sabre-skies.ts.
    expect(save.episodes.ep2.completed).toEqual(['sortie-1', 'sortie-3']);
    expect(save.settings).toEqual({ lang: 'bn', haptics: false });
    expect(save.mechanics).toEqual({ flight: { gunsMode: 'hold' } });
  });

  it('migrates an empty v1 save to the defaults', () => {
    expect(migrateV1({ version: 1 })).toEqual(defaultSave());
  });

  it('treats unreadable data as corrupt and a newer version as newer', () => {
    expect(parseSave('{not json').source).toBe('corrupt');
    expect(parseSave('"a string"').source).toBe('corrupt');
    expect(parseSave(JSON.stringify({ version: 'x' })).source).toBe('corrupt');
    const newer = parseSave(JSON.stringify({ version: 3, anything: true }));
    expect(newer.source).toBe('newer');
    expect(newer.save).toEqual(defaultSave());
  });

  it('fills in fields a v2 save lacks', () => {
    const { save, source } = parseSave(JSON.stringify({ version: 2, episodes: { ep2: { completed: ['a'], seen: [], finished: false, stats: {} } } }));
    expect(source).toBe('v2');
    expect(save.settings).toEqual({ lang: 'en', haptics: true });
    expect(save.mechanics).toEqual({});
    expect(save.archiveCards).toEqual([]);
    expect(save.episodes.ep2.completed).toEqual(['a']);
  });
});
