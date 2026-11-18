// Level 2 on foot: PAF Base Masroor, the east side, August 1971.
// One walk map for all three parts (design/Level 2 - Bluebird.md §1): the
// master map's region x 600-1220, y 430-900, drawn at 4x. Coordinates below are
// written in master-map pixels and converted by m(), so they can be read
// straight off assets/sprites/original/airport-level-map-clean.jpeg.
//
// The base map is one picture at full resolution, rebuilt from PixelLab art by
// assets/art-wip/level-2/build_masroor_map.py, which also writes the colliders
// (houses, trees, tanks, towers, jets, the perimeter wall) to masroorLayout.json.
// Characters are single still images.
import { WalkLevel, type Block } from '../WalkLevel';
import layout from './masroorLayout.json';
import { Stealth, type GuardDef } from '../stealth';
import { tuning } from '../tuning';
import type { Point, WalkEvent, WalkMap, WalkWorld } from '../WalkWorld';

/** Master-map region and scale. */
const X0 = 600;
const Y0 = 430;
const SCALE = 4;
const W = (1220 - X0) * SCALE;
const H = (900 - Y0) * SCALE;

/** Master-map px to world px. */
export const m = (x: number, y: number): Point => ({ x: (x - X0) * SCALE, y: (y - Y0) * SCALE });

/** Metres per world px (design doc §1). */
export const M_PER_PX = 1.41;

const PLAYER = 'walk_matiur_sd';
const GUARD = 'walk_guard';

/** Matiur's front door in Residential East. */
export const HOME = m(1064, 788);
export const OFFICE = m(862, 704);
/** The hospital's front door. */
export const HOSPITAL = m(873, 822);
export const RAMP_START = m(899, 698);

/** Bluebird's taxi route, East Dispersal to the end of the taxiway. */
export const BLUEBIRD_ROUTE: Point[] = [m(1044, 590), m(1000, 607.5), m(997.5, 545), m(972.5, 512.5), m(931, 487)];
/** The intercept point: the end of the route, where the taxiway meets the runway (1,150 m). */
export const INTERCEPT = BLUEBIRD_ROUTE[BLUEBIRD_ROUTE.length - 1];

/** A box of `size` world px centred on p. */
const zoneAt = (id: string, p: Point, size = 40) => ({ id, x: p.x - size / 2, y: p.y - size / 2, w: size, h: size });

/** The watchtower on the east wall, used at night in both night parts. */
const WATCHTOWER: GuardDef = {
  id: 'tower',
  name: 'Watchtower',
  look: GUARD,
  ...m(1180, 775),
  facing: 180,
  vision: { angle: 30, range: 260 },
  scan: { arc: 60, period: 7 },
};

/** Patrol on the north-south road by the ramp. */
const RAMP_ROAD: GuardDef = {
  id: 'road-ns',
  name: 'Naik Bashir',
  look: GUARD,
  ...m(915, 700),
  patrol: [m(915, 700), m(915, 810)],
};

/** Every solid thing on the map, from the map builder. */
const SOLIDS: Block[] = layout.solids.map((r) => ({ ...r, style: 'hidden', solid: true }));

abstract class Masroor extends WalkLevel {
  readonly place = 'PAF Base Masroor, Karachi';

  protected zones: WalkMap['zones'] = [];

  constructor(night: boolean) {
    super();
    this.night = night;
    // The picture is already at world size (1 px = 1 world px).
    this.backdrop = { key: night ? 'walk_masroor_night' : 'walk_masroor_day', scale: W / layout.width };
    this.groundColor = night ? 0x1c2230 : 0x9a8458;
    this.blocks = SOLIDS;
  }

  map(): WalkMap {
    return this.buildMap(W, H, this.zones);
  }

  protected spawn(w: WalkWorld, at: Point, guards: GuardDef[]): void {
    w.addActor({ id: 'player', name: 'Matiur', look: PLAYER, ...at });
    this.stealth = new Stealth(this.night ? tuning.stealth.nightRange : 1);
    for (const g of guards) this.stealth.add(w, g);
  }
}

/** 2.2 The Schedule: night, home to the flight-line office on East Ramp. */
export class MasroorSchedule extends Masroor {
  readonly id = 'masroor-schedule';
  readonly title = 'The Schedule';
  readonly date = 'August 1971, night';

  constructor() {
    super(true);
    this.zones = [zoneAt('office', OFFICE)];
    this.doneText = 'Bluebird. Pilot Officer Rashid Minhas. Solo. East Dispersal, 11:30.';
  }

  setup(w: WalkWorld): void {
    this.spawn(w, HOME, [
      { id: 'road-n', name: 'Naik Hamid', look: GUARD, ...m(920, 690), patrol: [m(920, 690), m(1150, 690)] },
      RAMP_ROAD,
      { id: 'ramp', name: 'Havildar Aslam', look: GUARD, ...m(885, 688), facing: 150, scan: { arc: 110, period: 5 } },
      // Walks the lane between the two rows of parked jets.
      { id: 'jets', name: 'Airman Qadir', look: GUARD, ...m(775, 662), patrol: [m(775, 662), m(855, 662)] },
      WATCHTOWER,
    ]);
    this.objectives = [{ id: 'office', label: 'Reach the flight-line office on East Ramp', state: 'active' }];
    this.hint = 'Stay out of the torch beams';
    this.markers = [{ ...OFFICE, label: 'OFFICE' }];
  }

  protected onEvent(_w: WalkWorld, e: WalkEvent): void {
    if (e.type === 'enteredZone' && e.zone === 'office' && this.obj('office').state === 'active') {
      this.setObj('office', 'done');
      this.markers = [];
      this.run(
        [
          this.talk(
            { speaker: 'Matiur', text: "Tomorrow's flying programme." },
            { speaker: 'Schedule', text: 'BLUEBIRD - P/O RASHID MINHAS - SOLO - EAST DISPERSAL - 11:30' },
          ),
          { done: () => (this.complete(), true) },
        ],
        true,
      );
    }
  }
}

/** 2.3 The Dispensary: night, home to the hospital. */
export class MasroorHospital extends Masroor {
  readonly id = 'masroor-hospital';
  readonly title = 'The Dispensary';
  readonly date = 'August 1971, night';

  constructor() {
    super(true);
    this.zones = [zoneAt('dispensary', HOSPITAL)];
    this.doneText = 'Back home before the next patrol passes.';
  }

  setup(w: WalkWorld): void {
    this.spawn(w, HOME, [
      { id: 'road-s', name: 'Naik Hamid', look: GUARD, ...m(905, 810), patrol: [m(905, 810), m(1060, 810)] },
      RAMP_ROAD,
      // At the hospital's east corner, watching the front door.
      { id: 'door', name: 'Sentry', look: GUARD, ...m(900, 822), facing: 190, scan: { arc: 100, period: 4 } },
      WATCHTOWER,
    ]);
    this.objectives = [{ id: 'dispensary', label: 'Reach the hospital dispensary', state: 'active' }];
    this.hint = 'Stay out of the torch beams';
    this.markers = [{ ...HOSPITAL, label: 'HOSPITAL' }];
  }

  protected onEvent(_w: WalkWorld, e: WalkEvent): void {
    if (e.type === 'enteredZone' && e.zone === 'dispensary' && this.obj('dispensary').state === 'active') {
      this.setObj('dispensary', 'done');
      this.markers = [];
      this.run(
        [
          this.talk({ speaker: 'Matiur', text: '[Placeholder] He takes what he came for. (Item to be verified against sources.)' }),
          { done: () => (this.complete(), true) },
        ],
        true,
      );
    }
  }
}

/** 2.5 Intercept: daylight, East Ramp to the end of the taxiway before Bluebird gets there. */
export class MasroorIntercept extends Masroor {
  readonly id = 'masroor-intercept';
  readonly title = 'Intercept';
  readonly date = '20 August 1971';

  /** Bluebird's taxi speed (world px/s) and the wait before it rolls (s). */
  static readonly SPEED = 36;
  static readonly DELAY = 4;
  /** How close (world px) Bluebird must be to the mark for SIGNAL to work. */
  static readonly SIGNAL_WINDOW = 140;

  /** World px travelled along the route. */
  travelled = 0;
  readonly routeLength: number;
  private t = 0;
  private signalled = false;

  constructor() {
    super(false);
    this.routeLength = BLUEBIRD_ROUTE.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - BLUEBIRD_ROUTE[i].x, p.y - BLUEBIRD_ROUTE[i].y), 0);
    const a = BLUEBIRD_ROUTE[0];
    const b = BLUEBIRD_ROUTE[1];
    this.vehicles = [{ key: 'walk_t33', x: a.x, y: a.y, heading: Math.atan2(b.y - a.y, b.x - a.x) }];
    this.rings = [{ ...INTERCEPT, r: 24, label: '1,150 m' }];
    this.doneText = 'Bluebird stops at the end of the taxiway.';
  }

  setup(w: WalkWorld): void {
    this.spawn(w, RAMP_START, [
      { id: 'north', name: 'Sentry', look: GUARD, ...m(790, 497), facing: 0, vision: { range: 130 }, scan: { arc: 50, period: 6 } },
      { id: 'diag', name: 'Airman', look: GUARD, ...m(845, 600), patrol: [m(845, 600), m(887, 547)] },
    ]);
    this.objectives = [{ id: 'signal', label: 'Be at the end of the taxiway when Bluebird arrives, and signal it', state: 'active' }];
    this.markers = [{ ...INTERCEPT, label: 'MARK' }];
    this.updateHint();
  }

  /** Metres Bluebird has taxied. */
  get metres(): number {
    return Math.round(this.travelled * M_PER_PX);
  }

  inRing(w: WalkWorld): boolean {
    return Math.hypot(w.player.x - INTERCEPT.x, w.player.y - INTERCEPT.y) <= this.rings[0].r;
  }

  canSignal(w: WalkWorld): boolean {
    return !this.signalled && this.inRing(w) && this.routeLength - this.travelled <= MasroorIntercept.SIGNAL_WINDOW;
  }

  actionLabel(w: WalkWorld): string | null {
    return this.canSignal(w) ? 'SIGNAL' : null;
  }

  action(w: WalkWorld): boolean {
    if (!this.canSignal(w)) return false;
    this.signalled = true;
    this.setObj('signal', 'done');
    this.markers = [];
    w.face('player', this.vehicles[0].x, this.vehicles[0].y);
    this.run(
      [
        this.talk(
          { speaker: 'Matiur', text: '(He raises his hand. Stop.)' },
          { speaker: 'Bluebird', text: 'Bluebird stopping. Sir?' },
        ),
        { done: () => (this.complete(), true) },
      ],
      true,
    );
    return true;
  }

  protected onEvent(): void {}

  protected script(_w: WalkWorld, dt: number): void {
    this.t += dt;
    if (!this.signalled && this.t > MasroorIntercept.DELAY) {
      this.travelled = Math.min(this.routeLength, this.travelled + MasroorIntercept.SPEED * dt);
      this.placeBluebird();
      if (this.travelled >= this.routeLength) this.fail('Bluebird is lining up on the runway.');
    }
    this.updateHint();
  }

  private placeBluebird(): void {
    let left = this.travelled;
    for (let i = 1; i < BLUEBIRD_ROUTE.length; i++) {
      const a = BLUEBIRD_ROUTE[i - 1];
      const b = BLUEBIRD_ROUTE[i];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (left <= len || i === BLUEBIRD_ROUTE.length - 1) {
        const k = Math.min(1, left / len);
        const v = this.vehicles[0];
        v.x = a.x + (b.x - a.x) * k;
        v.y = a.y + (b.y - a.y) * k;
        v.heading = Math.atan2(b.y - a.y, b.x - a.x);
        return;
      }
      left -= len;
    }
  }

  private updateHint(): void {
    const total = Math.round(this.routeLength * M_PER_PX / 10) * 10;
    this.hint = this.signalled
      ? ''
      : this.t <= MasroorIntercept.DELAY
        ? 'Bluebird is starting up at East Dispersal'
        : `BLUEBIRD ${this.metres.toLocaleString('en')} m of ${total.toLocaleString('en')} m`;
  }
}
