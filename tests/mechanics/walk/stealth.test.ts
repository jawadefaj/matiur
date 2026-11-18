// Stealth (Level 2): vision cones, line of sight, detection, and the three
// Masroor levels' win and lose conditions.
import { describe, expect, it } from 'vitest';
import { WalkWorld, type WalkMap } from '../../../src/mechanics/walk/WalkWorld';
import { Stealth, angleDiff } from '../../../src/mechanics/walk/stealth';
import { tuning } from '../../../src/mechanics/walk/tuning';
import { makeWalkLevel } from '../../../src/mechanics/walk/levels';
import { INTERCEPT, MasroorIntercept, OFFICE, RAMP_START } from '../../../src/mechanics/walk/levels/Masroor';

const DT = 1 / 60;

/** 400×400 with a wall block at x 190..210, y 180..220. */
const OPEN: WalkMap = { width: 400, height: 400, walls: [{ x: 190, y: 180, w: 20, h: 40 }], zones: [] };

function world(px: number, py: number): WalkWorld {
  const w = new WalkWorld(OPEN);
  w.addActor({ id: 'player', name: 'P', look: 'x', x: px, y: py });
  return w;
}

describe('vision cones', () => {
  it('sees inside the cone and in range only', () => {
    const w = world(150, 100);
    const st = new Stealth();
    // Facing east (0°), 70° wide, 90 px.
    const g = st.add(w, { id: 'g', name: 'G', look: 'x', x: 100, y: 100, facing: 0 });
    expect(st.sees(w, g, 150, 100)).toBe(true);
    expect(st.sees(w, g, 150, 125)).toBe(true); // 26.6° off: inside ±35°
    expect(st.sees(w, g, 130, 150)).toBe(false); // 59° off
    expect(st.sees(w, g, 50, 100)).toBe(false); // behind him
    expect(st.sees(w, g, 100 + tuning.stealth.range + 5, 100)).toBe(false); // out of range
  });

  it('is blocked by walls', () => {
    const w = world(260, 200);
    const st = new Stealth();
    const g = st.add(w, { id: 'g', name: 'G', look: 'x', x: 150, y: 200, facing: 0, vision: { range: 200 } });
    expect(st.sees(w, g, 260, 200)).toBe(false);
    expect(st.sees(w, g, 180, 200)).toBe(true); // in front of the wall
  });

  it('is shorter at night', () => {
    const st = new Stealth(tuning.stealth.nightRange);
    const g = st.add(world(0, 0), { id: 'g', name: 'G', look: 'x', x: 100, y: 100 });
    expect(g.range).toBeCloseTo(tuning.stealth.range * tuning.stealth.nightRange);
  });

  it('turns the cone to where a patrolling guard walks', () => {
    const w = world(390, 390);
    const st = new Stealth();
    const g = st.add(w, { id: 'g', name: 'G', look: 'x', x: 50, y: 50, facing: 0, patrol: [{ x: 50, y: 50 }, { x: 50, y: 150 }] });
    for (let t = 0; t < 1.5; t += DT) {
      w.step(DT);
      st.step(w, DT);
    }
    expect(Math.abs(angleDiff(g.look, Math.PI / 2))).toBeLessThan(0.05); // looking south
  });
});

describe('detection', () => {
  it('fills while seen, catches when full, and drains when out of sight', () => {
    const w = world(160, 100);
    const st = new Stealth();
    const g = st.add(w, { id: 'g', name: 'G', look: 'x', x: 100, y: 100, facing: 0 });
    let caught = null;
    let t = 0;
    for (; t < 3 && !caught; t += DT) caught = st.step(w, DT);
    expect(caught?.id).toBe('g');
    expect(t).toBeLessThan(1); // well under a second at this range
    w.place('player', 30, 300);
    for (let k = 0; k < 60; k++) st.step(w, DT);
    expect(g.detection).toBeLessThan(1);
    expect(g.detection).toBeCloseTo(1 - tuning.stealth.drain, 1);
  });

  it('ignores the player while the scene is locked (dialogue)', () => {
    const w = world(150, 100);
    const st = new Stealth();
    const g = st.add(w, { id: 'g', name: 'G', look: 'x', x: 100, y: 100, facing: 0 });
    w.locked = true;
    for (let k = 0; k < 120; k++) st.step(w, DT);
    expect(g.detection).toBe(0);
  });
});

describe('Masroor levels', () => {
  function start(id: 'masroor-schedule' | 'masroor-hospital' | 'masroor-intercept') {
    const level = makeWalkLevel(id);
    const w = new WalkWorld(level.map());
    level.setup(w);
    const run = (seconds: number, each?: () => void) => {
      for (let t = 0; t < seconds && level.status === 'running'; t += DT) {
        each?.();
        w.step(DT);
        level.update(w, DT);
        while (level.dialogue.length) level.advance();
      }
    };
    return { level, w, run };
  }

  it('builds each level with guards and a player', () => {
    for (const id of ['masroor-schedule', 'masroor-hospital', 'masroor-intercept'] as const) {
      const { level, w } = start(id);
      expect(level.stealth?.guards.length).toBeGreaterThan(0);
      expect(w.player).toBeDefined();
    }
  });

  it('The Schedule ends when Matiur reaches the office', () => {
    const { level, w, run } = start('masroor-schedule');
    // Teleport past the guards: this checks the goal, not the stealth.
    w.place('player', OFFICE.x, OFFICE.y);
    run(2);
    expect(level.status).toBe('complete');
  });

  it('Intercept fails if Bluebird reaches the mark without a signal', () => {
    const { level, w, run } = start('masroor-intercept');
    w.place('player', 10, 1800); // safely out of every cone
    run(60);
    expect(level.status).toBe('failed');
    expect(level.failText).toMatch(/lining up/);
  });

  it('Intercept succeeds when Matiur waits at the mark and signals', () => {
    const { level, w, run } = start('masroor-intercept');
    const lvl = level as MasroorIntercept;
    // About 1,150 m of taxiway.
    expect(lvl.routeLength * 1.41).toBeGreaterThan(1050);
    expect(lvl.routeLength * 1.41).toBeLessThan(1250);
    // Stand out of sight until Bluebird is close, then step onto the mark.
    w.place('player', 10, 1800);
    run(60, () => {
      if (lvl.routeLength - lvl.travelled < 100) w.place('player', INTERCEPT.x, INTERCEPT.y);
      if (lvl.actionLabel(w) === 'SIGNAL') lvl.action(w);
    });
    expect(level.status).toBe('complete');
  });

  it('starts Intercept on East Ramp with Bluebird parked', () => {
    const { level, w } = start('masroor-intercept');
    expect(w.player.x).toBe(RAMP_START.x);
    expect((level as MasroorIntercept).travelled).toBe(0);
  });
});
