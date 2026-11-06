// The simulation: aircraft, bullets, player systems and events.
// Engine-independent so it can run in tests and be rendered by any scene.
import { tuning, type GunKind } from '../data/tuning';
import { DEG, dist, mulberry32, segmentCircleHit } from '../systems/math';
import {
  makeFlightState,
  stepFlight,
  type FlightMods,
  type FlightSpec,
  type FlightState,
} from '../systems/flight/FlightModel';
import { GMeter } from '../systems/flight/GMeter';
import { Fuel } from '../systems/flight/Fuel';
import { Damage } from '../systems/flight/Damage';
import { Guns, inCone, leadSolution, offBoresight, type Bullet } from '../systems/combat/Guns';
import { Radio } from '../systems/radio/Radio';
import type { AI, Aircraft, GameEvent, Kind, Role, Side } from './types';

export interface PlayerControls {
  desiredHeading: number | null;
  pull: boolean;
  throttle: number;
  fire: boolean;
}

export interface GunTarget {
  id: number;
  lx: number;
  ly: number;
  inCone: boolean;
}

export interface SpawnOpts {
  kind: Kind;
  side: Side;
  role: Role;
  callsign?: string;
  x: number;
  y: number;
  heading: number;
  speed: number;
  throttle?: number;
  altitude?: number;
  airborne?: boolean;
  guns?: GunKind | null;
  ai?: AI | null;
  invulnerable?: boolean;
  tag?: string;
}

export class World {
  time = 0;
  aircraft: Aircraft[] = [];
  bullets: Bullet[] = [];
  events: GameEvent[] = [];
  rng: () => number;
  player!: Aircraft;

  controls: PlayerControls = { desiredHeading: null, pull: false, throttle: 0.7, fire: false };
  gunsMode: 'auto' | 'hold' = 'auto';
  allowPlayerGuns = true;

  gmeter = new GMeter();
  fuel = new Fuel(100);
  damage = new Damage();
  radio = new Radio();

  /** Low-level flight: PULL climbs, altitude matters. Set by the sortie. */
  lowLevel = false;
  /** Seconds since the engine flamed out (fuel empty). */
  flameoutTime = 0;
  gunTarget: GunTarget | null = null;
  /** After losing a pip the player gets a moment's grace, so one burst can't take all three. */
  private graceUntil = 0;

  private nextId = 1;

  constructor(seed = 1) {
    this.rng = mulberry32(seed);
  }

  spawn(o: SpawnOpts): Aircraft {
    const t = tuning.aircraft[o.kind];
    const spec: FlightSpec = t;
    const f: FlightState = makeFlightState({
      x: o.x,
      y: o.y,
      heading: o.heading,
      speed: o.speed,
      throttle: o.throttle ?? 0.6,
      altitude: o.altitude ?? 10000,
      airborne: o.airborne ?? true,
    });
    const gunKind = o.guns === undefined ? defaultGuns(o.side, o.role) : o.guns;
    const a: Aircraft = {
      id: this.nextId++,
      kind: o.kind,
      side: o.side,
      role: o.role,
      callsign: o.callsign ?? '',
      f,
      spec,
      radius: t.radius,
      hp: t.hp,
      maxHp: t.hp,
      status: 'active',
      input: { desiredHeading: null, pull: false, throttle: f.throttle, fire: false },
      guns: gunKind ? new Guns(tuning.guns[gunKind]) : null,
      ai: o.ai ?? null,
      invulnerable: o.invulnerable ?? false,
      smoke: 0,
      brokenTime: 0,
      tag: o.tag ?? '',
    };
    this.aircraft.push(a);
    if (o.role === 'player') this.player = a;
    return a;
  }

  byId(id: number): Aircraft | undefined {
    return this.aircraft.find((a) => a.id === id);
  }

  /** Aircraft still flying (active or breaking off). */
  flying(): Aircraft[] {
    return this.aircraft.filter((a) => a.status === 'active' || a.status === 'brokenOff');
  }

  activeEnemies(): Aircraft[] {
    return this.aircraft.filter((a) => a.side === 'enemy' && a.status === 'active');
  }

  step(dt: number): void {
    this.time += dt;
    const p = this.player;

    // Player input and auto-fire.
    if (p.status === 'active') {
      p.input.desiredHeading = this.controls.desiredHeading;
      p.input.pull = this.controls.pull;
      p.input.throttle = this.controls.throttle;
      this.updateGunTarget();
      const wantFire = this.gunsMode === 'auto' ? !!this.gunTarget?.inCone : this.controls.fire;
      p.input.fire = this.allowPlayerGuns && p.f.airborne && wantFire;
    }

    // AI decides its inputs.
    for (const a of this.aircraft) {
      if (a.ai && (a.status === 'active' || a.status === 'brokenOff')) a.ai.update(a, this, dt);
    }

    // Physics and guns.
    for (const a of this.aircraft) {
      if (a.status === 'gone' || a.status === 'landed') continue;
      const isPlayer = a === p;
      const mods: FlightMods = isPlayer
        ? {
            handling: this.damage.handling,
            maxSpeed: this.damage.maxSpeed,
            control: this.gmeter.controlMul,
            lowLevel: this.lowLevel,
            engineOut: this.fuel.empty,
            extraSink: this.fuel.empty ? tuning.lowLevel.engineOutSink : 0,
          }
        : {
            handling: a.status === 'brokenOff' ? 0.7 : 1,
            maxSpeed: 1,
            control: 1,
            lowLevel: false,
            engineOut: false,
          };
      if (isPlayer && p.status !== 'active') continue;
      stepFlight(a.f, a.spec, a.input, mods, dt);
      if (a.guns) {
        a.guns.update(dt, a.id, a.f, a.input.fire && a.status === 'active', this.bullets, a.side, this.rng);
      }
    }

    // Player systems.
    if (p.status === 'active') {
      this.gmeter.update(p.f.g, dt);
      this.fuel.update(p.f.throttle, this.damage.leak, dt, !p.f.airborne);
      this.flameoutTime = this.fuel.empty ? this.flameoutTime + dt : 0;
    }

    this.stepBullets(dt);
    this.stepBrokenOff(dt);
    this.radio.update(dt);
  }

  private updateGunTarget(): void {
    const p = this.player;
    const spec = p.guns?.spec;
    this.gunTarget = null;
    if (!spec || !p.f.airborne) return;
    let bestScore = Infinity;
    for (const a of this.aircraft) {
      if (a.side !== 'enemy' || a.status !== 'active') continue;
      if (dist(p.f.x, p.f.y, a.f.x, a.f.y) > spec.range * 1.8) continue;
      const sol = leadSolution(p.f, a.f, spec.bulletSpeed);
      const off = offBoresight(p.f, sol.lx, sol.ly);
      if (off > 35 * DEG) continue;
      const score = off * 4 + sol.dist / spec.range;
      if (score < bestScore) {
        bestScore = score;
        this.gunTarget = { id: a.id, lx: sol.lx, ly: sol.ly, inCone: inCone(p.f, sol, spec) };
      }
    }
  }

  private stepBullets(dt: number): void {
    const keep: Bullet[] = [];
    for (const b of this.bullets) {
      const x0 = b.x;
      const y0 = b.y;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      let hit = false;
      for (const a of this.aircraft) {
        if (a.status !== 'active' || a.invulnerable || !a.f.airborne) continue;
        const hostile = (b.side === 'enemy') !== (a.side === 'enemy');
        if (!hostile) continue;
        if (segmentCircleHit(x0, y0, b.x, b.y, a.f.x, a.f.y, a.radius)) {
          this.applyHit(a, b);
          hit = true;
          break;
        }
      }
      if (!hit && b.life > 0) keep.push(b);
    }
    this.bullets = keep;
  }

  private applyHit(a: Aircraft, b: Bullet): void {
    if (a === this.player) {
      this.events.push({ type: 'playerHit', x: b.x, y: b.y });
      if (this.time < this.graceUntil) return;
      const lost = this.damage.hit(b.damage);
      if (lost) {
        this.graceUntil = this.time + tuning.damage.pipGrace;
        this.events.push({ type: 'pipLost', pips: this.damage.pips });
      }
      a.smoke = this.damage.smoke;
      return;
    }
    a.hp -= b.damage;
    if (a.side === 'enemy') this.events.push({ type: 'hit', id: a.id, x: b.x, y: b.y });
    else this.events.push({ type: 'friendlyHit', id: a.id, x: b.x, y: b.y });
    if (a.hp < a.maxHp * 0.5) a.smoke = Math.max(a.smoke, 0.35);
    if (a.hp <= 0) this.breakOff(a);
  }

  /** Hit aircraft trail smoke and leave the fight. No explosions, by design. */
  breakOff(a: Aircraft): void {
    if (a.status !== 'active') return;
    a.status = 'brokenOff';
    a.smoke = 1;
    a.brokenTime = 0;
    a.input.fire = false;
    if (a.side === 'enemy') this.events.push({ type: 'brokeOff', id: a.id });
    else if (a.role === 'escortee') this.events.push({ type: 'escorteeLost', id: a.id });
  }

  /** An undamaged enemy leaving the fight (out of combat fuel). */
  disengage(a: Aircraft): void {
    if (a.status !== 'active') return;
    a.status = 'brokenOff';
    a.brokenTime = 0;
    a.input.fire = false;
    this.events.push({ type: 'disengaged', id: a.id });
  }

  private stepBrokenOff(dt: number): void {
    const ai = tuning.ai;
    const p = this.player;
    for (const a of this.aircraft) {
      if (a.status !== 'brokenOff') continue;
      a.brokenTime += dt;
      const far = dist(a.f.x, a.f.y, p.f.x, p.f.y) > ai.brokenOffGoneDist;
      if ((a.brokenTime > ai.brokenOffGoneAfter && far) || a.brokenTime > 25) a.status = 'gone';
    }
  }

  drainEvents(): GameEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }
}

function defaultGuns(side: Side, role: Role): GunKind | null {
  if (role === 'player') return 'player';
  if (role === 'wingman') return 'wingman';
  if (side === 'enemy' && role === 'fighter') return 'enemy';
  return null;
}
