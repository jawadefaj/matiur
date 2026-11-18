// Runs the game from its definition: opens the menu, plays steps in order,
// saves progress. Every step's scene gets a StepHost as its scene data and
// reports back through it, so no scene ever starts another.
import Phaser from 'phaser';
import type {
  EpisodeDef,
  GameDef,
  MechanicDescriptor,
  SettingValue,
  Stats,
  Step,
  StepHost,
  StepOutcome,
} from '../contracts';
import type { MechanicRuntime } from '../runtime';
import type { VideoPlayer } from '../media/VideoPlayer';
import { episodeProgress, loadSave, mechanicSetting, setMechanicSetting, writeSave } from '../save';
import { parseDeepLink } from './deeplink';
import { Flow, metaOf } from './Flow';

/** Everything the game is made of: found by src/game/registry.ts and runtimes.ts. */
export interface GameParts {
  game: GameDef;
  episodes: EpisodeDef[];
  descriptors: Record<string, MechanicDescriptor>;
  runtimes: Record<string, MechanicRuntime>;
}

/** Scene keys of the manager's own scenes (src/core/scenes/). */
export const CORE_SCENES = {
  boot: 'core:Boot',
  menu: 'core:Menu',
  card: 'core:Card',
  video: 'core:Video',
  cutscene: 'core:Cutscene',
} as const;

/** Data the menu scene is started with. */
export interface MenuData {
  /** Open this episode's screen instead of the episode list. */
  episode?: string;
}

/** The GameManager stored on the Phaser game. Every scene can reach it. */
export function gmOf(scene: Phaser.Scene): GameManager {
  return scene.registry.get('gm') as GameManager;
}

export class GameManager {
  readonly flow: Flow;
  /** The host of the step that is playing, or null in the menu. */
  private current: Host | null = null;
  /** Bumped on every scene switch; hosts from older runs are ignored. */
  private runId = 0;
  /** The one scene switch waiting for the end of this frame (later requests replace it). */
  private pending: (() => void) | null = null;

  constructor(
    private readonly game: Phaser.Game,
    readonly parts: GameParts,
    readonly video: VideoPlayer,
  ) {
    this.flow = new Flow(parts.game, parts.episodes, (s) => this.describe(s), import.meta.env.DEV);
    // Switch scenes between frames, never in the middle of a scene's update:
    // SceneManager.start runs at once, and hosts are called from update loops,
    // timers and button handlers.
    game.events.on(Phaser.Core.Events.POST_STEP, () => {
      const p = this.pending;
      this.pending = null;
      p?.();
    });
  }

  /** Called by the boot scene once the art is ready: follow the URL, else open the menu. */
  boot(search: string): void {
    const { link, unlockAll, warning } = parseDeepLink(search);
    if (warning) console.warn(warning);
    this.flow.unlockAll = import.meta.env.DEV && unlockAll;
    if (link.kind === 'episode') {
      if (this.flow.episode(link.episode)) return this.startEpisode(link.episode, 'start');
      console.warn(`No episode "${link.episode}". Episodes: ${this.flow.episodes.map((e) => e.id).join(', ')}`);
    } else if (link.kind === 'step') {
      if (this.flow.resolve(link.ref)) return this.startStep(link.ref, { only: link.only });
      console.warn(`No step "${link.ref}". Use ?level=<episode>/<step id>, e.g. ${this.flow.firstRef(this.flow.episodes[0]?.id ?? '')}`);
    } else if (link.kind === 'play') {
      if (this.playAdHoc(link.what, link.params)) return;
    }
    this.openMenu();
  }

  // ---------------------------------------------------------------------------
  // Navigation

  openMenu(episode?: string): void {
    this.current = null;
    this.switchTo(CORE_SCENES.menu, { episode } satisfies MenuData);
  }

  /** Play an episode from its first step or from where the player left off. */
  startEpisode(epId: string, from: 'start' | 'resume'): void {
    const ref = from === 'resume' ? this.flow.resumePoint(epId, loadSave()) : this.flow.firstRef(epId);
    if (ref) this.startStep(ref);
  }

  /** Play one step. Unless `only`, the episode carries on after it. */
  startStep(ref: string, o: { only?: boolean; attempt?: number } = {}): void {
    const r = this.flow.resolve(ref);
    if (!r) {
      console.warn(`No step "${ref}"`);
      this.openMenu();
      return;
    }
    let save = loadSave();
    const p = episodeProgress(save, r.episode.id);
    const seen = p.seen.includes(r.step.id) || p.completed.includes(r.step.id);
    save = this.flow.onStart(save, ref);
    writeSave(save);
    const only = !!o.only;
    this.begin({
      step: r.step,
      ref,
      only,
      attempt: o.attempt ?? 1,
      firstTime: !seen,
      canSkip: this.canSkip(r.step, seen),
      upNext: only ? null : this.flow.upNext(ref),
      episode: r.episode,
    });
  }

  /**
   * Play a mechanic level, video or cutscene from URL params, outside any
   * episode (nothing is saved). Returns false if the params don't make one.
   */
  playAdHoc(what: string, q: URLSearchParams, attempt = 1): boolean {
    let step: Step | null = null;
    if (what === 'video') {
      const src = q.get('src');
      if (src) step = { kind: 'video', id: 'play', src, fit: 'contain', muted: false, fallback: [`(no video "${src}" in assets/video/)`], opts: {} };
    } else if (what === 'cutscene') {
      const script = q.get('script');
      if (script) step = { kind: 'cutscene', id: 'play', script, opts: {} };
    } else {
      const d = this.parts.descriptors[what];
      const params = d?.parseParams(q);
      if (!d || !params) {
        console.warn(`?play=${what}: ${d ? 'missing or invalid level params' : `no mechanic "${what}". Mechanics: ${Object.keys(this.parts.descriptors).join(', ')}`}`);
        return false;
      }
      step = d.level('play', params);
    }
    if (!step) return false;
    this.begin({ step, ref: null, only: true, attempt, firstTime: true, canSkip: true, upNext: null, episode: null, adHoc: { what, q } });
    return true;
  }

  /** Dev builds: the N key finishes whatever step is running and moves on. */
  finishCurrent(): void {
    this.current?.forceFinish();
  }

  // ---------------------------------------------------------------------------
  // Internals

  private begin(o: {
    step: Step;
    ref: string | null;
    only: boolean;
    attempt: number;
    firstTime: boolean;
    canSkip: boolean;
    upNext: { label: string } | null;
    episode: EpisodeDef | null;
    adHoc?: { what: string; q: URLSearchParams };
  }): void {
    const scene = this.sceneFor(o.step);
    if (!scene) {
      console.error(`No scene can play step ${o.ref ?? o.step.id}`);
      this.openMenu();
      return;
    }
    const id = this.runId + 1;
    const host = new Host(this, id, o);
    this.current = host;
    this.switchTo(scene, { host });
  }

  /** The step's next step, or the menu after the last one (or after an `only` / ad-hoc run). */
  goNext(from: Host): void {
    const next = from.ref && !from.only ? this.flow.next(from.ref) : null;
    if (next) this.startStep(next);
    else this.openMenu(from.episode?.id);
  }

  replay(from: Host): void {
    if (from.ref) this.startStep(from.ref, { only: from.only, attempt: from.attempt + 1 });
    else if (from.adHoc) this.playAdHoc(from.adHoc.what, from.adHoc.q, from.attempt + 1);
  }

  save(ref: string, outcome: StepOutcome): void {
    writeSave(this.flow.onReport(loadSave(), ref, outcome));
  }

  isCurrent(runId: number): boolean {
    return runId === this.runId;
  }

  settingOwner(step: Step): string {
    return step.kind === 'level' ? step.mechanic : step.kind;
  }

  settingDefault(owner: string, key: string): SettingValue | undefined {
    return this.parts.descriptors[owner]?.settings.find((s) => s.key === key)?.default;
  }

  private sceneFor(step: Step): string | null {
    switch (step.kind) {
      case 'level':
        return this.parts.runtimes[step.mechanic]?.entryScene ?? null;
      case 'video':
        return CORE_SCENES.video;
      case 'card':
        return CORE_SCENES.card;
      case 'cutscene':
        // A full cutscene player (src/mechanics/cutscene/) replaces the placeholder.
        return this.parts.runtimes.cutscene?.entryScene ?? CORE_SCENES.cutscene;
    }
  }

  private describe(step: Step): { title: string; nextLabel: string } {
    switch (step.kind) {
      case 'level': {
        const d = this.parts.descriptors[step.mechanic];
        return d ? d.describe(step.params) : { title: step.id, nextLabel: 'CONTINUE' };
      }
      case 'video':
        return { title: 'Film', nextLabel: 'CONTINUE' };
      case 'cutscene':
        return { title: 'Scene', nextLabel: 'CONTINUE' };
      case 'card':
        return { title: step.card.type === 'title' ? 'Title' : 'Archive', nextLabel: 'CONTINUE' };
    }
  }

  private canSkip(step: Step, seen: boolean): boolean {
    const rule = step.opts.skippable ?? (step.kind === 'level' ? 'never' : 'always');
    return rule === 'always' || (rule === 'afterSeen' && seen);
  }

  /** Stop every running scene and start `key`, at the end of this frame. */
  private switchTo(key: string, data: object): void {
    this.runId++;
    this.pending = () => {
      const sm = this.game.scene;
      for (const s of sm.getScenes(false)) {
        const st = s.sys.settings.status;
        if (st >= Phaser.Scenes.START && st <= Phaser.Scenes.SLEEPING) sm.stop(s.sys.settings.key);
      }
      sm.start(key, data);
    };
  }
}

/** The StepHost for one run of one step. */
class Host implements StepHost {
  readonly params: StepHost['params'];
  readonly ref: string | null;
  readonly episode: StepHost['episode'];
  readonly attempt: number;
  readonly firstTime: boolean;
  readonly canSkip: boolean;
  readonly upNext: { label: string } | null;
  readonly only: boolean;
  readonly adHoc?: { what: string; q: URLSearchParams };
  private readonly step: Step;
  private completed = false;

  constructor(
    private readonly gm: GameManager,
    private readonly runId: number,
    o: {
      step: Step;
      ref: string | null;
      only: boolean;
      attempt: number;
      firstTime: boolean;
      canSkip: boolean;
      upNext: { label: string } | null;
      episode: EpisodeDef | null;
      adHoc?: { what: string; q: URLSearchParams };
    },
  ) {
    this.step = o.step;
    this.params = (o.step.kind === 'level' ? o.step.params : o.step) as StepHost['params'];
    this.ref = o.ref;
    this.episode = o.episode ? metaOf(o.episode) : null;
    this.attempt = o.attempt;
    this.firstTime = o.firstTime;
    this.canSkip = o.canSkip;
    this.upNext = o.upNext;
    this.only = o.only;
    this.adHoc = o.adHoc;
  }

  private get live(): boolean {
    return this.gm.isCurrent(this.runId);
  }

  report(o: StepOutcome): void {
    if (!this.live) return;
    if (o.result === 'complete') {
      if (this.completed) return;
      this.completed = true;
    }
    if (this.ref) this.gm.save(this.ref, o);
  }

  advance(): void {
    if (!this.live) return;
    if (!this.completed) {
      if (!this.canSkip) {
        console.warn(`${this.ref ?? 'step'}: advance() before report({ result: 'complete' }) on a step that can't be skipped`);
        return;
      }
      this.report({ result: 'complete' });
    }
    this.gm.goNext(this);
  }

  finish(stats?: Stats): void {
    if (!this.live) return;
    this.report({ result: 'complete', stats });
    this.gm.goNext(this);
  }

  /** The dev N key: finish even a level. */
  forceFinish(): void {
    this.finish();
  }

  retry(): void {
    if (this.live) this.gm.replay(this);
  }

  quit(): void {
    if (this.live) this.gm.openMenu(this.episode?.id);
  }

  setting<T extends SettingValue>(key: string): T {
    const owner = this.gm.settingOwner(this.step);
    return (mechanicSetting(owner, key) ?? this.gm.settingDefault(owner, key)) as T;
  }

  setSetting(key: string, value: SettingValue): void {
    setMechanicSetting(this.gm.settingOwner(this.step), key, value);
  }
}
