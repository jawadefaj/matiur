// AI pilots. Each controller writes its aircraft's input every step.
// Enemies are period aircraft flown with skill, not menace: when hit hard
// enough they trail smoke and break off for home.
import { tuning } from '../../data/tuning';
import {
  DEG,
  angleDiff,
  clamp,
  clockPosition,
  dist,
  headingTo,
  lerp,
  rotateOffset,
} from '../math';
import { throttleForSpeed, velocity } from '../flight/FlightModel';
import { inCone, leadSolution } from '../combat/Guns';
import type { AI, Aircraft } from '../../sim/types';
import type { World } from '../../sim/World';

export interface Point {
  x: number;
  y: number;
}

function steerTo(self: Aircraft, x: number, y: number): void {
  self.input.desiredHeading = headingTo(self.f.x, self.f.y, x, y);
}

function d(a: Aircraft, b: Aircraft): number {
  return dist(a.f.x, a.f.y, b.f.x, b.f.y);
}

/** Pursue `target` with lead and fire when the solution is in the cone. */
function pursue(self: Aircraft, target: Aircraft, skill: number, w: World): void {
  const inp = self.input;
  const bs = self.guns?.spec.bulletSpeed ?? 520;
  const sol = leadSolution(self.f, target.f, bs);
  const aim = headingTo(self.f.x, self.f.y, sol.lx, sol.ly);
  // Less skilled pilots wobble around the aim point.
  inp.desiredHeading = aim + (1 - skill) * 0.12 * Math.sin(w.time * 1.7 + self.id * 1.3);
  const err = Math.abs(angleDiff(self.f.heading, aim));
  inp.pull = err > 30 * DEG;
  inp.throttle = d(self, target) > 320 ? 1 : 0.8;
  // Enemies hold fire on head-on passes (too fast to aim, and unfair on a phone).
  const aspect = Math.abs(angleDiff(self.f.heading, target.f.heading));
  const aspectOk = self.side !== 'enemy' || aspect <= tuning.ai.maxFireAspectDeg * DEG;
  inp.fire = !!self.guns && self.status === 'active' && aspectOk && inCone(self.f, sol, self.guns.spec);
}

/** Is `attacker` behind `victim` and pointing at it? */
export function isThreatening(attacker: Aircraft, victim: Aircraft, range: number, coneDeg: number): boolean {
  if (d(attacker, victim) > range) return false;
  const toVictim = headingTo(attacker.f.x, attacker.f.y, victim.f.x, victim.f.y);
  return Math.abs(angleDiff(attacker.f.heading, toVictim)) < coneDeg * DEG;
}

export interface FighterOpts {
  /** Who this fighter goes after. */
  prefer: 'player' | 'escortee';
  /** Bomber to escort until the player comes close. */
  escortId?: number;
  /** Where to fly when broken off. */
  home: Point;
  /** 0..1 */
  skill: number;
  /** Which side of the bomber to fly when escorting. */
  escortSide?: 1 | -1;
}

export class FighterAI implements AI {
  mode: 'escort' | 'engage' | 'extend' | 'defend' = 'engage';
  targetId: number | null = null;
  private timer = 0;
  private breakDir = 1;
  private slotX: number;
  /** Seconds spent fighting; enemies leave when their combat fuel runs out. */
  private fightTime = 0;

  constructor(public o: FighterOpts) {
    if (o.escortId !== undefined) this.mode = 'escort';
    this.slotX = 46 * (o.escortSide ?? 1);
  }

  update(self: Aircraft, w: World, dt: number): void {
    const inp = self.input;
    if (self.status === 'brokenOff') {
      steerTo(self, this.o.home.x, this.o.home.y);
      inp.pull = false;
      inp.throttle = 1;
      inp.fire = false;
      return;
    }

    if (this.mode !== 'escort') {
      this.fightTime += dt;
      if (this.fightTime > tuning.ai.combatFuel * (0.85 + this.o.skill * 0.3)) {
        w.disengage(self);
        return;
      }
    }

    // Defensive break when someone is on our tail.
    if (this.mode !== 'defend' && this.mode !== 'escort') {
      const threat = this.threat(self, w);
      const chance = tuning.ai.defendChancePerSec * dt * (0.4 + this.o.skill);
      if (threat && w.rng() < chance) {
        this.mode = 'defend';
        this.timer = 0.9 + w.rng() * 1.3;
        const side = angleDiff(threat.f.heading, headingTo(threat.f.x, threat.f.y, self.f.x, self.f.y));
        this.breakDir = side >= 0 ? 1 : -1;
      }
    }

    switch (this.mode) {
      case 'defend':
        this.timer -= dt;
        inp.desiredHeading = self.f.heading + this.breakDir * 100 * DEG;
        inp.pull = true;
        inp.throttle = 1;
        inp.fire = false;
        if (this.timer <= 0) this.mode = 'engage';
        return;
      case 'extend':
        this.timer -= dt;
        inp.desiredHeading = self.f.heading;
        inp.pull = false;
        inp.throttle = 1;
        inp.fire = false;
        if (this.timer <= 0) this.mode = 'engage';
        return;
      case 'escort': {
        const bomber = this.o.escortId !== undefined ? w.byId(this.o.escortId) : undefined;
        const p = w.player;
        const r = tuning.ai.escortEngageRange;
        if (!bomber || bomber.status !== 'active' || d(p, bomber) < r || d(p, self) < r) {
          this.mode = 'engage';
          this.targetId = p.id;
          break;
        }
        const off = rotateOffset(this.slotX, 40, bomber.f.heading);
        const sx = bomber.f.x + off.x;
        const sy = bomber.f.y + off.y;
        const bv = velocity(bomber.f);
        steerTo(self, sx + bv.vx * 0.8, sy + bv.vy * 0.8);
        const h = bomber.f.heading;
        const along = (sx - self.f.x) * Math.sin(h) - (sy - self.f.y) * Math.cos(h);
        inp.throttle = throttleForSpeed(self.spec, bomber.f.speed + clamp(along * 1.5, -60, 120));
        inp.pull = false;
        inp.fire = false;
        return;
      }
      case 'engage':
        break;
    }

    const target = this.pickTarget(self, w);
    if (!target) {
      steerTo(self, this.o.home.x, this.o.home.y);
      inp.pull = false;
      inp.fire = false;
      inp.throttle = 0.8;
      return;
    }
    pursue(self, target, this.o.skill, w);
    if (self.guns?.takeBurstEnd() && w.rng() < tuning.ai.extendAfterBurst) {
      this.mode = 'extend';
      this.timer = 1.4 + w.rng() * 1.2;
      return;
    }
    const close = d(self, target) < tuning.ai.overshootRange;
    if (close && Math.abs(angleDiff(self.f.heading, target.f.heading)) > 70 * DEG) {
      this.mode = 'extend';
      this.timer = 1.0 + w.rng();
    }
  }

  private threat(self: Aircraft, w: World): Aircraft | null {
    const ai = tuning.ai;
    for (const a of w.aircraft) {
      if (a.side === 'enemy' || a.status !== 'active') continue;
      if (a.role !== 'player' && a.role !== 'wingman') continue;
      if (isThreatening(a, self, ai.defendRange, ai.defendConeDeg)) return a;
    }
    return null;
  }

  private pickTarget(self: Aircraft, w: World): Aircraft | null {
    const p = w.player;
    const sticky = this.targetId !== null ? w.byId(this.targetId) : undefined;
    if (sticky && sticky.status === 'active' && sticky.role !== 'player') {
      // Turn on the player if they get very close.
      if (d(p, self) < 180) return (this.targetId = p.id), p;
      return sticky;
    }
    if (this.o.prefer === 'escortee') {
      let best: Aircraft | null = null;
      let bestD = Infinity;
      for (const a of w.aircraft) {
        if (a.role !== 'escortee' || a.status !== 'active') continue;
        const dd = d(a, self);
        if (dd < bestD) {
          bestD = dd;
          best = a;
        }
      }
      if (best && d(p, self) > 180) {
        this.targetId = best.id;
        return best;
      }
    }
    this.targetId = p.id;
    return p.status === 'active' ? p : null;
  }
}

/** Bomber: flies straight for its target, then home. Has no guns. */
export class BomberAI implements AI {
  bombed = false;

  constructor(
    public target: Point,
    public home: Point,
    public cruise = 330,
    public bombRadius = 240,
  ) {}

  update(self: Aircraft, w: World): void {
    const inp = self.input;
    inp.fire = false;
    inp.pull = false;
    if (self.status === 'brokenOff' || this.bombed) {
      steerTo(self, this.home.x, this.home.y);
      inp.throttle = 1;
      return;
    }
    steerTo(self, this.target.x, this.target.y);
    inp.throttle = throttleForSpeed(self.spec, this.cruise);
    if (dist(self.f.x, self.f.y, this.target.x, this.target.y) < this.bombRadius) {
      this.bombed = true;
      w.events.push({ type: 'baseHit', id: self.id, x: this.target.x, y: this.target.y });
    }
  }
}

/** Friendly aircraft the player escorts home. */
export class EscorteeAI implements AI {
  constructor(
    public dest: Point,
    public divert: Point,
    public cruise = 300,
    public landRadius = 150,
  ) {}

  update(self: Aircraft, w: World): void {
    const inp = self.input;
    inp.fire = false;
    inp.pull = false;
    if (self.status === 'brokenOff') {
      steerTo(self, this.divert.x, this.divert.y);
      inp.throttle = 0.5;
      return;
    }
    steerTo(self, this.dest.x, this.dest.y);
    inp.throttle = throttleForSpeed(self.spec, this.cruise);
    if (dist(self.f.x, self.f.y, this.dest.x, this.dest.y) < this.landRadius) {
      self.status = 'landed';
      w.events.push({ type: 'landed', id: self.id });
    }
  }
}

/** Sherdil Two: flies a route, holds formation on the player, calls threats. */
export class WingmanAI implements AI {
  mode: 'route' | 'form' | 'engage' = 'form';
  route: Point[] = [];
  routeSpeed = 300;
  /** Formation slot relative to the player (right wing, slightly back). */
  slot = { x: 34, y: 22 };
  calls = true;
  canEngage = true;
  private routeIndex = 0;
  private targetId: number | null = null;
  private engageTimer = 0;
  private spotted = new Set<number>();

  update(self: Aircraft, w: World, dt: number): void {
    const inp = self.input;
    inp.pull = false;
    inp.fire = false;
    if (this.calls) this.radioCalls(w);

    if (this.mode === 'route') {
      if (this.route.length === 0) return;
      const wp = this.route[this.routeIndex];
      steerTo(self, wp.x, wp.y);
      inp.throttle = throttleForSpeed(self.spec, this.routeSpeed);
      if (dist(self.f.x, self.f.y, wp.x, wp.y) < 160) this.routeIndex = (this.routeIndex + 1) % this.route.length;
      return;
    }

    const p = w.player;
    if (this.mode === 'form' && this.canEngage) {
      const threat = w.activeEnemies().find((e) => isThreatening(e, p, 260, 30));
      if (threat) {
        this.mode = 'engage';
        this.targetId = threat.id;
        this.engageTimer = 10;
        w.radio.say('Sherdil Two', "I'm on him!", { key: 'engage', cooldown: 12 });
      }
    }
    if (this.mode === 'engage') {
      this.engageTimer -= dt;
      const t = this.targetId !== null ? w.byId(this.targetId) : undefined;
      if (!t || t.status !== 'active' || this.engageTimer <= 0) {
        this.mode = 'form';
      } else {
        pursue(self, t, 0.6, w);
        return;
      }
    }

    // Formation keeping.
    const off = rotateOffset(this.slot.x, this.slot.y, p.f.heading);
    const sx = p.f.x + off.x;
    const sy = p.f.y + off.y;
    const pv = velocity(p.f);
    const dd = dist(self.f.x, self.f.y, sx, sy);
    if (dd < 10) inp.desiredHeading = p.f.heading;
    else steerTo(self, sx + pv.vx * 0.7, sy + pv.vy * 0.7);
    const h = p.f.heading;
    const along = (sx - self.f.x) * Math.sin(h) - (sy - self.f.y) * Math.cos(h);
    const targetSpeed = dd > 150 ? self.spec.maxSpeed : p.f.speed + clamp(along * 1.5, -80, 140);
    inp.throttle = throttleForSpeed(self.spec, targetSpeed);
    // Hold a neat slot once close (keeps formation readable on a phone).
    if (dd < 24 && p.f.airborne) {
      const k = Math.min(1, dt * 2);
      self.f.x = lerp(self.f.x, sx, k);
      self.f.y = lerp(self.f.y, sy, k);
      self.f.speed = lerp(self.f.speed, p.f.speed, k);
    }
  }

  setRoute(route: Point[], speed: number): void {
    this.mode = 'route';
    this.route = route;
    this.routeIndex = 0;
    this.routeSpeed = speed;
  }

  private radioCalls(w: World): void {
    const p = w.player;
    if (!p.f.airborne) return;
    // New bandits coming into view.
    const fresh = w
      .activeEnemies()
      .filter((e) => !this.spotted.has(e.id) && dist(e.f.x, e.f.y, p.f.x, p.f.y) < 700);
    if (fresh.length > 0) {
      fresh.forEach((e) => this.spotted.add(e.id));
      const e = fresh[0];
      const clock = clockPosition(angleDiff(p.f.heading, headingTo(p.f.x, p.f.y, e.f.x, e.f.y)));
      const what = fresh.length > 1 ? `${fresh.length} bandits` : 'Bandit';
      w.radio.say('Sherdil Two', `${what}, ${clock} o'clock!`, { key: 'spot', cooldown: 5 });
    }
    // Someone on the player's six.
    const six = w.activeEnemies().find((e) => isThreatening(e, p, 240, 25));
    if (six) {
      const rel = angleDiff(p.f.heading, headingTo(p.f.x, p.f.y, six.f.x, six.f.y));
      const dir = rel > 0 ? 'right' : 'left';
      w.radio.say('Sherdil Two', `One, break ${dir}! Bandit on your six!`, {
        key: 'six',
        cooldown: 7,
        urgent: true,
      });
    }
  }
}

