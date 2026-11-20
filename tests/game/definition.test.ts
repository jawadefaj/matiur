// The real game definition (src/game/) loads without Phaser, passes the boot
// checks, and plays through from start to finish.
import { describe, expect, it } from 'vitest';
import type { EpisodeDef } from '../../src/core/contracts';
import { defineEpisode } from '../../src/core/define';
import { t } from '../../src/core/i18n';
import { Flow } from '../../src/core/manager/Flow';
import { validateGame } from '../../src/core/manager/validate';
import { defaultSave, episodeProgress } from '../../src/core/save';
import { GAME } from '../../src/game/game';
import { DESCRIPTORS, EPISODES } from '../../src/game/registry';
import { VIDEOS } from '../../src/core/media/content';
import { flight } from '../../src/mechanics/flight';

const describeStep = (s: EpisodeDef['steps'][number]) =>
  s.kind === 'level' ? DESCRIPTORS[s.mechanic].describe(s.params) : { title: s.id, nextLabel: t('ui.continue') };

describe('game definition', () => {
  it('finds every mechanic and all 12 chapters, in order', () => {
    expect(Object.keys(DESCRIPTORS).sort()).toEqual(['flight', 'walk']);
    expect(EPISODES.map((e) => e.id)).toEqual(Array.from({ length: 12 }, (_, i) => `ch${String(i + 1).padStart(2, '0')}`));
    expect(EPISODES.map((e) => e.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('gives each chapter the mode from the design', () => {
    expect(EPISODES.map((e) => e.mode)).toEqual([
      'cinematic', 'stealth', 'cinematic', 'flight', 'flight', 'cinematic',
      'stealth', 'stealth', 'stealth', 'interaction', 'flight', 'cinematic',
    ]);
  });

  it('passes the boot checks', () => {
    expect(validateGame(EPISODES, DESCRIPTORS, ['flight', 'walk'])).toEqual([]);
  });

  it('opens every chapter from the start', () => {
    const flow = new Flow(GAME, EPISODES, describeStep, false);
    for (const e of EPISODES) expect(flow.isUnlocked(e.id, defaultSave()), e.id).toBe(true);
  });

  it('plays a mode-specific step order in every chapter, ending with the chapter finished', () => {
    const flow = new Flow(GAME, EPISODES, describeStep, false);
    const shape: Record<string, string[]> = {
      cinematic: ['title', 'film', 'archive'],
      stealth: ['title', 'intro', 'play', 'outro'],
      flight: ['title', 'intro', 'play', 'outro'],
      interaction: ['title', 'play', 'film'],
    };
    for (const e of EPISODES) {
      let save = defaultSave();
      const order: string[] = [];
      for (let ref = flow.firstRef(e.id); ref; ref = flow.next(ref)) {
        order.push(ref.split('/')[1]);
        save = flow.onReport(flow.onStart(save, ref), ref, { result: 'complete' });
      }
      expect(order, e.id).toEqual(shape[e.mode!]);
      expect(episodeProgress(save, e.id).finished, e.id).toBe(true);
    }
  });

  it('only uses video clips that exist in assets/videos/', () => {
    for (const e of EPISODES)
      for (const s of e.steps) if (s.kind === 'video') expect(VIDEOS[s.src], `${e.id}/${s.id} plays "${s.src}"`).toBeTruthy();
  });

  it('reports a broken definition', () => {
    const broken = defineEpisode({
      id: 'ep9',
      number: 1,
      kind: 'playable',
      title: 'x',
      date: 'x',
      place: 'x',
      unlock: { after: 'ep0' },
      steps: [
        { kind: 'level', id: 'a', mechanic: 'nope', params: {}, opts: {} },
        { ...flight.level('a', { sortie: 1 }) },
        flight.level('b', { sortie: 9 as 1 }),
        flight.level('title', { sortie: 1 }),
      ],
    });
    const errors = validateGame([...EPISODES, broken], DESCRIPTORS).join('\n');
    expect(errors).toMatch(/number 1/);
    expect(errors).toMatch(/ep0/);
    expect(errors).toMatch(/no mechanic "nope"/);
    expect(errors).toMatch(/two steps in ep9/);
    expect(errors).toMatch(/no sortie 9/);
    expect(errors).toMatch(/title card/);
  });
});
