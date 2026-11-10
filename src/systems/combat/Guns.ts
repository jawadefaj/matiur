// Guns, bullets and the lead-computing gunsight.
// The F-86F's A-4 sight computed lead; here auto-fire triggers when the
// predicted (lead) position of a target sits inside the gunsight cone.
import { DEG, angleDiff, headingTo } from '../math';
import { pxPerSec, velocity, type FlightState } from '../flight/FlightModel';
import type { Side } from '../../sim/types';

/** One entry of tuning.guns. */
export interface GunSpec {
  /** Sight cone: the lead point must be within this many degrees of the nose. */
  coneDeg: number;
  /** Furthest lead point that counts as in the cone, px. */
  range: number;
  /** Muzzle speed relative to the shooter, px/s. */
  bulletSpeed: number;
  /** Seconds before a bullet disappears. */
  bulletLife: number;
  /** Seconds between rounds. */
  fireInterval: number;
  /** Total random spread, degrees (half each side of the nose). */
  spreadDeg: number;
  /** Per round: hp off other aircraft, or the Damage.hit() amount for the player. */
  damage: number;
  /** Burst length in seconds (0 = unlimited). */
  burst: number;
  /** Pause between bursts in seconds. */
  pause: number;
}

/** A round in flight; World moves it and tests it for hits. */
export interface Bullet {
  /** Position, world px. */
  x: number;
  y: number;
  /** Velocity, px/s (includes the shooter's own velocity). */
  vx: number;
  vy: number;
  /** Seconds left before it disappears. */
  life: number;
  side: Side;
  damage: number;
  ownerId: number;
}

export interface LeadSolution {
  /** World point to aim at now so bullets meet the target. */
  lx: number;
  ly: number;
  /** Distance from the shooter to the aim point, px. */
  dist: number;
  /** Bullet flight time to the aim point, seconds. */
  time: number;
}

/**
 * Bullets inherit the shooter's velocity, so in the shooter's frame they fly
 * straight ahead at bulletSpeed while the target drifts at (vTarget - vShooter).
 */
export function leadSolution(shooter: FlightState, target: FlightState, bulletSpeed: number): LeadSolution {
  const vs = velocity(shooter);
  const vt = velocity(target);
  const rvx = vt.vx - vs.vx;
  const rvy = vt.vy - vs.vy;
  const dx0 = target.x - shooter.x;
  const dy0 = target.y - shooter.y;
  // Guess the flight time from the current range, then refine it a few times
  // using the range to where the target will be after that time.
  let t = Math.hypot(dx0, dy0) / bulletSpeed;
  for (let i = 0; i < 3; i++) {
    t = Math.hypot(dx0 + rvx * t, dy0 + rvy * t) / bulletSpeed;
  }
  const lx = target.x + rvx * t;
  const ly = target.y + rvy * t;
  return { lx, ly, dist: Math.hypot(lx - shooter.x, ly - shooter.y), time: t };
}

/** Angle (rad) between the shooter's nose and a world point. */
export function offBoresight(shooter: FlightState, x: number, y: number): number {
  return Math.abs(angleDiff(shooter.heading, headingTo(shooter.x, shooter.y, x, y)));
}

/** True when the lead point is within gun range and inside the sight cone. */
export function inCone(shooter: FlightState, sol: LeadSolution, spec: GunSpec): boolean {
  return sol.dist <= spec.range && offBoresight(shooter, sol.lx, sol.ly) <= spec.coneDeg * DEG;
}

/** One aircraft's guns: fire rate, burst and pause limits, and spawning bullets. */
export class Guns {
  firing = false;
  /** Set when a burst finishes; read and cleared by AI via takeBurstEnd(). */
  private burstEnded = false;
  /** Seconds until the next round may fire. */
  private cooldown = 0;
  /** Seconds into the current burst. */
  private burstTime = 0;
  /** Seconds left in the pause after a burst. */
  private pauseTime = 0;

  constructor(public spec: GunSpec) {}

  /** True once after each burst ends (FighterAI may then extend away). */
  takeBurstEnd(): boolean {
    const b = this.burstEnded;
    this.burstEnded = false;
    return b;
  }

  /** Step the gun. While `wantFire` holds (and no pause is running), push new rounds into `out`. */
  update(
    dt: number,
    ownerId: number,
    f: FlightState,
    wantFire: boolean,
    out: Bullet[],
    side: Side,
    rng: () => number,
  ): void {
    // The cooldown may run at most one interval below zero, so an idle gun
    // cannot bank a backlog of rounds and fire them all in one step.
    this.cooldown = Math.max(-this.spec.fireInterval, this.cooldown - dt);
    if (this.pauseTime > 0) {
      this.pauseTime -= dt;
      wantFire = false;
    }
    this.firing = wantFire;
    if (!wantFire) {
      this.burstTime = 0;
      return;
    }
    if (this.spec.burst > 0) {
      this.burstTime += dt;
      if (this.burstTime >= this.spec.burst) {
        this.burstTime = 0;
        // Pause for 70-130% of spec.pause, so bursts do not fall into a fixed rhythm.
        this.pauseTime = this.spec.pause * (0.7 + rng() * 0.6);
        this.burstEnded = true;
      }
    }
    // Each round leaves the nose at bulletSpeed along the (spread) aim, plus the
    // shooter's own velocity, which is what leadSolution assumes.
    const vs = pxPerSec(f.speed);
    while (this.cooldown <= 0) {
      this.cooldown += this.spec.fireInterval;
      const a = f.heading + (rng() - 0.5) * this.spec.spreadDeg * DEG;
      const nose = 9;
      out.push({
        x: f.x + Math.sin(f.heading) * nose,
        y: f.y - Math.cos(f.heading) * nose,
        vx: Math.sin(a) * this.spec.bulletSpeed + Math.sin(f.heading) * vs,
        vy: -Math.cos(a) * this.spec.bulletSpeed - Math.cos(f.heading) * vs,
        life: this.spec.bulletLife,
        side,
        damage: this.spec.damage,
        ownerId,
      });
    }
  }
}
