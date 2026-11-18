// When to show an ad. Pure functions, no Phaser and no DOM, so the rules are
// tested in tests/core/adPolicy.test.ts. AdManager.ts adds the timing and the
// ad networks; the numbers come from GameDef.ads (src/game/game.ts).
import type { AdsConfig, AdTrigger } from '../contracts';

/** What the policy needs to remember between ads, for one session. */
export interface AdState {
  /** When this session started, in ms (Date.now()). */
  sessionStart: number;
  /** When the last ad of any kind closed, in ms, or null if none yet. */
  lastAdAt: number | null;
  /** Interstitial chances since the last interstitial (for everyNth). */
  sinceLast: number;
}

export function newAdState(now: number): AdState {
  return { sessionStart: now, lastAdAt: null, sinceLast: 0 };
}

/** Where an ad is being considered: what happened and in which episode. */
export interface AdContext {
  trigger: AdTrigger;
  /** The episode being played or left, or null outside episodes. */
  episode: string | null;
  now: number;
}

/** True if no ad of any kind may show in this episode. */
export function adFreeEpisode(cfg: AdsConfig, episode: string | null): boolean {
  return episode !== null && cfg.noAdsIn.includes(episode);
}

/**
 * Should an interstitial show at this moment? Call once per chance; it
 * returns the new state, which counts the chance whether or not an ad shows.
 */
export function considerInterstitial(cfg: AdsConfig, s: AdState, ctx: AdContext): { show: boolean; state: AdState } {
  const i = cfg.interstitial;
  if (!cfg.enabled || !i.on.includes(ctx.trigger) || adFreeEpisode(cfg, ctx.episode)) return { show: false, state: s };
  const sinceLast = s.sinceLast + 1;
  const show =
    ctx.now - s.sessionStart >= i.firstAfterSec * 1000 &&
    (s.lastAdAt === null || ctx.now - s.lastAdAt >= i.minGapSec * 1000) &&
    sinceLast >= i.everyNth;
  return { show, state: { ...s, sinceLast: show ? 0 : sinceLast } };
}

/** Record that an ad (interstitial or rewarded) just closed. */
export function adShown(s: AdState, now: number): AdState {
  return { ...s, lastAdAt: now, sinceLast: 0 };
}

/** Should the rewarded "skip this level" offer show after `attempt` failed tries? */
export function offerSkip(cfg: AdsConfig, episode: string | null, failedTries: number): boolean {
  return cfg.enabled && cfg.rewarded.skipLevel && !adFreeEpisode(cfg, episode) && failedTries >= cfg.rewarded.skipAfterFails;
}

/** Is a banner wanted on this screen? */
export function bannerWanted(cfg: AdsConfig, screen: 'menu' | 'card' | 'video' | 'cutscene' | 'level' | 'results', episode: string | null): boolean {
  return cfg.enabled && cfg.banner.on.includes(screen) && !adFreeEpisode(cfg, episode);
}
