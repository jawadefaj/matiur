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
import { flight } from '../../src/mechanics/flight';

const describeStep = (s: EpisodeDef['steps'][number]) =>
  s.kind === 'level' ? DESCRIPTORS[s.mechanic].describe(s.params) : { title: s.id, nextLabel: t('ui.continue') };

describe('game definition', () => {
  it('finds every mechanic and episode', () => {
    expect(Object.keys(DESCRIPTORS).sort()).toEqual(['flight', 'walk']);
    expect(EPISODES.map((e) => e.id)).toContain('ep2');
    expect(EPISODES.map((e) => e.id)).toEqual(['ep2', 'level2']);
  });

  it('passes the boot checks', () => {
    expect(validateGame(EPISODES, DESCRIPTORS, ['flight', 'walk'])).toEqual([]);
  });

  it('keeps the Episode 2 step ids that old saves migrate to', () => {
    const ids = EPISODES.find((e) => e.id === 'ep2')!.steps.map((s) => s.id);
    for (const id of ['sortie-1', 'sortie-2', 'sortie-3']) expect(ids).toContain(id);
  });

  it('plays Episode 2 from the title card to the archive card', () => {
    const flow = new Flow(GAME, EPISODES, describeStep, false);
    let save = defaultSave();
    const order: string[] = [];
    for (let ref = flow.firstRef('ep2'); ref; ref = flow.next(ref)) {
      order.push(ref.split('/')[1]);
      save = flow.onReport(flow.onStart(save, ref), ref, { result: 'complete' });
    }
    expect(order).toEqual([
      'title',
      'opening',
      'flight-line',
      'sortie-1',
      'between-1',
      'orange-raid',
      'sortie-2',
      'pre-sortie-3',
      'mission-3',
      'sortie-3',
      'after-sortie-3',
      'archive',
    ]);
    expect(episodeProgress(save, 'ep2').finished).toBe(true);
    expect(flow.chapters('ep2', save).map((c) => c.title)).toEqual([
      t('flight.sortieTitle', { n: 1, title: t('s1.title') }),
      t('orchard.title'),
      t('flight.sortieTitle', { n: 2, title: t('s2.title') }),
      t('flight.sortieTitle', { n: 3, title: t('s3.title') }),
    ]);
  });

  it('plays Level 2 from the title card to the archive card', () => {
    const flow = new Flow(GAME, EPISODES, describeStep, false);
    let save = defaultSave();
    const order: string[] = [];
    for (let ref = flow.firstRef('level2'); ref; ref = flow.next(ref)) {
      order.push(ref.split('/')[1]);
      save = flow.onReport(flow.onStart(save, ref), ref, { result: 'complete' });
    }
    expect(order).toEqual(['title', 'prologue-1', 'prologue-2', 'schedule', 'dispensary', 'morning', 'intercept', 'boarding', 'archive']);
    expect(episodeProgress(save, 'level2').finished).toBe(true);
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
