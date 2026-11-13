// The step order of every episode and what playing a step does to the save.
// Pure: no Phaser, no storage. The GameManager calls it and writes the save.
import type { EpisodeDef, EpisodeMeta, GameDef, Step, StepOutcome } from '../contracts';
import { episodeProgress, type SaveData } from '../save';

/** A step found by its ref ('ep2/sortie-1'). */
export interface ResolvedStep {
  ref: string;
  episode: EpisodeDef;
  step: Step;
  index: number;
}

/** One chapter in the menu: a checkpoint step the player can start from. */
export interface Chapter {
  ref: string;
  title: string;
  done: boolean;
  locked: boolean;
}

/** Chapter title and next-button label for a step. The GameManager asks the mechanic's descriptor for levels. */
export type Describe = (step: Step) => { title: string; nextLabel: string };

/** Id of the title card step that is added to the front of an episode. */
export const TITLE_STEP = 'title';

export const refOf = (ep: string, step: string): string => `${ep}/${step}`;

export function metaOf(e: EpisodeDef): EpisodeMeta {
  return { id: e.id, number: e.number, title: e.title, date: e.date, place: e.place, kind: e.kind };
}

export class Flow {
  readonly episodes: EpisodeDef[];
  /** Open every episode and chapter (set by ?unlock=all in a dev build). */
  unlockAll = false;

  /** `dev` keeps devOnly steps and honours game.dev.unlockAll. */
  constructor(
    readonly game: GameDef,
    episodes: EpisodeDef[],
    private readonly describe: Describe,
    private readonly dev: boolean,
  ) {
    this.episodes = [...episodes].sort((a, b) => a.number - b.number);
  }

  episode(id: string): EpisodeDef | undefined {
    return this.episodes.find((e) => e.id === id);
  }

  /** The episode's steps in play order, with the title card first if it has one. */
  steps(epId: string): Step[] {
    const e = this.episode(epId);
    if (!e) return [];
    const steps = e.steps.filter((s) => this.dev || !s.opts.devOnly);
    if (!e.titleCard) return steps;
    const title: Step = { kind: 'card', id: TITLE_STEP, card: { type: 'title' }, opts: {} };
    return [title, ...steps];
  }

  resolve(ref: string): ResolvedStep | null {
    const slash = ref.indexOf('/');
    if (slash < 0) return null;
    const episode = this.episode(ref.slice(0, slash));
    if (!episode) return null;
    const id = ref.slice(slash + 1);
    const steps = this.steps(episode.id);
    const index = steps.findIndex((s) => s.id === id);
    return index < 0 ? null : { ref, episode, step: steps[index], index };
  }

  firstRef(epId: string): string | null {
    const s = this.steps(epId)[0];
    return s ? refOf(epId, s.id) : null;
  }

  /** The step after `ref` in its episode, or null after the last step. */
  next(ref: string): string | null {
    const r = this.resolve(ref);
    if (!r) return null;
    const s = this.steps(r.episode.id)[r.index + 1];
    return s ? refOf(r.episode.id, s.id) : null;
  }

  /** Label for a "next" button on `ref`'s step, or null after the last step. */
  upNext(ref: string): { label: string } | null {
    const n = this.next(ref);
    const r = n ? this.resolve(n) : null;
    return r ? { label: this.describe(r.step).nextLabel } : null;
  }

  title(step: Step): string {
    return step.opts.title ?? this.describe(step).title;
  }

  isCheckpoint(step: Step): boolean {
    return step.opts.checkpoint ?? step.kind === 'level';
  }

  /** The chapters to list in the menu. With chapters: 'inOrder' a chapter opens when every chapter before it is done. */
  chapters(epId: string, save: SaveData): Chapter[] {
    const p = episodeProgress(save, epId);
    const inOrder = this.game.chapters === 'inOrder' && !this.allOpen;
    let open = true;
    return this.steps(epId)
      .filter((s) => this.isCheckpoint(s))
      .map((s) => {
        const done = p.completed.includes(s.id);
        const ch = { ref: refOf(epId, s.id), title: this.title(s), done, locked: inOrder && !open };
        if (!done) open = false;
        return ch;
      });
  }

  /** Where CONTINUE starts: the saved resume point, else the first step. */
  resumePoint(epId: string, save: SaveData): string | null {
    const resume = episodeProgress(save, epId).resume;
    if (resume && this.resolve(refOf(epId, resume))) return refOf(epId, resume);
    return this.firstRef(epId);
  }

  isUnlocked(epId: string, save: SaveData): boolean {
    const e = this.episode(epId);
    if (!e) return false;
    if (e.unlock === 'always' || save.unlockedEpisodes.includes(epId)) return true;
    if (this.allOpen) return true;
    return episodeProgress(save, e.unlock.after).finished;
  }

  private get allOpen(): boolean {
    return this.unlockAll || (this.dev && this.game.dev.unlockAll);
  }

  /** The save after starting `ref`: it becomes the resume point and counts as seen. */
  onStart(save: SaveData, ref: string): SaveData {
    const r = this.resolve(ref);
    if (!r) return save;
    const p = episodeProgress(save, r.episode.id);
    return {
      ...save,
      episodes: {
        ...save.episodes,
        [r.episode.id]: { ...p, resume: r.step.id, seen: addOnce(p.seen, r.step.id) },
      },
    };
  }

  /**
   * The save after `ref` reports an outcome. A completed step is recorded, the
   * resume point moves on, and finishing the last step finishes the episode
   * and unlocks episodes that wait for it. A failure only records its stats.
   */
  onReport(save: SaveData, ref: string, o: StepOutcome): SaveData {
    const r = this.resolve(ref);
    if (!r) return save;
    const epId = r.episode.id;
    const p = episodeProgress(save, epId);
    const stats = { ...p.stats };
    for (const [k, v] of Object.entries(o.stats ?? {})) stats[`${r.step.id}.${k}`] = v;
    if (o.result !== 'complete') return { ...save, episodes: { ...save.episodes, [epId]: { ...p, stats } } };

    const next = this.next(ref);
    const finished = p.finished || next === null;
    let out: SaveData = {
      ...save,
      episodes: {
        ...save.episodes,
        [epId]: {
          ...p,
          stats,
          completed: addOnce(p.completed, r.step.id),
          resume: next ? next.slice(epId.length + 1) : undefined,
          finished,
        },
      },
    };
    if (r.step.kind === 'card' && r.step.card.type === 'archive') {
      out = { ...out, archiveCards: addOnce(out.archiveCards, r.step.card.cardId) };
    }
    if (finished) {
      const waiting = this.episodes.filter((e) => e.unlock !== 'always' && e.unlock.after === epId).map((e) => e.id);
      out = { ...out, unlockedEpisodes: waiting.reduce(addOnce, out.unlockedEpisodes) };
    }
    return out;
  }
}

function addOnce(list: string[], item: string): string[] {
  return list.includes(item) ? list : [...list, item];
}
