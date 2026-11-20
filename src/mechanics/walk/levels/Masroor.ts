// Level 2 on foot: PAF Base Masroor, the east side, August 1971.
// One walk map for all three parts (design/Level 2 - Bluebird.md §1): the
// master map's region x 600-1220, y 430-900, drawn at 4x. Coordinates below are
// written in master-map pixels and converted by m(), so they can be read
// straight off assets/sprites/original/airport-level-map-clean.jpeg.
//
// The map is the Tiled map masroor.tmj (open it in Tiled 1.10+ to move things):
// a ground of 16 px tiles, the houses, trees, towers and parked jets as
// pictures, the perimeter wall, and the no-go areas. Its colliders come from
// the same file (src/core/tiled.ts), so what you see is what blocks. It was
// first built by `python scripts/art/art.py build-map masroor`.
import { t } from '../../../core/i18n';
import { collisionRects, parseTiledMap, prop, type TiledMap } from '../../../core/tiled';
import { WalkLevel, type Block, type MapSprite } from '../WalkLevel';
import { sceneryFromMap, type MapScenery } from '../mapScenery';
import raw from './masroor.tmj?raw';
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
/** Bluebird, the T-33: also the picture of every parked jet on the map. */
const T33 = 'walk_t33';

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

/** Whether p is inside a map picture's bounds (its y is the BOTTOM edge). */
const covers = (s: MapSprite, p: Point): boolean => s.x <= p.x && p.x <= s.x + s.w && s.y - s.h <= p.y && p.y <= s.y;

/** The watchtower on the east wall, used at night in both night parts. He stands up in the tower. */
export const WATCHTOWER: GuardDef = {
  id: 'tower',
  name: t('who.watchtower'),
  look: GUARD,
  ...m(1180, 775),
  facing: 180,
  vision: { angle: 30, range: 260 },
  scan: { arc: 60, period: 7 },
  elevated: true,
};

/** Patrol on the north-south road by the ramp. */
export const RAMP_ROAD: GuardDef = {
  id: 'road-ns',
  name: t('who.naikBashir'),
  look: GUARD,
  ...m(915, 700),
  patrol: [m(915, 700), m(915, 810)],
};

/** The map file read once, the first time a Masroor level (or its art) needs it. */
let loaded: { map: TiledMap; scenery: MapScenery; solids: Block[] } | null = null;

/** Masroor's Tiled map, parsed and checked. */
export function masroorMap(): TiledMap {
  return load().map;
}

/**
 * Parses and checks Masroor's map (the .tmj's JSON). It must be made for the
 * world the coordinates above are written for, and its tiles must cover it.
 */
export function readMasroorMap(json: unknown): TiledMap {
  const map = parseTiledMap(json);
  // The world's size is set by the map properties worldWidth and worldHeight.
  const size = [prop(map.props, 'worldWidth', 0), prop(map.props, 'worldHeight', 0)];
  if (size[0] !== W || size[1] !== H) throw new Error(`masroor.tmj: worldWidth x worldHeight is ${size[0]} x ${size[1]}, the level needs ${W} x ${H}.`);
  // The tiles may reach a little past the world (it isn't a whole number of tiles), never fall short of it.
  const tw = map.width * map.tilewidth;
  const th = map.height * map.tileheight;
  if (tw < W || th < H) {
    throw new Error(
      `masroor.tmj: its ${map.width} x ${map.height} tiles of ${map.tilewidth} x ${map.tileheight} px cover ${tw} x ${th} px, less than the ${W} x ${H} world. Make the map bigger in Tiled (Map > Resize Map).`,
    );
  }
  return map;
}

function load(): NonNullable<typeof loaded> {
  if (loaded) return loaded;
  const json: unknown = JSON.parse(raw);
  const map = readMasroorMap(json);
  loaded = {
    map,
    scenery: sceneryFromMap('walk_masroor', json, map),
    // Every solid thing on the map: object footprints, no-go areas, wall posts.
    solids: collisionRects(map).map((r) => ({ ...r, style: 'hidden', solid: true })),
  };
  return loaded;
}

abstract class Masroor extends WalkLevel {
  readonly place = t('masroor.place');

  protected zones: WalkMap['zones'] = [];

  constructor(night: boolean) {
    super();
    this.night = night;
    const { scenery, solids } = load();
    this.tilemap = scenery.tilemap;
    this.sprites = scenery.sprites;
    this.wallLines = scenery.wallLines;
    this.blocks = solids;
  }

  map(): WalkMap {
    return this.buildMap(W, H, this.zones);
  }

  protected spawn(w: WalkWorld, at: Point, guards: GuardDef[]): void {
    w.addActor({ id: 'player', name: t('who.matiur'), look: PLAYER, ...at });
    this.stealth = new Stealth(this.night ? tuning.stealth.nightRange : 1);
    for (const g of guards) this.stealth.add(w, g);
  }
}

/** 2.2 The Schedule: night, home to the flight-line office on East Ramp. */
export class MasroorSchedule extends Masroor {
  readonly id = 'masroor-schedule';
  readonly title = t('schedule.title');
  readonly date = t('walk.nightDate');

  constructor() {
    super(true);
    this.zones = [zoneAt('office', OFFICE)];
    this.doneText = t('schedule.done');
  }

  setup(w: WalkWorld): void {
    this.spawn(w, HOME, [
      { id: 'road-n', name: t('who.naikHamid'), look: GUARD, ...m(920, 690), patrol: [m(920, 690), m(1150, 690)] },
      RAMP_ROAD,
      { id: 'ramp', name: t('who.havildarAslam'), look: GUARD, ...m(885, 688), facing: 150, scan: { arc: 110, period: 5 } },
      // Walks the lane between the two rows of parked jets.
      { id: 'jets', name: t('who.airmanQadir'), look: GUARD, ...m(775, 662), patrol: [m(775, 662), m(855, 662)] },
      WATCHTOWER,
    ]);
    this.objectives = [{ id: 'office', label: t('schedule.obj'), state: 'active' }];
    this.hint = t('masroor.hint.beams');
    this.markers = [{ ...OFFICE, label: 'OFFICE' }];
  }

  protected onEvent(_w: WalkWorld, e: WalkEvent): void {
    if (e.type === 'enteredZone' && e.zone === 'office' && this.obj('office').state === 'active') {
      this.setObj('office', 'done');
      this.markers = [];
      this.run(
        [
          this.talk(
            { speaker: t('who.matiur'), text: t('schedule.read') },
            { speaker: t('who.schedule'), text: t('schedule.entry') },
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
  readonly title = t('hospital.title');
  readonly date = t('walk.nightDate');

  constructor() {
    super(true);
    this.zones = [zoneAt('dispensary', HOSPITAL)];
    this.doneText = t('hospital.done');
  }

  setup(w: WalkWorld): void {
    this.spawn(w, HOME, [
      { id: 'road-s', name: t('who.naikHamid'), look: GUARD, ...m(905, 810), patrol: [m(905, 810), m(1060, 810)] },
      RAMP_ROAD,
      // At the hospital's east corner, watching the front door.
      { id: 'door', name: t('who.sentry'), look: GUARD, ...m(900, 822), facing: 190, scan: { arc: 100, period: 4 } },
      WATCHTOWER,
    ]);
    this.objectives = [{ id: 'dispensary', label: t('hospital.obj'), state: 'active' }];
    this.hint = t('masroor.hint.beams');
    this.markers = [{ ...HOSPITAL, label: 'HOSPITAL' }];
  }

  protected onEvent(_w: WalkWorld, e: WalkEvent): void {
    if (e.type === 'enteredZone' && e.zone === 'dispensary' && this.obj('dispensary').state === 'active') {
      this.setObj('dispensary', 'done');
      this.markers = [];
      this.run(
        [
          this.talk({ speaker: t('who.matiur'), text: t('hospital.take') }),
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
  readonly title = t('intercept.title');
  readonly date = t('level2.date');

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
    this.vehicles = [{ key: T33, x: a.x, y: a.y, heading: Math.atan2(b.y - a.y, b.x - a.x) }];
    // Bluebird is one of the jets parked on East Dispersal: it starts where that
    // jet's picture stands, so the picture isn't drawn here. Its collider stays
    // (the old map had it too), so this level blocks the same as the night ones.
    this.sprites = this.sprites.filter((s) => !(s.key === T33 && covers(s, a)));
    this.rings = [{ ...INTERCEPT, r: 24, label: '1,150 m' }];
    this.doneText = t('intercept.done');
  }

  setup(w: WalkWorld): void {
    this.spawn(w, RAMP_START, [
      { id: 'north', name: t('who.sentry'), look: GUARD, ...m(790, 497), facing: 0, vision: { range: 130 }, scan: { arc: 50, period: 6 } },
      { id: 'diag', name: t('who.airman'), look: GUARD, ...m(845, 600), patrol: [m(845, 600), m(887, 547)] },
    ]);
    this.objectives = [{ id: 'signal', label: t('intercept.obj'), state: 'active' }];
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
    return this.canSignal(w) ? t('walk.signal') : null;
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
          { speaker: t('who.matiur'), text: t('intercept.raiseHand') },
          { speaker: t('who.bluebird'), text: t('intercept.stopping') },
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
      if (this.travelled >= this.routeLength) this.fail(t('intercept.fail'));
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
        ? t('intercept.hint.startup')
        : t('intercept.hint.taxi', { m: this.metres.toLocaleString('en'), total: total.toLocaleString('en') });
  }
}
