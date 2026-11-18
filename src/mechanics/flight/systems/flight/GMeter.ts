// G-meter: 0–7 G. Above 5.5 G for 2 s → greyout (controls soften 50%).
// 7 G for over 1 s → blackout (sortie fails). Numbers live in tuning.json.
import { tuning } from '../../tuning';
import { approach, clamp } from '../../../../core/math';

export class GMeter {
  /** Smoothed G, moving toward the raw value at gmeter.smoothRate G/s. The HUD and the greyout and blackout timers use it. */
  g = 1;
  greyout = false;
  /** 0..1 visual fade of the greyout overlay. */
  greyLevel = 0;
  /** Latches until reset(). Sortie.checkCommonFailures fails the sortie on it. */
  blackout = false;
  /** Seconds in a row above greyoutAbove. */
  private overGrey = 0;
  /** Seconds in a row at or above blackoutAt. */
  private overBlack = 0;
  /** Seconds in a row below greyoutClearBelow while greyed out. */
  private underClear = 0;

  reset(): void {
    this.g = 1;
    this.greyout = false;
    this.greyLevel = 0;
    this.blackout = false;
    this.overGrey = 0;
    this.overBlack = 0;
    this.underClear = 0;
  }

  /** Call once per step with the player's load factor (FlightState.g). World does this. */
  update(rawG: number, dt: number): void {
    const t = tuning.gmeter;
    this.g = approach(this.g, rawG, t.smoothRate * dt);

    this.overGrey = this.g > t.greyoutAbove ? this.overGrey + dt : 0;
    this.overBlack = this.g >= t.blackoutAt ? this.overBlack + dt : 0;

    if (!this.greyout && this.overGrey >= t.greyoutAfter) {
      this.greyout = true;
      this.underClear = 0;
    }
    // Recovery has its own threshold (greyoutClearBelow, set lower than
    // greyoutAbove), so the greyout does not flicker on and off.
    if (this.greyout) {
      this.underClear = this.g < t.greyoutClearBelow ? this.underClear + dt : 0;
      if (this.underClear >= t.greyoutRecover) this.greyout = false;
    }
    if (this.overBlack > t.blackoutAfter) this.blackout = true;

    // The overlay takes 0.6 s to fade fully in or out.
    this.greyLevel = approach(this.greyLevel, this.greyout ? 1 : 0, dt / 0.6);
  }

  /** Multiplier on turn authority (0.5 during greyout). */
  get controlMul(): number {
    return this.greyout ? tuning.gmeter.greyoutControl : 1;
  }

  /** 0..1 "tunnel vision" strain for the HUD vignette. */
  get strain(): number {
    const t = tuning.gmeter;
    return clamp((this.g - t.strainFrom) / (t.blackoutAt - t.strainFrom), 0, 1);
  }

  /** Seconds left before blackout while at or above 7 G, else null. */
  get blackoutWarning(): number | null {
    return this.overBlack > 0 ? Math.max(0, tuning.gmeter.blackoutAfter - this.overBlack) : null;
  }
}
