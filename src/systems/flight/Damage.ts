// Airframe damage: 3 pips. Every few hits costs a pip; each lost pip
// worsens handling, lowers top speed and adds a fuel leak.
import { tuning } from '../../data/tuning';

export class Damage {
  readonly maxPips = tuning.damage.pips;
  pips: number;
  /** Damage taken toward the next lost pip. */
  private hits = 0;

  /** Pass fewer pips to start already damaged (sortie 3 passes 2). */
  constructor(pips = tuning.damage.pips) {
    this.pips = pips;
  }

  /** Apply hit damage. Returns true if a pip was lost. */
  hit(amount = 1): boolean {
    if (this.pips <= 0) return false;
    this.hits += amount;
    if (this.hits >= tuning.damage.hitsPerPip) {
      this.hits -= tuning.damage.hitsPerPip;
      this.pips = Math.max(0, this.pips - 1);
      return true;
    }
    return false;
  }

  get lost(): number {
    return this.maxPips - this.pips;
  }

  /** Multiplier on the deg/s turn caps, passed as FlightMods.handling. */
  get handling(): number {
    return 1 - this.lost * tuning.damage.handlingLossPerPip;
  }

  /** Top-speed multiplier, passed as FlightMods.maxSpeed. */
  get maxSpeed(): number {
    return 1 - this.lost * tuning.damage.speedLossPerPip;
  }

  /** Fuel burn multiplier, passed to Fuel.update as leakMul. */
  get leak(): number {
    return 1 + this.lost * tuning.damage.leakPerPip;
  }

  /** No pips left: Sortie fails the sortie. */
  get destroyed(): boolean {
    return this.pips <= 0;
  }

  /** 0..1 smoke trail strength. */
  get smoke(): number {
    return this.lost / this.maxPips;
  }

  /** Partial hits toward the next pip, 0..1. */
  get partial(): number {
    return this.hits / tuning.damage.hitsPerPip;
  }

  /** Save and restore for checkpoint restarts (sortie 3). */
  snapshot(): { pips: number; hits: number } {
    return { pips: this.pips, hits: this.hits };
  }

  restore(s: { pips: number; hits: number }): void {
    this.pips = s.pips;
    this.hits = s.hits;
  }
}
