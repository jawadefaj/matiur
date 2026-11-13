// The walking simulation: characters on a top-down map, moved either by the
// player (tap to walk, or a direction from keys/stick) or by a script (walk
// this character along these points). Used for the on-foot parts of the game:
// the flight line between sorties, Episode 3's camp and Episode 4's tarmac.
// Engine-independent so it can run in tests and be drawn by WalkScene.
import { tuning } from './tuning';
import { NavGrid, type Point, type Rect } from './nav';

export type { Point, Rect } from './nav';

export type Facing = 'down' | 'left' | 'right' | 'up';

/** A walking character. Positions are the feet, in world px. */
export interface Actor {
  id: string;
  /** Name shown in dialogue and over the character. */
  name: string;
  /** Texture key for its sprite sheet (see bakeWalker in gfx/pixelArt.ts). */
  look: string;
  x: number;
  y: number;
  facing: Facing;
  /** Walking speed, px/s. */
  speed: number;
  /** Waypoints still to walk, nearest first. */
  path: Point[];
  /** True while it moved this step (drives the walk animation). */
  moving: boolean;
  /** Seconds spent walking, for the animation cycle. */
  walkTime: number;
  /** The player can tap or face it and talk. */
  talkable: boolean;
  /** Hidden actors aren't drawn and can't be talked to. */
  visible: boolean;
  /** Loop between these points while idle (an NPC on rounds). Cleared by walkTo/stop. */
  patrol?: Point[];
  patrolIdx?: number;
}

/** A named box on the map. WalkWorld reports when the player enters one. */
export interface Zone extends Rect {
  id: string;
}

export type WalkEvent =
  | { type: 'arrived'; id: string }
  | { type: 'enteredZone'; id: string; zone: string }
  | { type: 'talk'; target: string };

export interface ActorOpts {
  id: string;
  name: string;
  look: string;
  x: number;
  y: number;
  facing?: Facing;
  speed?: number;
  talkable?: boolean;
}

export interface WalkMap {
  width: number;
  height: number;
  walls: Rect[];
  zones: Zone[];
}

export class WalkWorld {
  time = 0;
  actors: Actor[] = [];
  /** Events from the latest steps; read them, then drainEvents(). */
  events: WalkEvent[] = [];
  readonly nav: NavGrid;
  readonly zones: Zone[];
  /** Set by addActor() for the actor with id 'player'. */
  player!: Actor;
  /**
   * Direct movement from keys or a stick, -1..1 on each axis. It overrides and
   * cancels any tap-to-walk path while non-zero.
   */
  input = { dx: 0, dy: 0 };
  /** While true the player can't move or talk (dialogue open, cutscene running). */
  locked = false;
  /** Who the player is walking over to talk to, if anyone. */
  private talkTarget: string | null = null;
  /** Zones the player was inside last step, so entering fires once. */
  private inside = new Set<string>();

  constructor(map: WalkMap) {
    const t = tuning.walk;
    this.nav = new NavGrid(map.width, map.height, map.walls, t.cell, t.radius);
    this.zones = map.zones;
  }

  get width(): number {
    return this.nav.width;
  }

  get height(): number {
    return this.nav.height;
  }

  addActor(o: ActorOpts): Actor {
    const a: Actor = {
      id: o.id,
      name: o.name,
      look: o.look,
      x: o.x,
      y: o.y,
      facing: o.facing ?? 'down',
      speed: o.speed ?? tuning.walk.speed,
      path: [],
      moving: false,
      walkTime: 0,
      talkable: o.talkable ?? false,
      visible: true,
    };
    this.actors.push(a);
    if (a.id === 'player') this.player = a;
    return a;
  }

  actor(id: string): Actor {
    const a = this.actors.find((x) => x.id === id);
    if (!a) throw new Error(`No actor ${id}`);
    return a;
  }

  // ---------------------------------------------------------------------------
  // Commands (from the player's taps or from a level script)

  /** Walk an actor to (x, y), finding a way around walls. Returns false if there is no way. */
  walkTo(id: string, x: number, y: number): boolean {
    const a = this.actor(id);
    a.patrol = undefined;
    a.path = this.nav.findPath(a, { x, y });
    if (a.id === 'player') this.talkTarget = null;
    return a.path.length > 0;
  }

  /** Walk an actor through several points in order, pathfinding between each. */
  walkPath(id: string, points: Point[]): boolean {
    const a = this.actor(id);
    a.patrol = undefined;
    const path: Point[] = [];
    let from: Point = a;
    for (const p of points) {
      const leg = this.nav.findPath(from, p);
      if (leg.length === 0) return false;
      path.push(...leg);
      from = leg[leg.length - 1];
    }
    a.path = path;
    return true;
  }

  /** Walk round these points forever while nothing else is ordered. */
  setPatrol(id: string, points: Point[]): void {
    const a = this.actor(id);
    a.patrol = points;
    a.patrolIdx = 0;
    a.path = [];
  }

  /** Put an actor somewhere at once (scene cuts, checkpoints). */
  place(id: string, x: number, y: number, facing?: Facing): void {
    const a = this.actor(id);
    a.x = x;
    a.y = y;
    a.path = [];
    if (facing) a.facing = facing;
  }

  stop(id: string): void {
    const a = this.actor(id);
    a.path = [];
    a.patrol = undefined;
  }

  /** True while the actor has somewhere left to walk. */
  isWalking(id: string): boolean {
    return this.actor(id).path.length > 0;
  }

  /** Turn an actor to look at a point. */
  face(id: string, x: number, y: number): void {
    const a = this.actor(id);
    a.facing = facingFor(x - a.x, y - a.y, a.facing);
  }

  /**
   * The player tapped the map at (x, y). Tapping a talkable character walks
   * over and talks to them; tapping anywhere else walks there.
   */
  tap(x: number, y: number): void {
    if (this.locked) return;
    const who = this.actorAt(x, y);
    if (who) {
      this.approach(who.id);
      return;
    }
    this.walkTo('player', x, y);
  }

  /** Walk the player up to a character and talk once there (talks at once if already close). */
  approach(id: string): void {
    const p = this.player;
    const a = this.actor(id);
    const d = Math.hypot(a.x - p.x, a.y - p.y);
    if (d <= tuning.walk.talkRange) {
      this.stop('player');
      this.startTalk(id);
      return;
    }
    // Stand just short of them, on the side the player is coming from.
    const k = (tuning.walk.talkRange * 0.6) / d;
    p.path = this.nav.findPath(p, { x: a.x + (p.x - a.x) * k, y: a.y + (p.y - a.y) * k });
    this.talkTarget = id;
  }

  /** The talk button (desktop: Space/E): talk to the nearest character in range. */
  interact(): boolean {
    if (this.locked) return false;
    const n = this.nearestTalkable();
    if (!n) return false;
    this.stop('player');
    this.startTalk(n.id);
    return true;
  }

  /** The closest talkable character within talking range of the player, if any. */
  nearestTalkable(): Actor | null {
    const p = this.player;
    let best: Actor | null = null;
    let bestD = tuning.walk.talkRange;
    for (const a of this.actors) {
      if (a === p || !a.talkable || !a.visible) continue;
      const d = Math.hypot(a.x - p.x, a.y - p.y);
      if (d <= bestD) {
        best = a;
        bestD = d;
      }
    }
    return best;
  }

  /** The talkable character under a tap, with a finger-sized margin. */
  actorAt(x: number, y: number): Actor | null {
    let best: Actor | null = null;
    let bestD = tuning.walk.tapRadius;
    for (const a of this.actors) {
      if (a.id === 'player' || !a.talkable || !a.visible) continue;
      // The sprite stands above its feet, so measure to the middle of the body.
      const d = Math.hypot(a.x - x, a.y - 10 - y);
      if (d <= bestD) {
        best = a;
        bestD = d;
      }
    }
    return best;
  }

  /** True if the player is inside zone `id`. */
  playerIn(zoneId: string): boolean {
    const z = this.zones.find((zz) => zz.id === zoneId);
    if (!z) throw new Error(`No zone ${zoneId}`);
    const p = this.player;
    return p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h;
  }

  // ---------------------------------------------------------------------------
  // Simulation

  step(dt: number): void {
    this.time += dt;
    for (const a of this.actors) {
      const was = { x: a.x, y: a.y };
      const steered = a === this.player && !this.locked && (this.input.dx !== 0 || this.input.dy !== 0);
      if (steered) {
        // Keys/stick win over a tapped path.
        a.path = [];
        this.talkTarget = null;
        this.steer(a, dt);
      } else if (a === this.player && this.locked) {
        // Dialogue or cutscene: the player waits, but scripts may still walk them.
        if (a.path.length > 0) this.follow(a, dt);
      } else {
        // Rounds pause while a conversation or cutscene holds the scene.
        if (a.path.length === 0 && a.patrol && a.patrol.length > 0 && !this.locked) this.nextPatrolLeg(a);
        if (a.path.length > 0) this.follow(a, dt);
      }
      const dx = a.x - was.x;
      const dy = a.y - was.y;
      a.moving = Math.abs(dx) + Math.abs(dy) > 1e-6;
      if (a.moving) {
        a.walkTime += dt;
        // Steering faces where the player pushes, even while sliding along a wall.
        a.facing = steered ? facingFor(this.input.dx, this.input.dy, a.facing) : facingFor(dx, dy, a.facing);
      } else {
        a.walkTime = 0;
      }
    }
    this.checkTalkArrival();
    this.checkZones();
  }

  drainEvents(): WalkEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  /** Move along the path; an actor that reaches the last point fires 'arrived'. */
  private follow(a: Actor, dt: number): void {
    let budget = a.speed * dt;
    while (budget > 0 && a.path.length > 0) {
      const t = a.path[0];
      const d = Math.hypot(t.x - a.x, t.y - a.y);
      if (d <= budget) {
        a.x = t.x;
        a.y = t.y;
        budget -= d;
        a.path.shift();
        if (a.path.length === 0 && !a.patrol) this.events.push({ type: 'arrived', id: a.id });
      } else {
        a.x += ((t.x - a.x) / d) * budget;
        a.y += ((t.y - a.y) / d) * budget;
        budget = 0;
      }
    }
  }

  /** Move by the direct input, sliding along walls one axis at a time. */
  private steer(a: Actor, dt: number): void {
    let { dx, dy } = this.input;
    const len = Math.hypot(dx, dy);
    if (len > 1) {
      dx /= len;
      dy /= len;
    }
    const nx = a.x + dx * a.speed * dt;
    if (this.nav.free(nx, a.y)) a.x = nx;
    const ny = a.y + dy * a.speed * dt;
    if (this.nav.free(a.x, ny)) a.y = ny;
  }

  private nextPatrolLeg(a: Actor): void {
    const pts = a.patrol!;
    const i = (a.patrolIdx ?? 0) % pts.length;
    a.patrolIdx = i + 1;
    a.path = this.nav.findPath(a, pts[i]);
  }

  private checkTalkArrival(): void {
    if (!this.talkTarget || this.locked) return;
    const p = this.player;
    const a = this.actor(this.talkTarget);
    const d = Math.hypot(a.x - p.x, a.y - p.y);
    if (d <= tuning.walk.talkRange) {
      this.stop('player');
      this.startTalk(a.id);
    } else if (p.path.length === 0) {
      // Got as close as the walls allow, or the target walked off: try again.
      this.approach(a.id);
      if (p.path.length === 0) this.talkTarget = null;
    }
  }

  /** Face each other and report the talk; the level decides what is said. */
  private startTalk(id: string): void {
    this.talkTarget = null;
    const p = this.player;
    const a = this.actor(id);
    this.face('player', a.x, a.y);
    // They stop to talk. A patrolling NPC carries on once the scene unlocks.
    a.path = [];
    this.face(id, p.x, p.y);
    this.events.push({ type: 'talk', target: id });
  }

  private checkZones(): void {
    const p = this.player;
    for (const z of this.zones) {
      const inNow = p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h;
      if (inNow && !this.inside.has(z.id)) {
        this.inside.add(z.id);
        this.events.push({ type: 'enteredZone', id: p.id, zone: z.id });
      } else if (!inNow) {
        this.inside.delete(z.id);
      }
    }
  }
}

/** The facing for a movement or look direction; keeps `prev` for a zero vector. */
export function facingFor(dx: number, dy: number, prev: Facing): Facing {
  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return prev;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

