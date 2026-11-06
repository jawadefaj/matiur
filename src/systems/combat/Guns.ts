// Guns, bullets and the lead-computing gunsight.
// The F-86F's A-4 sight computed lead; here auto-fire triggers when the
// predicted (lead) position of a target sits inside the gunsight cone.
import { DEG, angleDiff, headingTo } from '../math';
import { pxPerSec, velocity, type FlightState } from '../flight/FlightModel';
import type { Side } from '../../sim/types';

export interface GunSpec {
  coneDeg: number;
  range: number;
  bulletSpeed: number;
  bulletLife: number;
  fireInterval: number;
  spreadDeg: number;
  damage: number;
  /** Burst length in seconds (0 = unlimited). */
  burst: number;
  /** Pause between bursts in seconds. */
  pause: number;
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  side: Side;
  damage: number;
  ownerId: number;
}

export interface LeadSolution {
  /** World point to aim at now so bullets meet the target. */
  lx: number;
  ly: number;
  dist: number;
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

export function inCone(shooter: FlightState, sol: LeadSolution, spec: GunSpec): boolean {
  return sol.dist <= spec.range && offBoresight(shooter, sol.lx, sol.ly) <= spec.coneDeg * DEG;
}

export class Guns {
  firing = false;
  /** Set when a burst finishes; read and cleared by AI via takeBurstEnd(). */
  private burstEnded = false;
  private cooldown = 0;
  private burstTime = 0;
  private pauseTime = 0;

  constructor(public spec: GunSpec) {}

  takeBurstEnd(): boolean {
    const b = this.burstEnded;
    this.burstEnded = false;
    return b;
  }

  update(
    dt: number,
    ownerId: number,
    f: FlightState,
    wantFire: boolean,
    out: Bullet[],
    side: Side,
    rng: () => number,
  ): void {
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
        this.pauseTime = this.spec.pause * (0.7 + rng() * 0.6);
        this.burstEnded = true;
      }
    }
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
