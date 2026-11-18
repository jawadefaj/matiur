// When ads show (src/core/ads/policy.ts) and how the game's ad settings merge
// with the defaults (defineAds in src/core/define.ts).
import { describe, expect, it } from 'vitest';
import { defineAds } from '../../src/core/define';
import { adShown, bannerWanted, considerInterstitial, newAdState, offerSkip } from '../../src/core/ads/policy';
import { GAME } from '../../src/game/game';

const cfg = defineAds({ enabled: true, interstitial: { firstAfterSec: 30, minGapSec: 45, everyNth: 1 } });
const S = 1000;

describe('ad policy', () => {
  it('shows no interstitial in the first seconds of a session', () => {
    const s = newAdState(0);
    expect(considerInterstitial(cfg, s, { trigger: 'next', episode: 'ep2', now: 29 * S }).show).toBe(false);
    expect(considerInterstitial(cfg, s, { trigger: 'next', episode: 'ep2', now: 30 * S }).show).toBe(true);
  });

  it('keeps the minimum gap after any ad, rewarded ones included', () => {
    const s = adShown(newAdState(0), 100 * S);
    expect(considerInterstitial(cfg, s, { trigger: 'retry', episode: null, now: 144 * S }).show).toBe(false);
    expect(considerInterstitial(cfg, s, { trigger: 'retry', episode: null, now: 145 * S }).show).toBe(true);
  });

  it('shows on every Nth chance', () => {
    const c = defineAds({ enabled: true, interstitial: { firstAfterSec: 0, minGapSec: 0, everyNth: 3 } });
    let s = newAdState(0);
    const shows: boolean[] = [];
    for (let i = 0; i < 6; i++) {
      const r = considerInterstitial(c, s, { trigger: 'next', episode: null, now: 1 });
      shows.push(r.show);
      s = r.show ? adShown(r.state, 1) : r.state;
    }
    expect(shows).toEqual([false, false, true, false, false, true]);
  });

  it('respects the trigger list, the master switch and ad-free episodes', () => {
    const s = newAdState(0);
    const at = { episode: 'ep2', now: 999 * S };
    expect(considerInterstitial(defineAds({ ...cfg, interstitial: { on: ['next'] } }), s, { ...at, trigger: 'quit' }).show).toBe(false);
    expect(considerInterstitial({ ...cfg, enabled: false }, s, { ...at, trigger: 'next' }).show).toBe(false);
    const free = { ...cfg, noAdsIn: ['ep4'] };
    expect(considerInterstitial(free, s, { trigger: 'next', episode: 'ep4', now: 999 * S }).show).toBe(false);
    expect(bannerWanted(free, 'menu', 'ep4')).toBe(false);
    expect(offerSkip(free, 'ep4', 9)).toBe(false);
  });

  it('offers the rewarded skip after enough failed tries', () => {
    const c = defineAds({ enabled: true, rewarded: { skipAfterFails: 2 } });
    expect(offerSkip(c, 'ep2', 1)).toBe(false);
    expect(offerSkip(c, 'ep2', 2)).toBe(true);
  });

  it('merges the game settings over the defaults', () => {
    const a = defineAds({ interstitial: { minGapSec: 10 } });
    expect(a.enabled).toBe(false);
    expect(a.interstitial.minGapSec).toBe(10);
    expect(a.interstitial.on).toEqual(['start', 'next', 'retry', 'quit']);
  });

  it('the game has ads on, with sane numbers', () => {
    const a = GAME.ads;
    expect(a.enabled).toBe(true);
    expect(a.interstitial.minGapSec).toBeGreaterThanOrEqual(30);
    expect(a.interstitial.everyNth).toBeGreaterThanOrEqual(1);
    expect(a.rewarded.skipAfterFails).toBeGreaterThanOrEqual(1);
  });
});
