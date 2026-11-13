// Fuel in percent. Burn grows with the square of throttle, so flying fast
// costs more fuel per mile. Damage adds a leak multiplier.
import { tuning } from '../../tuning';

export class Fuel {
  /** `pct`: fuel left, 0..100. */
  constructor(public pct = 100) {}

  /** Percent per second at a throttle setting (0..1). */
  static burnRate(throttle: number, leakMul = 1): number {
    const f = tuning.fuel;
    return (f.idleBurn + f.throttleBurn * throttle * throttle) * leakMul;
  }

  /** Burn one step's fuel. World passes Damage.leak as `leakMul`; on the ground the burn is scaled by fuel.groundBurnMul. */
  update(throttle: number, leakMul: number, dt: number, onGround = false): void {
    const mul = onGround ? tuning.fuel.groundBurnMul : 1;
    this.pct = Math.max(0, this.pct - Fuel.burnRate(throttle, leakMul) * mul * dt);
  }

  /** Tanks dry: World flames out the engine (FlightMods.engineOut). */
  get empty(): boolean {
    return this.pct <= 0;
  }

  /** Below fuel.bingo percent; Sortie makes a one-time radio call. */
  get bingo(): boolean {
    return this.pct < tuning.fuel.bingo;
  }
}
