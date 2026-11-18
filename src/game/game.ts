// THE GAME SCRIPT, part 1: game-wide settings.
// Episodes are in ./episodes/ (one file each, found automatically). Mechanics
// are in src/mechanics/ (one folder each, found automatically).
import { defineGame } from '../core/define';

export const GAME = defineGame({
  title: 'Wings of Freedom',
  subtitle: 'The Legend of Matiur Rahman',
  // Texture tiled behind the menu (made by registerCommonArt in core/gfx/textures.ts).
  menuBackground: 'ground_farmland',
  // 'open': any chapter can be started from the menu. 'inOrder': each opens when the one before it is done.
  chapters: 'open',
  // Dev builds only (npm run dev): open every episode, and N finishes the current step.
  dev: { unlockAll: true, skipKey: true },

  // Ads (see src/core/ads/). Set up for the most ad income. Dev builds show
  // grey TEST ads in the page so every placement can be checked.
  ads: {
    enabled: true,
    // 'auto': AdMob inside the Android/iOS app, Google H5 Games Ads on the web
    // (once web.client is set), test ads in dev builds.
    provider: 'auto',
    web: {
      client: '', // Your AdSense publisher id, 'ca-pub-...'.
      bannerSlot: '', // An AdSense display ad slot id for the bottom banner.
      testMode: true, // Set false for release.
    },
    admob: {
      // Google's Android test units. Replace with your own ad unit ids, and set testing: false for release.
      interstitialId: 'ca-app-pub-3940256099942544/1033173712',
      rewardedId: 'ca-app-pub-3940256099942544/5224354917',
      bannerId: 'ca-app-pub-3940256099942544/9214589741',
      testing: true,
    },
    // A full-screen ad as the game opens.
    preroll: true,
    // A full-screen ad at every step change, retry, episode start and quit,
    // at most one per 45 s, none in the first 30 s.
    interstitial: { on: ['start', 'next', 'retry', 'quit'], firstAfterSec: 30, minGapSec: 45, everyNth: 1 },
    // After one failed sortie, offer WATCH AD: SKIP SORTIE.
    rewarded: { skipLevel: true, skipAfterFails: 1 },
    // A banner on every screen, gameplay included (the game shrinks to make room, so it never covers controls).
    banner: { on: ['menu', 'card', 'video', 'cutscene', 'level', 'results'] },
    // Episode ids that never show ads, e.g. ['ep4', 'ep5'].
    noAdsIn: [],
  },
});
