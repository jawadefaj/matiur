// Ad networks behind one interface. Each provider only shows ads; when to
// show them is decided by policy.ts and AdManager.ts.
//   TestAds  - grey placeholder ads drawn in the page (dev builds)
//   WebAds   - Google H5 Games Ads + an AdSense banner (the web build)
//   AdMobAds - AdMob through @capacitor-community/admob (the Android/iOS app)
// No Phaser here.
import type { AdsConfig, AdTrigger } from '../contracts';

export type RewardResult = 'viewed' | 'dismissed' | 'unavailable';

export interface AdProvider {
  readonly name: string;
  /** Load the network's script or SDK and ask for consent. Never throws. */
  init(): Promise<void>;
  /** Full-screen ad as the game opens. Resolves when it is gone (or none showed). */
  preroll(): Promise<void>;
  /** Full-screen ad between steps. Resolves true if one showed. */
  interstitial(trigger: AdTrigger, name: string): Promise<boolean>;
  /** Whether a rewarded ad can be offered right now. */
  rewardedReady(): boolean;
  /** Rewarded ad. 'viewed' means the player earned the reward. */
  rewarded(name: string): Promise<RewardResult>;
  /** Show or hide the bottom banner. Resolves to the height it takes, in CSS px (0 when hidden). */
  banner(on: boolean): Promise<number>;
}

/** Resolve to `fallback` if `p` hasn't settled after `ms`. */
function within<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);
}

// ---------------------------------------------------------------------------

export class NoAds implements AdProvider {
  readonly name = 'none';
  async init(): Promise<void> {}
  async preroll(): Promise<void> {}
  async interstitial(): Promise<boolean> {
    return false;
  }
  rewardedReady(): boolean {
    return false;
  }
  async rewarded(): Promise<RewardResult> {
    return 'unavailable';
  }
  async banner(): Promise<number> {
    return 0;
  }
}

// ---------------------------------------------------------------------------

const TEST_BANNER_H = 50;

/** Placeholder ads drawn in the page, so placements can be checked without a network. */
export class TestAds implements AdProvider {
  readonly name = 'test';
  private bannerEl: HTMLDivElement | null = null;

  async init(): Promise<void> {}

  preroll(): Promise<void> {
    return this.fullScreen('TEST AD: PREROLL', 2, false).then(() => undefined);
  }

  interstitial(trigger: AdTrigger, name: string): Promise<boolean> {
    return this.fullScreen(`TEST AD: INTERSTITIAL\n(${trigger}: ${name})`, 2, false).then(() => true);
  }

  rewardedReady(): boolean {
    return true;
  }

  async rewarded(name: string): Promise<RewardResult> {
    return (await this.fullScreen(`TEST AD: REWARDED\n(${name})`, 4, true)) ? 'viewed' : 'dismissed';
  }

  async banner(on: boolean): Promise<number> {
    if (on && !this.bannerEl) {
      const b = document.createElement('div');
      b.id = 'ad-banner';
      Object.assign(b.style, {
        position: 'fixed', left: '0', right: '0', bottom: 'env(safe-area-inset-bottom, 0px)', height: `${TEST_BANNER_H}px`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#3a3d42', color: '#d8d8d8',
        font: '10px monospace', zIndex: '900',
      });
      b.textContent = 'TEST BANNER 320x50';
      document.body.appendChild(b);
      this.bannerEl = b;
    }
    if (this.bannerEl) this.bannerEl.style.display = on ? 'flex' : 'none';
    return on ? TEST_BANNER_H : 0;
  }

  /** A full-page panel with a countdown. Resolves true if it ran to the end, false if closed early. */
  private fullScreen(label: string, seconds: number, closable: boolean): Promise<boolean> {
    return new Promise((resolve) => {
      const el = document.createElement('div');
      Object.assign(el.style, {
        position: 'fixed', inset: '0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '16px', background: '#202226', color: '#f0d060', font: '14px monospace', textAlign: 'center',
        whiteSpace: 'pre-line', zIndex: '1000', touchAction: 'auto',
      });
      const text = document.createElement('div');
      const btn = document.createElement('button');
      Object.assign(btn.style, { font: '12px monospace', padding: '10px 16px' });
      el.append(text, btn);
      document.body.appendChild(el);
      let left = seconds;
      const done = (full: boolean) => {
        clearInterval(timer);
        el.remove();
        resolve(full);
      };
      const tick = () => {
        text.textContent = `${label}\n\n${left > 0 ? left : ''}`;
        btn.textContent = left > 0 ? (closable ? 'CLOSE (NO REWARD)' : '...') : closable ? 'CLAIM REWARD' : 'CLOSE';
        btn.disabled = left > 0 && !closable;
      };
      btn.onclick = () => done(left <= 0);
      tick();
      const timer = setInterval(() => {
        left--;
        tick();
      }, 1000);
    });
  }
}

// ---------------------------------------------------------------------------

/** What Google's H5 Games Ads calls back with when a break ends. */
interface PlacementInfo {
  breakStatus: string;
}
type AdBreakFn = (o: Record<string, unknown>) => void;

const WEB_BANNER_H = 50;

/**
 * Google H5 Games Ads (the Ad Placement API, part of AdSense for games):
 * preroll, interstitials ('start' / 'next' / 'browse' breaks) and rewarded
 * ads, plus an ordinary AdSense display unit as the bottom banner.
 * Needs an AdSense account approved for H5 games on the site's domain.
 */
export class WebAds implements AdProvider {
  readonly name = 'web';
  private adBreak: AdBreakFn = () => {};

  constructor(private readonly cfg: AdsConfig) {}

  private bannerEl: HTMLDivElement | null = null;

  async init(): Promise<void> {
    const { client, testMode } = this.cfg.web;
    const w = window as unknown as { adsbygoogle?: unknown[] };
    const s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
    // Google spaces ads at least this far apart, on top of our own minGapSec.
    s.setAttribute('data-ad-frequency-hint', `${Math.max(30, this.cfg.interstitial.minGapSec)}s`);
    if (testMode) s.setAttribute('data-adbreak-test', 'on');
    document.head.appendChild(s);
    w.adsbygoogle = w.adsbygoogle || [];
    const push: AdBreakFn = (o) => (w.adsbygoogle as unknown[]).push(o);
    this.adBreak = push;
    // adConfig and adBreak are the same push; adConfig must come first.
    push({ preloadAdBreaks: 'on', sound: 'on' });
  }

  async preroll(): Promise<void> {
    // A blocked script never calls back, so give up after a few seconds.
    await within(new Promise<void>((r) => this.adBreak({ type: 'preroll', adBreakDone: () => r() })), 6000, undefined);
  }

  interstitial(trigger: AdTrigger, name: string): Promise<boolean> {
    const type = trigger === 'quit' ? 'browse' : trigger === 'next' ? 'next' : 'start';
    return new Promise((resolve) => {
      let started = false;
      let settled = false;
      const end = (v: boolean) => {
        if (!settled) {
          settled = true;
          resolve(v);
        }
      };
      this.adBreak({
        type,
        name,
        beforeAd: () => (started = true),
        adBreakDone: (info: PlacementInfo) => end(info.breakStatus === 'viewed' || started),
      });
      // No ad started in time (none ready, or ads blocked): carry on.
      setTimeout(() => !started && end(false), 2500);
    });
  }

  rewardedReady(): boolean {
    return true;
  }

  rewarded(name: string): Promise<RewardResult> {
    return new Promise((resolve) => {
      let result: RewardResult = 'unavailable';
      let offered = false;
      let settled = false;
      const end = () => {
        if (!settled) {
          settled = true;
          resolve(result);
        }
      };
      this.adBreak({
        type: 'reward',
        name,
        // The player already chose to watch (they tapped the button), so show at once.
        beforeReward: (showAdFn: () => void) => {
          offered = true;
          showAdFn();
        },
        adViewed: () => (result = 'viewed'),
        adDismissed: () => (result = 'dismissed'),
        adBreakDone: end,
      });
      setTimeout(() => !offered && end(), 2500);
    });
  }

  async banner(on: boolean): Promise<number> {
    const { client, bannerSlot } = this.cfg.web;
    if (!bannerSlot) return 0;
    if (on && !this.bannerEl) {
      const b = document.createElement('div');
      b.id = 'ad-banner';
      Object.assign(b.style, {
        position: 'fixed', left: '0', right: '0', bottom: 'env(safe-area-inset-bottom, 0px)', height: `${WEB_BANNER_H}px`,
        display: 'flex', justifyContent: 'center', background: '#111214', zIndex: '900', overflow: 'hidden',
      });
      const ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      Object.assign(ins.style, { display: 'inline-block', width: '320px', height: `${WEB_BANNER_H}px` });
      ins.setAttribute('data-ad-client', client);
      ins.setAttribute('data-ad-slot', bannerSlot);
      if (this.cfg.web.testMode) ins.setAttribute('data-adtest', 'on');
      b.appendChild(ins);
      document.body.appendChild(b);
      ((window as unknown as { adsbygoogle: unknown[] }).adsbygoogle ||= []).push({});
      this.bannerEl = b;
    }
    if (this.bannerEl) this.bannerEl.style.display = on ? 'flex' : 'none';
    return on ? WEB_BANNER_H : 0;
  }
}

// ---------------------------------------------------------------------------

/** The parts of @capacitor-community/admob's AdMob plugin used here. */
interface AdMobPlugin {
  initialize(o: { initializeForTesting?: boolean }): Promise<void>;
  requestConsentInfo?(): Promise<{ status: string; isConsentFormAvailable?: boolean }>;
  showConsentForm?(): Promise<unknown>;
  trackingAuthorizationStatus?(): Promise<{ status: string }>;
  requestTrackingAuthorization?(): Promise<void>;
  prepareInterstitial(o: { adId: string; isTesting?: boolean }): Promise<unknown>;
  showInterstitial(): Promise<void>;
  prepareRewardVideoAd(o: { adId: string; isTesting?: boolean }): Promise<unknown>;
  showRewardVideoAd(): Promise<{ type?: string; amount?: number } | undefined>;
  showBanner(o: { adId: string; adSize: string; position: string; margin: number; isTesting?: boolean }): Promise<void>;
  hideBanner(): Promise<void>;
  resumeBanner(): Promise<void>;
  addListener(event: string, fn: (info: any) => void): unknown;
}

/** The AdMob plugin, when the game runs inside the Capacitor app. */
export function admobPlugin(): AdMobPlugin | null {
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; Plugins?: { AdMob?: AdMobPlugin } } }).Capacitor;
  return cap?.isNativePlatform?.() ? (cap.Plugins?.AdMob ?? null) : null;
}

/**
 * AdMob in the Capacitor app: interstitials and rewarded ads are loaded ahead
 * so they show at once, and an adaptive banner sits at the bottom.
 */
export class AdMobAds implements AdProvider {
  readonly name = 'admob';
  private interReady = false;
  private rewardReady = false;
  private earned = false;
  private bannerShown = false;
  private bannerH = 60;

  constructor(
    private readonly cfg: AdsConfig,
    private readonly ad: AdMobPlugin,
  ) {}

  async init(): Promise<void> {
    const a = this.ad;
    const testing = this.cfg.admob.testing;
    try {
      // iOS asks for tracking first (personalised ads pay more); Android skips this.
      const t = await a.trackingAuthorizationStatus?.();
      if (t?.status === 'notDetermined') await a.requestTrackingAuthorization?.();
    } catch {
      /* not iOS */
    }
    try {
      await a.initialize({ initializeForTesting: testing });
      // EU/UK consent (Google UMP). Without it AdMob serves few or no ads there.
      const c = await a.requestConsentInfo?.();
      if (c?.isConsentFormAvailable && c.status === 'REQUIRED') await a.showConsentForm?.();
    } catch (e) {
      console.warn('AdMob init failed', e);
    }
    a.addListener('onRewardedVideoAdReward', () => (this.earned = true));
    a.addListener('bannerAdSizeChanged', (s: { height?: number }) => {
      if (s?.height) this.bannerH = s.height;
    });
    this.loadInterstitial();
    this.loadRewarded();
  }

  private loadInterstitial(): void {
    const { interstitialId, testing } = this.cfg.admob;
    if (!interstitialId) return;
    this.ad.prepareInterstitial({ adId: interstitialId, isTesting: testing }).then(
      () => (this.interReady = true),
      () => setTimeout(() => this.loadInterstitial(), 30000),
    );
  }

  private loadRewarded(): void {
    const { rewardedId, testing } = this.cfg.admob;
    if (!rewardedId) return;
    this.ad.prepareRewardVideoAd({ adId: rewardedId, isTesting: testing }).then(
      () => (this.rewardReady = true),
      () => setTimeout(() => this.loadRewarded(), 30000),
    );
  }

  async preroll(): Promise<void> {
    // An interstitial at launch, if one has loaded by the time the art is ready.
    if (this.interReady) await this.interstitial();
  }

  async interstitial(): Promise<boolean> {
    if (!this.interReady) return false;
    this.interReady = false;
    try {
      await this.ad.showInterstitial();
      return true;
    } catch {
      return false;
    } finally {
      this.loadInterstitial();
    }
  }

  rewardedReady(): boolean {
    return this.rewardReady;
  }

  async rewarded(): Promise<RewardResult> {
    if (!this.rewardReady) return 'unavailable';
    this.rewardReady = false;
    this.earned = false;
    try {
      const item = await this.ad.showRewardVideoAd();
      return this.earned || (item?.amount ?? 0) > 0 ? 'viewed' : 'dismissed';
    } catch {
      return this.earned ? 'viewed' : 'unavailable';
    } finally {
      this.loadRewarded();
    }
  }

  async banner(on: boolean): Promise<number> {
    const { bannerId, testing } = this.cfg.admob;
    if (!bannerId) return 0;
    try {
      if (on && !this.bannerShown) {
        this.bannerShown = true;
        await this.ad.showBanner({ adId: bannerId, adSize: 'ADAPTIVE_BANNER', position: 'BOTTOM_CENTER', margin: 0, isTesting: testing });
      } else if (on) await this.ad.resumeBanner();
      else if (this.bannerShown) await this.ad.hideBanner();
    } catch {
      return 0;
    }
    return on ? this.bannerH : 0;
  }
}

// ---------------------------------------------------------------------------

/** The provider for this build: see AdsConfig.provider. */
export function pickProvider(cfg: AdsConfig, dev: boolean): AdProvider {
  if (!cfg.enabled) return new NoAds();
  const admob = admobPlugin();
  switch (cfg.provider) {
    case 'none':
      return new NoAds();
    case 'test':
      return new TestAds();
    case 'web':
      return cfg.web.client ? new WebAds(cfg) : new NoAds();
    case 'admob':
      return admob ? new AdMobAds(cfg, admob) : new NoAds();
    case 'auto':
      if (admob) return new AdMobAds(cfg, admob);
      if (dev) return new TestAds();
      return cfg.web.client ? new WebAds(cfg) : new NoAds();
  }
}
