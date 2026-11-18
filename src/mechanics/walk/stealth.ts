// Guards and their vision cones for the stealth parts of Level 2. A guard is
// an ordinary walking actor plus a look direction, a cone and a detection
// meter. Being inside a cone with nothing in the way fills the meter; out of
// sight it drains. Full means caught. Phaser-free, so it runs in tests.
import { tuning } from './tuning';
import type { Point, WalkWorld } from './WalkWorld';

const DEG = Math.PI / 180;

export interface GuardDef {
  id: string;
  name: string;
  /** Texture key of the guard's walker sheet. */
  look: string;
  x: number;
  y: number;
  /** Walk round these points. Empty or left out: he stands still. */
  patrol?: Point[];
  /** Where he looks while standing, degrees: 0 east, 90 south, 180 west, 270 north. */
  facing?: number;
  /** Cone width (degrees) and reach (world px). Defaults from tuning.json. */
  vision?: { angle?: number; range?: number };
  /** While standing, sweep `arc` degrees around `facing` once every `period` seconds. */
  scan?: { arc: number; period: number };
}

export type GuardState = 'calm' | 'suspicious' | 'caught';

export interface Guard {
  id: string;
  /** Current look direction, radians. */
  look: number;
  /** Look direction while standing, radians. */
  rest: number;
  /** Cone width, radians. */
  angle: number;
  /** Reach, world px (night already applied). */
  range: number;
  scan: { arc: number; period: number } | null;
  /** 0..1. */
  detection: number;
  state: GuardState;
  /** True if he sees the player this step. */
  seen: boolean;
  last: Point;
  /** His rounds, held while he stops to look. */
  held?: Point[];
}

/** Smallest signed difference a - b between two angles, in -PI..PI. */
export function angleDiff(a: number, b: number): number {
  let d = (a - b) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

export class Stealth {
  guards: Guard[] = [];
  private t = 0;

  /** rangeScale multiplies every cone's reach: tuning.stealth.nightRange at night. */
  constructor(readonly rangeScale = 1) {}

  /** Spawn the guard as an actor in the world and give him a cone. */
  add(w: WalkWorld, d: GuardDef): Guard {
    const s = tuning.stealth;
    w.addActor({ id: d.id, name: d.name, look: d.look, x: d.x, y: d.y, speed: s.guardSpeed });
    if (d.patrol && d.patrol.length > 0) w.setPatrol(d.id, d.patrol);
    const rest = (d.facing ?? 90) * DEG;
    const g: Guard = {
      id: d.id,
      look: rest,
      rest,
      angle: (d.vision?.angle ?? s.angle) * DEG,
      range: (d.vision?.range ?? s.range) * this.rangeScale,
      scan: d.scan ?? null,
      detection: 0,
      state: 'calm',
      seen: false,
      last: { x: d.x, y: d.y },
    };
    this.guards.push(g);
    return g;
  }

  /** True if guard g can see (px, py): in range, inside the cone, and no wall in between. */
  sees(w: WalkWorld, g: Guard, px: number, py: number): boolean {
    const a = w.actor(g.id);
    const dx = px - a.x;
    const dy = py - a.y;
    const d = Math.hypot(dx, dy);
    if (d > g.range) return false;
    if (d > 1 && Math.abs(angleDiff(Math.atan2(dy, dx), g.look)) > g.angle / 2) return false;
    return w.nav.clearLine(a, { x: px, y: py });
  }

  /** Advance one step. Returns the guard who caught the player, if any. */
  step(w: WalkWorld, dt: number): Guard | null {
    const s = tuning.stealth;
    this.t += dt;
    const p = w.player;
    let caughtBy: Guard | null = null;
    for (const g of this.guards) {
      const a = w.actor(g.id);
      // Where he wants to look: toward the player once suspicious and seeing him,
      // else where he walks, else his rest direction (sweeping if he scans).
      const mx = a.x - g.last.x;
      const my = a.y - g.last.y;
      g.last = { x: a.x, y: a.y };
      let target = g.rest;
      if (g.state === 'suspicious' && g.seen) target = Math.atan2(p.y - a.y, p.x - a.x);
      else if (Math.hypot(mx, my) > 1e-6) target = Math.atan2(my, mx);
      else if (g.scan) target = g.rest + Math.sin((this.t / g.scan.period) * 2 * Math.PI) * (g.scan.arc / 2) * DEG;
      const turn = s.turnRate * DEG * dt;
      const diff = angleDiff(target, g.look);
      g.look += Math.abs(diff) <= turn ? diff : Math.sign(diff) * turn;

      g.seen = !w.locked && this.sees(w, g, p.x, p.y);
      if (g.seen) {
        const d = Math.hypot(p.x - a.x, p.y - a.y);
        g.detection += s.fill * (1 + s.nearBoost * (1 - d / g.range)) * dt;
      } else {
        g.detection -= s.drain * dt;
      }
      g.detection = Math.max(0, Math.min(1, g.detection));
      g.state = g.detection >= 1 ? 'caught' : g.detection >= s.suspicious ? 'suspicious' : 'calm';
      // A suspicious guard stops to look; once calm he goes back to his rounds.
      if (g.state === 'suspicious' && g.seen && a.patrol) {
        g.held = a.patrol;
        w.stop(g.id);
      } else if (g.state === 'calm' && g.held) {
        w.setPatrol(g.id, g.held);
        g.held = undefined;
      }
      if (g.state === 'caught' && !caughtBy) caughtBy = g;
    }
    return caughtBy;
  }

  /** The highest detection of any guard, for the HUD meter. */
  get alarm(): number {
    return this.guards.reduce((m, g) => Math.max(m, g.detection), 0);
  }
}
