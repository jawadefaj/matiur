// Walk mechanic tests: pathfinding, movement, scripted walks, talking, zones,
// and a bot that plays the flight line level start to finish.
import { describe, expect, it } from 'vitest';
import { NavGrid } from '../src/walk/nav';
import { WalkWorld } from '../src/walk/WalkWorld';
import { WalkLevel, act, wait, walk } from '../src/walk/WalkLevel';
import type { WalkEvent, WalkMap } from '../src/walk/WalkWorld';
import { makeWalkLevel } from '../src/walk';
import { LADDER } from '../src/walk/FlightLine';

const DT = 1 / 60;

/** A 200×200 room split by a wall at x 95..105 with a gap at the bottom (y 170..200). */
const ROOM: WalkMap = {
  width: 200,
  height: 200,
  walls: [{ x: 95, y: 0, w: 10, h: 170 }],
  zones: [{ id: 'goal', x: 160, y: 20, w: 30, h: 30 }],
};

function stepFor(w: WalkWorld, seconds: number, each?: () => void): void {
  for (let t = 0; t < seconds; t += DT) {
    each?.();
    w.step(DT);
  }
}

describe('pathfinding', () => {
  it('goes straight when nothing is in the way', () => {
    const nav = new NavGrid(200, 200, [], 6, 4);
    expect(nav.findPath({ x: 20, y: 20 }, { x: 180, y: 150 })).toEqual([{ x: 180, y: 150 }]);
  });

  it('goes round a wall through the gap, never through it', () => {
    const nav = new NavGrid(200, 200, ROOM.walls, 6, 4);
    const path = nav.findPath({ x: 30, y: 30 }, { x: 170, y: 30 });
    expect(path.length).toBeGreaterThan(1);
    // Every leg is clear of the wall.
    let at = { x: 30, y: 30 };
    for (const p of path) {
      expect(nav.clearLine(at, p)).toBe(true);
      at = p;
    }
    expect(at).toEqual({ x: 170, y: 30 });
    // It must pass below the wall's end.
    expect(Math.max(...path.map((p) => p.y))).toBeGreaterThan(170);
  });

  it('a target inside a wall walks to the nearest free spot', () => {
    const nav = new NavGrid(200, 200, ROOM.walls, 6, 4);
    const path = nav.findPath({ x: 30, y: 30 }, { x: 100, y: 50 });
    const end = path[path.length - 1];
    expect(nav.free(end.x, end.y)).toBe(true);
    expect(Math.abs(end.y - 50)).toBeLessThan(8);
  });
});

describe('walk world', () => {
  it('tap to walk arrives, fires events, and faces the way it walked', () => {
    const w = new WalkWorld(ROOM);
    w.addActor({ id: 'player', name: 'P', look: 'walker_pilot', x: 30, y: 30 });
    w.tap(175, 35);
    const seen: WalkEvent[] = [];
    stepFor(w, 15, () => seen.push(...w.drainEvents()));
    seen.push(...w.drainEvents());
    expect(w.player.x).toBeCloseTo(175);
    expect(w.player.y).toBeCloseTo(35);
    expect(w.player.moving).toBe(false);
    expect(seen).toContainEqual({ type: 'enteredZone', id: 'player', zone: 'goal' });
    expect(seen).toContainEqual({ type: 'arrived', id: 'player' });
    expect(w.playerIn('goal')).toBe(true);
  });

  it('direct input slides along walls and never enters them', () => {
    const w = new WalkWorld(ROOM);
    w.addActor({ id: 'player', name: 'P', look: 'walker_pilot', x: 60, y: 60 });
    w.input = { dx: 1, dy: -0.3 };
    stepFor(w, 4);
    expect(w.nav.free(w.player.x, w.player.y)).toBe(true);
    expect(w.player.x).toBeLessThan(95);
    expect(w.player.facing).toBe('right');
  });

  it('tapping a character walks up to them and starts a talk', () => {
    const w = new WalkWorld(ROOM);
    w.addActor({ id: 'player', name: 'P', look: 'walker_pilot', x: 30, y: 30 });
    w.addActor({ id: 'npc', name: 'N', look: 'walker_crew', x: 170, y: 100, talkable: true });
    w.tap(170, 92);
    const seen: WalkEvent[] = [];
    stepFor(w, 15, () => seen.push(...w.drainEvents()));
    expect(seen).toContainEqual({ type: 'talk', target: 'npc' });
    const n = w.actor('npc');
    expect(Math.hypot(n.x - w.player.x, n.y - w.player.y)).toBeLessThanOrEqual(24);
  });

  it('a patrolling character keeps walking its rounds', () => {
    const w = new WalkWorld(ROOM);
    w.addActor({ id: 'player', name: 'P', look: 'walker_pilot', x: 30, y: 30 });
    w.addActor({ id: 'npc', name: 'N', look: 'walker_crew', x: 130, y: 30 });
    w.setPatrol('npc', [{ x: 180, y: 30 }, { x: 180, y: 150 }]);
    const ys: number[] = [];
    stepFor(w, 12, () => ys.push(w.actor('npc').y));
    expect(Math.max(...ys)).toBeGreaterThan(140);
    expect(Math.min(...ys.slice(-120))).toBeLessThan(140);
  });

  it('a locked player ignores taps', () => {
    const w = new WalkWorld(ROOM);
    w.addActor({ id: 'player', name: 'P', look: 'walker_pilot', x: 30, y: 30 });
    w.locked = true;
    w.tap(60, 60);
    stepFor(w, 1);
    expect(w.player.x).toBe(30);
  });
});

describe('sequences', () => {
  class Demo extends WalkLevel {
    readonly id = 'demo';
    readonly title = 'Demo';
    readonly place = 'Here';
    readonly date = 'Now';
    log: string[] = [];
    map(): WalkMap {
      return ROOM;
    }
    setup(w: WalkWorld): void {
      w.addActor({ id: 'player', name: 'P', look: 'walker_pilot', x: 30, y: 30 });
      w.addActor({ id: 'npc', name: 'N', look: 'walker_crew', x: 40, y: 40 });
      this.run(
        [
          walk('npc', { x: 170, y: 40 }),
          act(() => this.log.push('arrived')),
          this.talk({ speaker: 'N', text: 'Hello' }),
          wait(0.5),
          act(() => this.log.push('done')),
        ],
        true,
      );
    }
    protected onEvent(): void {}
  }

  it('runs steps in order, waits for walks and dialogue, and locks the player', () => {
    const lvl = new Demo();
    const w = new WalkWorld(lvl.map());
    lvl.setup(w);
    for (let t = 0; t < 20; t += DT) {
      w.step(DT);
      lvl.update(w, DT);
    }
    expect(w.actor('npc').x).toBeCloseTo(170);
    expect(lvl.log).toEqual(['arrived']);
    expect(lvl.dialogue[0].text).toBe('Hello');
    expect(w.locked).toBe(true);
    lvl.advance();
    for (let t = 0; t < 1; t += DT) {
      w.step(DT);
      lvl.update(w, DT);
    }
    expect(lvl.log).toEqual(['arrived', 'done']);
    expect(lvl.busy).toBe(false);
    expect(w.locked).toBe(false);
  });
});

describe('flight line playthrough', () => {
  it('a bot can walk, talk and reach the jet', () => {
    const lvl = makeWalkLevel('flightline');
    const w = new WalkWorld(lvl.map());
    lvl.setup(w);
    // Every character starts on free ground.
    for (const a of w.actors) expect(w.nav.free(a.x, a.y)).toBe(true);
    let t = 0;
    let lastOrder = -1;
    while (lvl.status === 'running' && t < 120) {
      // Read dialogue at a human pace.
      if (lvl.dialogue.length > 0 && t - lastOrder > 0.5) {
        lvl.advance();
        lastOrder = t;
      } else if (!w.locked && !w.player.path.length && t - lastOrder > 0.5) {
        const active = lvl.objectives.find((o) => o.state === 'active')?.id;
        if (active === 'brief') w.approach('two');
        else if (active === 'chief') w.approach('chief');
        else if (active === 'jet') w.tap(LADDER.x + LADDER.w / 2, LADDER.y + LADDER.h / 2);
        lastOrder = t;
      }
      w.step(DT);
      lvl.update(w, DT);
      t += DT;
    }
    expect(lvl.status).toBe('complete');
    expect(lvl.objectives.every((o) => o.state === 'done')).toBe(true);
    expect(t).toBeLessThan(90);
  });
});
