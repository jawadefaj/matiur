// Top-down flight model shared by Episode 2 and (later) Episode 4 Phase 3.
// Pure logic: no Phaser imports, so it can be unit-tested.
import { tuning } from '../../tuning';
import { DEG, angleDiff, approach, clamp, wrapAngle } from '../../../../core/math';

export interface FlightSpec {
  minSpeed: number; // kt, slowest airborne speed
  maxSpeed: number; // kt
  accel: number; // kt/s toward throttle target
  decel: number; // kt/s toward throttle target
  normalG: number; // G limit for an ordinary turn
  pullG: number; // G limit while PULL is held
  normalRateDeg: number; // deg/s cap for an ordinary turn
  pullRateDeg: number; // deg/s cap while PULL is held
  headingGain: number; // how hard the jet turns toward the stick direction
  rollRate: number; // rad/s^2, how quickly turn rate builds
  bleed: number; // kt/s lost per (G-1)^2
}

export interface FlightState {
  /** World position, px. y grows downward (south). */
  x: number;
  y: number;
  heading: number; // rad, 0 = north, clockwise
  speed: number; // kt
  throttle: number; // 0..1
  turnRate: number; // rad/s
  g: number; // instantaneous load factor
  altitude: number; // ft
  vz: number; // ft/s
  airborne: boolean;
}

export interface FlightInput {
  /** Absolute heading the player (or AI) wants; null = hold wings level. */
  desiredHeading: number | null;
  /** PULL held: a tighter turn at altitude, a climb in low-level mode. */
  pull: boolean;
  /** 0..1 */
  throttle: number;
}

/** Modifiers World sets each step: damage, greyout, low-level mode, engine out. */
export interface FlightMods {
  handling: number; // 1 = undamaged
  maxSpeed: number; // multiplier on max speed
  control: number; // 1 normally, lower during greyout
  lowLevel: boolean; // PULL climbs instead of tightening turns
  /** No thrust (World sets it when fuel runs out): airspeed decays to minSpeed and PULL cannot climb. */
  engineOut: boolean;
  extraSink?: number; // ft/s added to sink rate (e.g. engine out)
}

/** No damage, no greyout, normal flight. */
export const NO_MODS: FlightMods = {
  handling: 1,
  maxSpeed: 1,
  control: 1,
  lowLevel: false,
  engineOut: false,
};

/** Knots to world px per second (tuning.units.pxPerKnot). */
export function pxPerSec(kt: number): number {
  return kt * tuning.units.pxPerKnot;
}

/** Load factor of a level turn at `rate` rad/s and `speedKt`. */
export function gForTurn(rate: number, speedKt: number): number {
  // Centripetal acceleration in px/s², divided by units.g0 (one G in px/s²).
  // Lift must also carry the jet's weight (1 G), hence the square root.
  const a = Math.abs(rate) * pxPerSec(speedKt);
  return Math.sqrt(1 + (a / tuning.units.g0) ** 2);
}

/** Highest turn rate (rad/s) that stays within `g` at `speedKt`. */
export function maxRateForG(g: number, speedKt: number): number {
  // Floor the speed so a jet at rest does not divide by zero.
  const v = Math.max(1, pxPerSec(speedKt));
  return (tuning.units.g0 * Math.sqrt(Math.max(0, g * g - 1))) / v;
}

/** World velocity in px/s (vy is negative when heading north). */
export function velocity(s: FlightState): { vx: number; vy: number } {
  const v = pxPerSec(s.speed);
  return { vx: Math.sin(s.heading) * v, vy: -Math.cos(s.heading) * v };
}

/** A new flight state: airborne, level and heading north, unless `partial` says otherwise. */
export function makeFlightState(partial: Partial<FlightState> = {}): FlightState {
  return {
    x: 0,
    y: 0,
    heading: 0,
    speed: 400,
    throttle: 0.6,
    turnRate: 0,
    g: 1,
    altitude: 10000,
    vz: 0,
    airborne: true,
    ...partial,
  };
}

/** Throttle setting that holds `speedKt` in level flight. */
export function throttleForSpeed(spec: FlightSpec, speedKt: number): number {
  return clamp((speedKt - spec.minSpeed) / (spec.maxSpeed - spec.minSpeed), 0, 1);
}

/** Advance one aircraft by `dt` seconds, updating `s` in place. Called by World.step. */
export function stepFlight(
  s: FlightState,
  spec: FlightSpec,
  input: FlightInput,
  mods: FlightMods,
  dt: number,
): void {
  // --- Speed -------------------------------------------------------------
  s.throttle = mods.engineOut ? 0 : clamp(input.throttle, 0, 1);
  const maxSp = spec.maxSpeed * mods.maxSpeed;
  let target: number;
  let accel = spec.accel;
  // Throttle sets a target speed: 0..max on the ground (so the jet can sit
  // still), minSpeed..max in the air, or just minSpeed in the air with the engine out.
  if (!s.airborne) {
    target = s.throttle * maxSp;
    accel *= tuning.takeoff.groundAccelMul;
  } else if (mods.engineOut) {
    target = spec.minSpeed;
  } else {
    target = spec.minSpeed + s.throttle * (maxSp - spec.minSpeed);
  }
  s.speed = s.speed < target
    ? Math.min(target, s.speed + accel * dt)
    : Math.max(target, s.speed - spec.decel * dt);

  // --- Turning -----------------------------------------------------------
  // PULL tightens the turn at altitude. In low-level flight it climbs instead.
  const pullForTurn = input.pull && !mods.lowLevel;
  let targetRate = 0;
  if (s.airborne && input.desiredHeading !== null) {
    const err = angleDiff(s.heading, input.desiredHeading);
    const capDeg = (pullForTurn ? spec.pullRateDeg : spec.normalRateDeg) * mods.handling * mods.control;
    const gLimit = pullForTurn ? spec.pullG : spec.normalG;
    // Turn rate grows with the heading error, capped by the deg/s limit and by
    // the rate that reaches the G limit at this speed, so fast jets turn wider.
    const cap = Math.min(capDeg * DEG, maxRateForG(gLimit, s.speed));
    targetRate = clamp(err * spec.headingGain, -cap, cap);
  }
  // The rate builds at rollRate, standing in for the time it takes to roll into a bank.
  s.turnRate = approach(s.turnRate, targetRate, spec.rollRate * dt);
  s.heading = wrapAngle(s.heading + s.turnRate * dt);

  // --- Load factor and energy bleed -------------------------------------
  let g = s.airborne ? gForTurn(s.turnRate, s.speed) : 1;
  // A low-level pull-up adds lowLevel.pullUpG, so climbing shows on the G-meter and bleeds speed.
  if (mods.lowLevel && s.airborne && input.pull) g += tuning.lowLevel.pullUpG;
  s.g = g;
  if (s.airborne) {
    s.speed -= spec.bleed * (g - 1) * (g - 1) * dt;
    s.speed = Math.max(spec.minSpeed, s.speed);
  }

  // --- Altitude (low-level mode only; otherwise scripted) ---------------
  if (mods.lowLevel && s.airborne) {
    // Vertical speed (ft/s) eases toward a climb while PULL is held, or a
    // sink otherwise, changing at most lowLevel.vAccel ft/s per second.
    const ll = tuning.lowLevel;
    const sink = ll.sinkRate + (mods.extraSink ?? 0);
    const targetVz = input.pull && !mods.engineOut ? ll.climbRate : -sink;
    s.vz = approach(s.vz, targetVz, ll.vAccel * dt);
    s.altitude += s.vz * dt;
  }

  // --- Position ----------------------------------------------------------
  const v = pxPerSec(s.speed);
  s.x += Math.sin(s.heading) * v * dt;
  s.y -= Math.cos(s.heading) * v * dt;
}
