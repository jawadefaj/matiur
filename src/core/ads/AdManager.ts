// Runs the ads for the GameManager: picks the network, applies the rules in
// policy.ts, pauses the game while an ad is up and makes room for the banner.
// No Phaser: the GameManager passes in what pausing and re-layout mean.
import type { AdsConfig, AdTrigger } from '../contracts';
import { adShown, bannerWanted, considerInterstitial, newAdState, offerSkip, type AdState } from './policy';
import { pickProvider, type AdProvider } from './providers';

export type BannerScreen = Parameters<typeof bannerWanted>[1];

export interface AdHooks {
  /** Stop the game loop and sound while a full-screen ad shows. */
  pause(): void;
  resume(): void;
  /** The space left for the game changed (banner shown or hidden). */
  relayout(): void;
}

export class AdManager {
  readonly provider: AdProvider;
  /** True while a full-screen ad is up; the manager ignores scene requests then. */
  busy = false;
  private state: AdState;
  private ready: Promise<void> = Promise.resolve();
  private bannerOn = false;
  /** Failed tries in a row, per step (for the rewarded skip offer). */
  private fails = new Map<string, number>();

  constructor(
    readonly cfg: AdsConfig,
    private readonly hooks: AdHooks,
    dev: boolean,
    provider?: AdProvider,
  ) {
    this.provider = provider ?? pickProvider(cfg, dev);
    this.state = newAdState(Date.now());
  }

  /** Load the network, then the preroll (if on). Never rejects. */
  start(): Promise<void> {
    this.ready = this.provider.init().catch((e) => console.warn('Ad network failed to load', e));
    return this.ready.then(() => (this.cfg.preroll ? this.fullScreen(() => this.provider.preroll().then(() => true)) : undefined));
  }

  /** An interstitial chance between steps. Resolves when the game may carry on. */
  async between(trigger: AdTrigger, episode: string | null, name: string): Promise<void> {
    const r = considerInterstitial(this.cfg, this.state, { trigger, episode, now: Date.now() });
    this.state = r.state;
    if (!r.show) return;
    await this.ready;
    await this.fullScreen(() => this.provider.interstitial(trigger, name));
  }

  /** Can a rewarded skip be offered for this step now? */
  canOfferSkip(key: string, episode: string | null): boolean {
    return offerSkip(this.cfg, episode, this.fails.get(key) ?? 0) && this.provider.rewardedReady();
  }

  /** Show a rewarded ad. Resolves true if the player earned the reward. */
  async rewarded(name: string): Promise<boolean> {
    if (this.busy) return false;
    let viewed = false;
    await this.fullScreen(async () => {
      const r = await this.provider.rewarded(name);
      viewed = r === 'viewed';
      return r !== 'unavailable';
    });
    return viewed;
  }

  noteResult(key: string, result: 'complete' | 'failed'): void {
    if (result === 'complete') this.fails.delete(key);
    else this.fails.set(key, (this.fails.get(key) ?? 0) + 1);
  }

  /** Show the banner if this screen wants one, else hide it. */
  bannerFor(screen: BannerScreen, episode: string | null): void {
    this.setBanner(bannerWanted(this.cfg, screen, episode));
  }

  private setBanner(on: boolean): void {
    if (on === this.bannerOn) return;
    this.bannerOn = on;
    void this.ready
      .then(() => this.provider.banner(on))
      .catch(() => 0)
      .then((h) => {
        // A later call may have flipped it back while this one waited.
        if (on !== this.bannerOn) return;
        document.documentElement.style.setProperty('--ad-banner-h', `${on ? h : 0}px`);
        this.hooks.relayout();
      });
  }

  /** Pause the game around `show`; it resolves true if an ad actually played. */
  private async fullScreen(show: () => Promise<boolean>): Promise<void> {
    this.busy = true;
    this.hooks.pause();
    try {
      if (await show()) this.state = adShown(this.state, Date.now());
    } catch (e) {
      console.warn('Ad failed', e);
    } finally {
      this.busy = false;
      this.hooks.resume();
    }
  }
}
