import { describe, expect, it } from 'vitest';
import { tuning } from '../src/data/tuning';
import { DEG, angleDiff, clockPosition, frameForHeading, headingTo } from '../src/systems/math';
import {
  NO_MODS,
  gForTurn,
  makeFlightState,
  maxRateForG,
  stepFlight,
  throttleForSpeed,
} from '../src/systems/flight/FlightModel';
import { GMeter } from '../src/systems/flight/GMeter';
import { Fuel } from '../src/systems/flight/Fuel';
import { Damage } from '../src/systems/flight/Damage';
import { LowLevel } from '../src/systems/flight/LowLevel';
import { inCone, leadSolution } from '../src/systems/combat/Guns';
import { World } from '../src/sim/World';

const sabre = tuning.aircraft.sabre;

function fly(seconds: number, fn: (t: number) => void, dt = 1 / 60): void {
  for (let t = 0; t < seconds; t += dt) fn(t);
}

describe('math', () => {
  it('uses north-up, clockwise headings', () => {
    expect(headingTo(0, 0, 0, -10)).toBeCloseTo(0);
    expect(headingTo(0, 0, 10, 0)).toBeCloseTo(Math.PI / 2);
    expect(angleDiff(350 * DEG, 10 * DEG)).toBeCloseTo(20 * DEG);
    expect(frameForHeading(0)).toBe(0);
    expect(frameForHeading(Math.PI / 2)).toBe(4);
    expect(frameForHeading(-1 * DEG)).toBe(0);
    expect(clockPosition(0)).toBe(12);
    expect(clockPosition(Math.PI / 2)).toBe(3);
  });
});

describe('flight model', () => {
  it('G and turn-rate limits are inverses', () => {
    const r = maxRateForG(5, 450);
    expect(gForTurn(r, 450)).toBeCloseTo(5, 5);
  });

  it('settles on the throttle speed', () => {
    const s = makeFlightState({ speed: 300 });
    fly(20, () => stepFlight(s, sabre, { desiredHeading: null, pull: false, throttle: throttleForSpeed(sabre, 450) }, NO_MODS, 1 / 60));
    expect(s.speed).toBeCloseTo(450, 0);
  });

  it('turns toward the stick direction and stops there', () => {
    const s = makeFlightState({ speed: 450, heading: 0 });
    fly(4, () => stepFlight(s, sabre, { desiredHeading: Math.PI / 2, pull: false, throttle: 0.66 }, NO_MODS, 1 / 60));
    expect(Math.abs(angleDiff(s.heading, Math.PI / 2))).toBeLessThan(2 * DEG);
  });

  it('PULL turns tighter and pulls more G than a normal turn', () => {
    const a = makeFlightState({ speed: 400 });
    const b = makeFlightState({ speed: 400 });
    let maxA = 0;
    let maxB = 0;
    fly(0.8, () => {
      stepFlight(a, sabre, { desiredHeading: Math.PI, pull: false, throttle: 0.6 }, NO_MODS, 1 / 60);
      stepFlight(b, sabre, { desiredHeading: Math.PI, pull: true, throttle: 0.6 }, NO_MODS, 1 / 60);
      maxA = Math.max(maxA, a.g);
      maxB = Math.max(maxB, b.g);
    });
    expect(Math.abs(b.heading)).toBeGreaterThan(Math.abs(a.heading));
    expect(maxA).toBeLessThanOrEqual(sabre.normalG + 0.01);
    expect(maxB).toBeGreaterThan(sabre.normalG + 1);
  });

  it('hard turns bleed speed', () => {
    const s = makeFlightState({ speed: 500, throttle: 0.77 });
    fly(3, () => stepFlight(s, sabre, { desiredHeading: s.heading + Math.PI / 2, pull: true, throttle: 0.77 }, NO_MODS, 1 / 60));
    expect(s.speed).toBeLessThan(480);
  });

  it('low level: PULL climbs, releasing sinks', () => {
    const s = makeFlightState({ speed: 380, altitude: 60 });
    const mods = { ...NO_MODS, lowLevel: true };
    fly(1.5, () => stepFlight(s, sabre, { desiredHeading: null, pull: true, throttle: 0.5 }, mods, 1 / 60));
    expect(s.altitude).toBeGreaterThan(100);
    const top = s.altitude;
    fly(2, () => stepFlight(s, sabre, { desiredHeading: null, pull: false, throttle: 0.5 }, mods, 1 / 60));
    expect(s.altitude).toBeLessThan(top - 20);
  });
});

describe('G-meter', () => {
  it('greys out only after 2 s above 5.5 G, then recovers', () => {
    const m = new GMeter();
    fly(1.9, () => m.update(6, 1 / 60));
    expect(m.greyout).toBe(false);
    fly(0.4, () => m.update(6, 1 / 60));
    expect(m.greyout).toBe(true);
    expect(m.controlMul).toBe(tuning.gmeter.greyoutControl);
    fly(2, () => m.update(2, 1 / 60));
    expect(m.greyout).toBe(false);
    expect(m.blackout).toBe(false);
  });

  it('blacks out after more than 1 s at 7 G', () => {
    const m = new GMeter();
    fly(0.9, () => m.update(7.5, 1 / 60));
    expect(m.blackout).toBe(false);
    fly(0.5, () => m.update(7.5, 1 / 60));
    expect(m.blackout).toBe(true);
  });
});

describe('fuel and damage', () => {
  it('burns more per second at high throttle, and leaks when damaged', () => {
    expect(Fuel.burnRate(1)).toBeGreaterThan(Fuel.burnRate(0.5));
    expect(Fuel.burnRate(0.5, 1.3)).toBeGreaterThan(Fuel.burnRate(0.5));
    const f = new Fuel(10);
    fly(200, () => f.update(1, 1, 1 / 10), 1 / 10);
    expect(f.empty).toBe(true);
  });

  it('loses a pip every few hits and gets worse', () => {
    const d = new Damage();
    for (let i = 0; i < tuning.damage.hitsPerPip - 1; i++) expect(d.hit()).toBe(false);
    expect(d.hit()).toBe(true);
    expect(d.pips).toBe(2);
    expect(d.handling).toBeLessThan(1);
    expect(d.leak).toBeGreaterThan(1);
    for (let i = 0; i < tuning.damage.hitsPerPip * 2; i++) d.hit();
    expect(d.destroyed).toBe(true);
  });
});

describe('guns', () => {
  it('leads a crossing target', () => {
    const shooter = makeFlightState({ x: 0, y: 0, heading: 0, speed: 400 });
    const target = makeFlightState({ x: 0, y: -150, heading: Math.PI / 2, speed: 400 });
    const sol = leadSolution(shooter, target, tuning.guns.player.bulletSpeed);
    expect(sol.lx).toBeGreaterThan(0);
    expect(inCone(shooter, sol, tuning.guns.player)).toBe(false);
    shooter.heading = headingTo(0, 0, sol.lx, sol.ly);
    expect(inCone(shooter, sol, tuning.guns.player)).toBe(true);
  });

  it('auto-fire hits a target dead ahead and it breaks off (no explosion)', () => {
    const w = new World(5);
    w.spawn({ kind: 'sabre', side: 'player', role: 'player', x: 0, y: 0, heading: 0, speed: 400 });
    const e = w.spawn({ kind: 'hunter', side: 'enemy', role: 'fighter', x: 0, y: -120, heading: 0, speed: 400, guns: null });
    w.controls.throttle = throttleForSpeed(sabre, 400);
    e.input.throttle = throttleForSpeed(e.spec, 400);
    fly(4, () => w.step(1 / 60));
    expect(e.status).toBe('brokenOff');
    expect(e.smoke).toBe(1);
    expect(w.events.some((ev) => ev.type === 'brokeOff')).toBe(true);
  });
});

describe('low level', () => {
  it('crashes into an obstacle taller than the jet, not a shorter one', () => {
    const ll = new LowLevel([{ kind: 'ridge', x1: -50, y1: -10, x2: 50, y2: -10, r: 8, h: 70 }]);
    const low = makeFlightState({ x: 0, y: -10, altitude: 60, speed: 300 });
    expect(ll.update(low, 1 / 60)).toBe('crash');
    const high = makeFlightState({ x: 0, y: -10, altitude: 80, speed: 300 });
    expect(ll.update(high, 1 / 60)).not.toBe('crash');
  });

  it('radar contact leads to interception unless the jet gets low', () => {
    const ll = new LowLevel([]);
    const f = makeFlightState({ altitude: 150, speed: 300 });
    let result = 'ok';
    fly(3, () => {
      const r = ll.update(f, 1 / 60);
      if (r !== 'ok') result = r;
    });
    expect(result).toBe('contact');
    fly(tuning.lowLevel.interceptTime + 0.5, () => {
      const r = ll.update(f, 1 / 60);
      if (r !== 'ok') result = r;
    });
    expect(result).toBe('intercepted');

    const ll2 = new LowLevel([]);
    const g = makeFlightState({ altitude: 150, speed: 300 });
    fly(3, () => ll2.update(g, 1 / 60));
    expect(ll2.contact).toBe(true);
    g.altitude = 60;
    let cleared = false;
    fly(5, () => {
      if (ll2.update(g, 1 / 60) === 'cleared') cleared = true;
    });
    expect(cleared).toBe(true);
  });
});
