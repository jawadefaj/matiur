// "Bot pilot" playthroughs: a simple autopilot flies each sortie headlessly.
// Proves each sortie can be finished and catches tuning that makes it impossible.
import { describe, expect, it } from 'vitest';
import { tuning } from '../src/data/tuning';
import { World } from '../src/sim/World';
import { DEG, angleDiff, clamp, dist, headingTo } from '../src/systems/math';
import { throttleForSpeed, velocity } from '../src/systems/flight/FlightModel';
import { leadSolution } from '../src/systems/combat/Guns';
import { isThreatening } from '../src/systems/ai/AI';
import { makeSortie } from '../src/sortie';
import type { Sortie } from '../src/sortie/Sortie';
import { Sortie3LowAndHome } from '../src/sortie/Sortie3LowAndHome';
import { corridorX, LOW_AIRFIELD } from '../src/sortie/terrain';

const DT = 1 / 60;

function run(n: 1 | 2 | 3, bot: (w: World, s: Sortie) => void, maxSeconds: number) {
  const w = new World(1000 + n);
  const s = makeSortie(n);
  s.setup(w);
  let t = 0;
  while (s.status === 'running' && t < maxSeconds) {
    bot(w, s);
    if (!s.freezeWorld) w.step(DT);
    s.update(w, DT);
    w.drainEvents();
    t += DT;
  }
  return { w, s, t };
}

describe('sortie playthroughs', () => {
  it('sortie 1 (Scramble) can be completed', () => {
    const { s, t } = run(1, (w, s) => {
      const p = w.player.f;
      const c = w.controls;
      if (!p.airborne) {
        c.throttle = 1;
        return;
      }
      const m = s.markers[0];
      if (!m) return;
      if (m.kind === 'slot') {
        const two = w.aircraft.find((a) => a.role === 'wingman')!;
        const v = velocity(two.f);
        const d = dist(p.x, p.y, m.x, m.y);
        c.desiredHeading = d < 12 ? two.f.heading : headingTo(p.x, p.y, m.x + v.vx * 0.6, m.y + v.vy * 0.6);
        const h = two.f.heading;
        const along = (m.x - p.x) * Math.sin(h) - (m.y - p.y) * Math.cos(h);
        c.throttle = throttleForSpeed(w.player.spec, two.f.speed + clamp(along * 1.2, -80, 200));
      } else {
        c.desiredHeading = headingTo(p.x, p.y, m.x, m.y);
        c.throttle = 0.7;
      }
    }, 400);
    expect(s.failReason).toBe('');
    expect(s.status).toBe('complete');
    expect(s.objectives.every((o) => o.state === 'done')).toBe(true);
    expect(t).toBeLessThan(300);
  });

  it('sortie 2 (Intercept) can be completed by chasing bandits', () => {
    const { w, s, t } = run(2, (w, s) => {
      void s;
      const p = w.player.f;
      const c = w.controls;
      const enemies = w.activeEnemies();
      const bombers = enemies.filter((e) => e.role === 'bomber');
      const pool = bombers.length > 0 ? bombers : enemies;
      let best = pool[0];
      for (const e of pool) if (dist(p.x, p.y, e.f.x, e.f.y) < dist(p.x, p.y, best.f.x, best.f.y)) best = e;
      if (!best) {
        c.desiredHeading = headingTo(p.x, p.y, 0, 0);
        c.pull = false;
        c.throttle = 0.6;
        return;
      }
      const six = enemies.find((e) => isThreatening(e, w.player, 240, 25));
      if (six) {
        const rel = angleDiff(p.heading, headingTo(p.x, p.y, six.f.x, six.f.y));
        c.desiredHeading = p.heading + Math.sign(rel) * 100 * DEG;
        c.pull = p.speed < 470;
        c.throttle = 0.8;
        return;
      }
      const sol = leadSolution(p, best.f, tuning.guns.player.bulletSpeed);
      const aim = headingTo(p.x, p.y, sol.lx, sol.ly);
      c.desiredHeading = aim;
      c.pull = Math.abs(angleDiff(p.heading, aim)) > 40 * DEG && p.speed < 470;
      c.throttle = dist(p.x, p.y, best.f.x, best.f.y) > 400 ? 0.9 : 0.6;
    }, 600);
    expect(s.failReason).toBe('');
    expect(s.status).toBe('complete');
    expect(t).toBeLessThan(420);
    // Report for tuning.
    console.log(
      `sortie 2: ${t.toFixed(0)}s, airframe ${w.damage.pips}/3, fuel ${w.fuel.pct.toFixed(0)}%,`,
      s.objectives.map((o) => `${o.id}=${o.state}`).join(' '),
    );
  });

  it('sortie 3 (Low and Home) can be flown under the radar and landed', () => {
    const { w, s, t } = run(3, (w, s) => {
      const s3 = s as Sortie3LowAndHome;
      const p = w.player.f;
      const c = w.controls;
      const landing = s.markers.some((m) => m.kind === 'runway');
      if (!p.airborne) return;
      // Steer along the route (or onto the runway centre line).
      const aheadY = p.y - 260;
      const tx = landing ? LOW_AIRFIELD.x : corridorX(aheadY);
      c.desiredHeading = headingTo(p.x, p.y, tx, aheadY);
      // Hold altitude above whatever is ahead.
      let need = 55;
      for (let k = 1; k <= 12; k++) {
        const y = p.y - k * 12;
        const x = p.x + (tx - p.x) * (k / 12) * 0.3;
        need = Math.max(need, s3.ll.heightAt(x, y, 8) + 14);
      }
      const toThreshold = p.y - (LOW_AIRFIELD.y + LOW_AIRFIELD.length / 2);
      if (landing && toThreshold < 150) need = 0;
      c.pull = p.altitude < need;
      c.throttle = landing ? 0 : 0.42;
    }, 600);
    expect(s.failReason).toBe('');
    expect(s.status).toBe('complete');
    console.log(`sortie 3: ${t.toFixed(0)}s, restarts ${s.restarts}, fuel ${w.fuel.pct.toFixed(0)}%`);
    expect(s.restarts).toBeLessThanOrEqual(1);
  });
});
