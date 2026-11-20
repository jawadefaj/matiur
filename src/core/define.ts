// Helpers for writing the game definition (src/game/) and mechanic
// descriptors. They fill in defaults so the definition stays short.
import type {
  AdsConfig,
  ArchiveCard,
  CardStep,
  CutsceneStep,
  DialogueLine,
  EpisodeDef,
  GameDef,
  MechanicDescriptor,
  SettingDef,
  StepOptions,
  VideoStep,
} from './contracts';

/** Ad settings when the game sets none: off. */
export const DEFAULT_ADS: AdsConfig = {
  enabled: false,
  provider: 'auto',
  web: { client: '', bannerSlot: '', testMode: true },
  admob: { interstitialId: '', rewardedId: '', bannerId: '', testing: true },
  preroll: false,
  interstitial: { on: ['start', 'next', 'retry', 'quit'], firstAfterSec: 60, minGapSec: 90, everyNth: 1 },
  rewarded: { skipLevel: true, skipAfterFails: 2 },
  banner: { on: ['menu'] },
  noAdsIn: [],
};

/** Ad settings: the defaults, with each given section merged over them. */
export interface AdsInput extends Partial<Omit<AdsConfig, 'web' | 'admob' | 'interstitial' | 'rewarded' | 'banner'>> {
  web?: Partial<AdsConfig['web']>;
  admob?: Partial<AdsConfig['admob']>;
  interstitial?: Partial<AdsConfig['interstitial']>;
  rewarded?: Partial<AdsConfig['rewarded']>;
  banner?: Partial<AdsConfig['banner']>;
}

export function defineAds(a: AdsInput = {}): AdsConfig {
  const d = DEFAULT_ADS;
  return {
    ...d,
    ...a,
    web: { ...d.web, ...a.web },
    admob: { ...d.admob, ...a.admob },
    interstitial: { ...d.interstitial, ...a.interstitial },
    rewarded: { ...d.rewarded, ...a.rewarded },
    banner: { ...d.banner, ...a.banner },
  };
}

/** The game-wide settings. */
export function defineGame(g: Pick<GameDef, 'title'> & Partial<Omit<GameDef, 'ads'>> & { ads?: AdsInput }): GameDef {
  return {
    subtitle: '',
    menuBackground: null,
    chapters: 'open',
    dev: { unlockAll: false, skipKey: false },
    ...g,
    ads: defineAds(g.ads),
  };
}

/** One episode: its heading, unlock rule and steps, in play order. */
export function defineEpisode(e: Omit<EpisodeDef, 'titleCard' | 'notes'> & Partial<Pick<EpisodeDef, 'titleCard' | 'notes'>>): EpisodeDef {
  return { titleCard: true, notes: [], ...e };
}

/** A mechanic's descriptor. Adds level(), which makes typed level steps. */
export function defineMechanic<P>(
  d: Omit<MechanicDescriptor<P>, 'level' | 'settings'> & { settings?: readonly SettingDef[] },
): MechanicDescriptor<P> {
  return {
    ...d,
    settings: d.settings ?? [],
    level: (id, params, opts = {}) => ({ kind: 'level', id, mechanic: d.id, params, opts }),
  };
}

/** Play assets/videos/<src>.mp4 (or .webm). */
export function video(
  id: string,
  v: { src: string; fit?: VideoStep['fit']; muted?: boolean; fallback?: string[] },
  opts: StepOptions = {},
): VideoStep {
  return { kind: 'video', id, src: v.src, fit: v.fit ?? 'contain', muted: v.muted ?? false, fallback: v.fallback, opts };
}

/** Play src/data/cutscenes/<script>.json; shows `placeholder` lines until that file exists. */
export function cutscene(id: string, c: { script: string; placeholder?: DialogueLine[] }, opts: StepOptions = {}): CutsceneStep {
  return { kind: 'cutscene', id, script: c.script, placeholder: c.placeholder, opts };
}

/** The archive card that closes an episode. */
export function archiveCard(id: string, c: Omit<ArchiveCard, 'type'>, opts: StepOptions = {}): CardStep {
  return { kind: 'card', id, card: { type: 'archive', ...c }, opts };
}
