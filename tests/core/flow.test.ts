// The step order and what each step does to the save (src/core/manager/Flow.ts).
import { describe, expect, it } from 'vitest';
import type { EpisodeDef, Step } from '../../src/core/contracts';
import { archiveCard, cutscene, defineEpisode, defineGame, video } from '../../src/core/define';
import { Flow } from '../../src/core/manager/Flow';
import { defaultSave, episodeProgress } from '../../src/core/save';

const lvl = (id: string, extra: Partial<Step['opts']> = {}): Step => ({ kind: 'level', id, mechanic: 'm', params: { id }, opts: extra });
const describeStep = (s: Step) => ({ title: `T:${s.id}`, nextLabel: `GO ${s.id}` });

const ep1: EpisodeDef = defineEpisode({
  id: 'ep1',
  number: 1,
  kind: 'story',
  title: 'One',
  date: 'd',
  place: 'p',
  unlock: 'always',
  steps: [video('intro', { src: 'x' }), lvl('a'), cutscene('beat', { script: 's' }), lvl('b'), lvl('dev', { devOnly: true }), archiveCard('arc', { cardId: 'c1', heading: 'h', text: 't' })],
});
const ep3: EpisodeDef = defineEpisode({ id: 'ep3', number: 3, kind: 'story', title: 'Three', date: 'd', place: 'p', unlock: { after: 'ep1' }, titleCard: false, steps: [lvl('z')] });

const game = defineGame({ title: 'G' });
const flow = (dev = false, g = game) => new Flow(g, [ep3, ep1], describeStep, dev);

/** Complete every step from the start, as a player pressing NEXT would. */
function playThrough(f: Flow, epId: string) {
  let save = defaultSave();
  const visited: string[] = [];
  for (let ref = f.firstRef(epId); ref; ref = f.next(ref)) {
    visited.push(ref);
    save = f.onStart(save, ref);
    save = f.onReport(save, ref, { result: 'complete' });
  }
  return { save, visited };
}

describe('Flow', () => {
  it('sorts episodes by number and adds the title card first', () => {
    const f = flow();
    expect(f.episodes.map((e) => e.id)).toEqual(['ep1', 'ep3']);
    expect(f.steps('ep1').map((s) => s.id)).toEqual(['title', 'intro', 'a', 'beat', 'b', 'arc']);
    expect(f.steps('ep3').map((s) => s.id)).toEqual(['z']);
  });

  it('keeps devOnly steps only in dev builds', () => {
    expect(flow(true).steps('ep1').map((s) => s.id)).toContain('dev');
    expect(flow(false).steps('ep1').map((s) => s.id)).not.toContain('dev');
  });

  it('resolves refs and walks to the next step', () => {
    const f = flow();
    expect(f.resolve('ep1/a')?.step.id).toBe('a');
    expect(f.resolve('ep1/nope')).toBeNull();
    expect(f.resolve('nope/a')).toBeNull();
    expect(f.next('ep1/title')).toBe('ep1/intro');
    expect(f.next('ep1/arc')).toBeNull();
    expect(f.upNext('ep1/a')).toEqual({ label: 'GO beat' });
    expect(f.upNext('ep1/arc')).toBeNull();
  });

  it('records progress, stats, the archive card and the resume point', () => {
    const f = flow();
    let s = f.onStart(defaultSave(), 'ep1/a');
    expect(episodeProgress(s, 'ep1').resume).toBe('a');
    expect(episodeProgress(s, 'ep1').seen).toEqual(['a']);
    s = f.onReport(s, 'ep1/a', { result: 'failed', stats: { time: '1:00' } });
    expect(episodeProgress(s, 'ep1').completed).toEqual([]);
    expect(episodeProgress(s, 'ep1').stats).toEqual({ 'a.time': '1:00' });
    s = f.onReport(s, 'ep1/a', { result: 'complete', stats: { time: '0:50' } });
    expect(episodeProgress(s, 'ep1').completed).toEqual(['a']);
    expect(episodeProgress(s, 'ep1').stats['a.time']).toBe('0:50');
    // CONTINUE after a completed step starts the step after it.
    expect(episodeProgress(s, 'ep1').resume).toBe('beat');
    expect(f.resumePoint('ep1', s)).toBe('ep1/beat');
  });

  it('finishes the episode on its last step and unlocks the episodes waiting for it', () => {
    const f = flow();
    expect(f.isUnlocked('ep3', defaultSave())).toBe(false);
    const { save, visited } = playThrough(f, 'ep1');
    expect(visited).toEqual(['ep1/title', 'ep1/intro', 'ep1/a', 'ep1/beat', 'ep1/b', 'ep1/arc']);
    const p = episodeProgress(save, 'ep1');
    expect(p.finished).toBe(true);
    expect(p.resume).toBeUndefined();
    expect(save.archiveCards).toEqual(['c1']);
    expect(save.unlockedEpisodes).toEqual(['ep3']);
    expect(f.isUnlocked('ep3', save)).toBe(true);
    expect(f.resumePoint('ep1', save)).toBe('ep1/title');
  });

  it('unlocks by save or by dev unlockAll', () => {
    expect(flow().isUnlocked('ep3', { ...defaultSave(), unlockedEpisodes: ['ep3'] })).toBe(true);
    const dev = defineGame({ title: 'G', dev: { unlockAll: true, skipKey: false } });
    expect(flow(true, dev).isUnlocked('ep3', defaultSave())).toBe(true);
    expect(flow(false, dev).isUnlocked('ep3', defaultSave())).toBe(false);
  });

  it('lists checkpoints as chapters: levels by default, others when asked', () => {
    const f = flow();
    expect(f.chapters('ep1', defaultSave()).map((c) => c.title)).toEqual(['T:a', 'T:b']);
    const withTitle = defineEpisode({ ...ep1, id: 'ep9', number: 9, steps: [lvl('a', { title: 'Named' }), video('v', { src: 'x' }, { checkpoint: true })] });
    const f2 = new Flow(game, [withTitle], describeStep, false);
    expect(f2.chapters('ep9', defaultSave()).map((c) => c.title)).toEqual(['Named', 'T:v']);
  });

  it("locks chapters in order only with chapters: 'inOrder'", () => {
    const inOrder = defineGame({ title: 'G', chapters: 'inOrder' });
    let s = defaultSave();
    expect(flow(false, inOrder).chapters('ep1', s).map((c) => c.locked)).toEqual([false, true]);
    expect(flow(false, game).chapters('ep1', s).map((c) => c.locked)).toEqual([false, false]);
    s = flow(false, inOrder).onReport(s, 'ep1/a', { result: 'complete' });
    expect(flow(false, inOrder).chapters('ep1', s).map((c) => [c.done, c.locked])).toEqual([
      [true, false],
      [false, false],
    ]);
  });

  it('falls back to the first step when the saved resume step no longer exists', () => {
    const s = defaultSave();
    s.episodes.ep1 = { ...episodeProgress(s, 'ep1'), resume: 'removed-step' };
    expect(flow().resumePoint('ep1', s)).toBe('ep1/title');
  });
});
