// Fuel in percent. Burn grows with the square of throttle, so flying fast
// costs more fuel per mile. Damage adds a leak multiplier.
import { tuning } from '../../data/tuning';

export class Fuel {
  constructor(public pct = 100) {}

  /** Percent per second at a throttle setting (0..1). */
  static burnRate(throttle: number, leakMul = 1): number {
    const f = tuning.fuel;
    return (f.idleBurn + f.throttleBurn * throttle * throttle) * leakMul;
  }

  update(throttle: number, leakMul: number, dt: number, onGround = false): void {
    const mul = onGround ? tuning.fuel.groundBurnMul : 1;
    this.pct = Math.max(0, this.pct - Fuel.burnRate(throttle, leakMul) * mul * dt);
  }

  get empty(): boolean {
    return this.pct <= 0;
  }

  get bingo(): boolean {
    return this.pct < tuning.fuel.bingo;
  }
}
