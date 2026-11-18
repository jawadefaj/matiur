// The game manager's contracts: how the game is defined (GameDef, EpisodeDef,
// Step) and how a running step talks back to the manager (StepHost).
// Nothing here imports Phaser, so the game definition, the step order and the
// save logic can be tested without a browser.

export type SettingValue = string | number | boolean;
/** Numbers or short texts a step reports, e.g. { time: '3:12' }. */
export type Stats = Record<string, number | string>;

/** What a step reports when it ends. */
export interface StepOutcome {
  result: 'complete' | 'failed';
  /** Saved as '<step id>.<key>', so an archive card can show '{sortie-3.time}'. */
  stats?: Stats;
}

/** An episode's heading, shown on its title card and in the menu. */
export interface EpisodeMeta {
  /** 'ep1' .. 'ep5'. Used in save data and deep links, so don't rename it once released. */
  id: string;
  number: number;
  title: string;
  date: string;
  place: string;
  kind: 'playable' | 'story';
}

/**
 * Handed to every step's scene as its scene data ({ host }). It is the only way
 * a scene learns what to play and the only way it leaves: scenes never start
 * each other. After the manager moves on, calls on an old host are ignored.
 */
export interface StepHost<P = unknown> {
  /** A level's params (e.g. { sortie: 2 }), or the step itself for videos, cutscenes and cards. */
  readonly params: Readonly<P>;
  /** 'ep2/sortie-1', or null for an ad-hoc ?play= run (nothing is saved). */
  readonly ref: string | null;
  readonly episode: EpisodeMeta | null;
  /** 1 on the first try, +1 per retry(). */
  readonly attempt: number;
  /** True if this step was never started before. */
  readonly firstTime: boolean;
  /** Whether the player may skip this step (see StepOptions.skippable). */
  readonly canSkip: boolean;
  /** Label for a "next" button, e.g. 'FLY SORTIE 2', or null at the end. */
  readonly upNext: { label: string } | null;
  /** Record the result. A 'complete' saves progress. Repeat calls are ignored. */
  report(outcome: StepOutcome): void;
  /** Go to the next step (or the menu at the end). Needs a 'complete' report first, unless the step can be skipped. */
  advance(): void;
  /** report complete + advance, for steps with no results screen (videos, cards, cutscenes). */
  finish(stats?: Stats): void;
  /** Play this step again with the same params. */
  retry(): void;
  /** Back to the menu. CONTINUE resumes at this step. */
  quit(): void;
  /** A saved setting of this mechanic (see MechanicDescriptor.settings). */
  setting<T extends SettingValue>(key: string): T;
  setSetting(key: string, value: SettingValue): void;
}

/** A per-mechanic setting the menu shows as a toggle, e.g. GUNS: AUTO / HOLD. */
export interface SettingDef {
  key: string;
  label: string;
  values: readonly SettingValue[];
  default: SettingValue;
}

/** Options every step accepts. */
export interface StepOptions {
  /** Name in the chapter list. Levels default to their mechanic's describe().title. */
  title?: string;
  /** Listed as a chapter in the menu (a place to start from). Default: true for levels, false otherwise. */
  checkpoint?: boolean;
  /** Default 'always' for videos, cutscenes and cards ("hold to skip any cutscene"), 'never' for levels. */
  skippable?: 'always' | 'afterSeen' | 'never';
  /** Only in dev builds (npm run dev). */
  devOnly?: boolean;
}

interface StepBase {
  /** Unique in its episode. It is a save key, so don't rename it once released. */
  id: string;
  opts: StepOptions;
}

/** Play one level of a mechanic, e.g. flight.level('sortie-1', { sortie: 1 }). */
export interface LevelStep<P = unknown> extends StepBase {
  kind: 'level';
  mechanic: string;
  params: P;
}

/** Play a video file from assets/video/. */
export interface VideoStep extends StepBase {
  kind: 'video';
  /** File name in assets/video/ without the extension, e.g. 'ep2_intro' for ep2_intro.mp4. */
  src: string;
  /** 'contain' letterboxes, 'cover' fills the screen and crops. */
  fit: 'contain' | 'cover';
  muted: boolean;
  /** Text shown instead when the file is missing or cannot play. */
  fallback?: string[];
}

export interface DialogueLine {
  speaker?: string;
  text: string;
}

/** Play an in-engine cutscene from src/data/cutscenes/<script>.json (GDD §6.9). */
export interface CutsceneStep extends StepBase {
  kind: 'cutscene';
  script: string;
  /** Lines shown while the JSON doesn't exist yet. */
  placeholder?: DialogueLine[];
}

/** The episode title card (GDD §6.7). Added automatically as the first step. */
export interface TitleCard {
  type: 'title';
}

/** The archive card that closes an episode (GDD §0 rule 4). */
export interface ArchiveCard {
  type: 'archive';
  /** Saved in the archive collection when the card is reached. */
  cardId: string;
  heading: string;
  date?: string;
  /** May contain saved stats as {step-id.key}, e.g. {sortie-3.time}. */
  text: string;
  source?: string;
}

export interface CardStep extends StepBase {
  kind: 'card';
  card: TitleCard | ArchiveCard;
}

export type Step = LevelStep<any> | VideoStep | CutsceneStep | CardStep;

export interface EpisodeDef extends EpisodeMeta {
  /** Open from the start, or after another episode is finished. */
  unlock: 'always' | { after: string };
  /** Start with the title card (GDD §6.7). Default true. */
  titleCard: boolean;
  /** Text under the chapter list in the menu: how to play, a content note. */
  notes: string[];
  steps: Step[];
}

export interface GameDef {
  title: string;
  subtitle: string;
  /** Texture key tiled behind the menu, or null for a flat colour. */
  menuBackground: string | null;
  /** 'open': every chapter can be started from the menu. 'inOrder': a chapter opens when the one before it is done. */
  chapters: 'open' | 'inOrder';
  /** Only used in dev builds. unlockAll opens every episode and chapter; skipKey makes N finish the current step. */
  dev: { unlockAll: boolean; skipKey: boolean };
}

/**
 * A mechanic's Phaser-free description, exported as the default from
 * src/mechanics/<id>/index.ts. The game definition uses it to make typed level
 * steps; tests load it without a browser. Its scenes are in runtime.ts.
 */
export interface MechanicDescriptor<P = any> {
  /** The folder name; also the scene-key prefix ('flight:Flight') and the settings namespace. */
  readonly id: string;
  /** Params from a deep link (?play=<id>&...), or null if they don't make a level. */
  parseParams(q: URLSearchParams): P | null;
  /** null if the params are valid, else what's wrong. Run on every level step at boot. */
  validate(params: P): string | null;
  /** Chapter title and the label for a button that starts this level. */
  describe(params: P): { title: string; nextLabel: string };
  readonly settings: readonly SettingDef[];
  /** A level step for the game definition. */
  level(id: string, params: P, opts?: StepOptions): LevelStep<P>;
}
