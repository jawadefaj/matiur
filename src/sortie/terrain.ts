// Seeded terrain for Episode 2. Placeholder layout, built for gameplay.
import { mulberry32 } from '../systems/math';
import type { Obstacle } from '../systems/flight/LowLevel';
import { emptyTerrain, type Airfield, type Line, type Point, type TerrainSpec } from './Sortie';

/** Home airfield for sorties 1 and 2, centred on the world origin. */
export const PESHAWAR: Airfield = { name: 'Peshawar', x: 0, y: 0, length: 420, width: 26 };

/**
 * A wandering line from `from` to `to` for rivers and roads: random sideways
 * drift that keeps easing back toward the straight line. `amp` and `width` in px.
 */
function wiggleLine(rng: () => number, from: Point, to: Point, steps: number, amp: number, width: number): Line {
  const points: Point[] = [];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  let off = 0;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (i > 0 && i < steps) off += (rng() - 0.5) * amp;
    off *= 0.85;
    points.push({ x: from.x + dx * t + nx * off, y: from.y + dy * t + ny * off });
  }
  return { points, width };
}

/** Peshawar valley farmland with the airfield at the origin (sorties 1–2). */
export function farmlandTerrain(seed: number): TerrainSpec {
  const rng = mulberry32(seed);
  const t = emptyTerrain();
  t.ground = 'farmland';
  t.airfields.push(PESHAWAR);
  t.rivers.push(wiggleLine(rng, { x: -4200, y: -1400 }, { x: 4200, y: 900 }, 40, 260, 14));
  t.rivers.push(wiggleLine(rng, { x: 1800, y: -4500 }, { x: 900, y: -900 }, 24, 200, 8));
  t.roads.push(wiggleLine(rng, { x: -60, y: 260 }, { x: -3800, y: 2600 }, 20, 120, 3));
  t.roads.push(wiggleLine(rng, { x: 60, y: -260 }, { x: 3200, y: -3600 }, 20, 120, 3));
  for (let i = 0; i < 40; i++) {
    const x = (rng() - 0.5) * 8000;
    const y = (rng() - 0.5) * 8000;
    // Keep villages off the airfield.
    if (Math.hypot(x, y) > 450) t.villages.push({ x, y });
  }
  for (let i = 0; i < 26; i++) {
    t.clouds.push({ x: (rng() - 0.5) * 7000, y: (rng() - 0.5) * 7000, variant: Math.floor(rng() * 3) });
  }
  return t;
}

// ---------------------------------------------------------------------------
// Sortie 3: the low-level route home. North (up the screen) toward Peshawar.

/**
 * Route layout in px. Distances are measured north from the start (y = 0), so
 * distance d is world y = -d; runwayY is a world y.
 * valleyEnd: the winding valley ends; the route is straight (x = 0) by blendEnd.
 * plainsEnd: the plains end and the landing approach begins.
 * checkpoints: distances where sortie 3 saves a restart point.
 * boundary: how far off the centre line before the "off the route" call; tall
 * hills line the plains just beyond it.
 */
export const LOW_ROUTE = {
  valleyEnd: 6800,
  blendEnd: 7600,
  plainsEnd: 12000,
  runwayY: -13400,
  checkpoints: [4400, 9200],
  boundary: 900,
};

/** Peshawar again, at the end of the low-level route. */
export const LOW_AIRFIELD: Airfield = { name: 'Peshawar', x: 0, y: LOW_ROUTE.runwayY, length: 420, width: 26 };

/** Centre-line x of the route at world y (route runs toward negative y). */
export function corridorX(y: number): number {
  const t = -y;
  // Two sine waves make the valley wind; the constant term puts the start at x = 0.
  const valley = 240 * Math.sin(t / 1500) + 110 * Math.sin(t / 620 + 1.3) - 110 * Math.sin(1.3);
  if (t <= LOW_ROUTE.valleyEnd) return valley;
  if (t >= LOW_ROUTE.blendEnd) return 0;
  // Between the two, fade the bends out linearly.
  const k = (t - LOW_ROUTE.valleyEnd) / (LOW_ROUTE.blendEnd - LOW_ROUTE.valleyEnd);
  return valley * (1 - k);
}

/** Half-width (px) of the valley floor, `t` px along the route. */
function halfWidth(t: number): number {
  return 125 + 30 * Math.sin(t / 900);
}

/** Hill radii in px. Each has a baked sprite (HILL_KEYS in src/gfx/textures.ts). */
const HILL_SIZES = [24, 32, 40, 48];

/** Sortie 3 map: a winding valley, open plains, then the airfield. Every obstacle is also LowLevel collision. */
export function lowLevelTerrain(seed: number): TerrainSpec {
  const rng = mulberry32(seed);
  const t = emptyTerrain();
  t.ground = 'plains';
  t.airfields.push(LOW_AIRFIELD);
  const obs: Obstacle[] = [];
  // A round obstacle is a capsule whose two ends are the same point.
  const circle = (kind: Obstacle['kind'], x: number, y: number, r: number, h: number) =>
    obs.push({ kind, x1: x, y1: y, x2: x, y2: y, r, h });

  // Valley walls: tall hills you cannot clear without showing on radar.
  for (let d = -400; d < LOW_ROUTE.valleyEnd + 300; d += 50 + rng() * 10) {
    const y = -d;
    const cx = corridorX(y);
    const hw = halfWidth(d);
    // One to three rows of hills on each side, stepping outward from the valley floor.
    for (const side of [-1, 1]) {
      let x = cx + side * hw;
      const rows = 1 + (rng() < 0.65 ? 1 : 0) + (rng() < 0.3 ? 1 : 0);
      for (let r = 0; r < rows; r++) {
        const R = HILL_SIZES[Math.floor(rng() * HILL_SIZES.length)];
        x += side * (r === 0 ? R * 0.8 + rng() * 14 : R * 1.5 + rng() * 20);
        circle('hill', x, y + (rng() - 0.5) * 20, R, 250 + Math.floor(rng() * 350));
      }
    }
  }

  // Valley floor: low ridges to hop and the odd stand of trees.
  for (let d = 900; d < LOW_ROUTE.valleyEnd - 200; d += 650 + rng() * 350) {
    const y = -d;
    const cx = corridorX(y);
    const hw = halfWidth(d);
    // Each ridge runs from one wall to past the centre line, leaving a gap on the far side.
    const fromLeft = rng() < 0.5;
    const x1 = fromLeft ? cx - hw - 10 : cx + hw + 10;
    const x2 = fromLeft ? cx + hw * (0.1 + rng() * 0.5) : cx - hw * (0.1 + rng() * 0.5);
    obs.push({ kind: 'ridge', x1, y1: y, x2, y2: y - 20 + rng() * 40, r: 9, h: 60 + Math.floor(rng() * 25) });
  }
  for (let d = 400; d < LOW_ROUTE.valleyEnd; d += 120) {
    if (rng() < 0.55) continue;
    const y = -d;
    const cx = corridorX(y);
    const hw = halfWidth(d);
    const n = 1 + Math.floor(rng() * 3);
    const bx = cx + (rng() - 0.5) * hw * 1.4;
    for (let i = 0; i < n; i++) circle('tree', bx + (rng() - 0.5) * 18, y + (rng() - 0.5) * 18, 5, 40 + Math.floor(rng() * 15));
  }

  // Plains: power lines, trees, villages and low dunes.
  const plainsFrom = LOW_ROUTE.valleyEnd + 300;
  const clearFrom = LOW_ROUTE.plainsEnd;
  for (let d = plainsFrom + 300; d < clearFrom; d += 900 + rng() * 300) {
    const y = -d;
    let prev: Point | null = null;
    for (let x = -840; x <= 840; x += 140) {
      const py = y + (rng() - 0.5) * 8;
      circle('pylon', x, py, 4, 95);
      if (prev) obs.push({ kind: 'wire', x1: prev.x, y1: prev.y, x2: x, y2: py, r: 2, h: 70 });
      prev = { x, y: py };
    }
  }
  for (let d = plainsFrom; d < clearFrom; d += 60) {
    if (rng() < 0.45) continue;
    const y = -d - rng() * 40;
    const x = (rng() - 0.5) * 1300;
    const n = 1 + Math.floor(rng() * 4);
    for (let i = 0; i < n; i++) circle('tree', x + (rng() - 0.5) * 24, y + (rng() - 0.5) * 24, 5, 40 + Math.floor(rng() * 15));
  }
  for (let d = plainsFrom + 500; d < clearFrom; d += 1100 + rng() * 600) {
    const vx = (rng() - 0.5) * 800;
    const vy = -d;
    t.villages.push({ x: vx, y: vy });
    for (let i = 0; i < 6; i++) circle('hut', vx + (rng() - 0.5) * 50, vy + (rng() - 0.5) * 40, 4, 28);
  }
  for (let d = plainsFrom + 200; d < clearFrom; d += 700 + rng() * 500) {
    const y = -d;
    const x = (rng() - 0.5) * 900;
    const len = 60 + rng() * 120;
    obs.push({ kind: 'ridge', x1: x - len / 2, y1: y, x2: x + len / 2, y2: y + (rng() - 0.5) * 30, r: 8, h: 50 + Math.floor(rng() * 30) });
  }
  // Tall hills mark the edges of the plains.
  for (let d = plainsFrom; d < -LOW_ROUTE.runwayY + 600; d += 70) {
    for (const side of [-1, 1]) {
      const R = HILL_SIZES[Math.floor(rng() * HILL_SIZES.length)];
      circle('hill', side * (LOW_ROUTE.boundary + 60 + rng() * 80), -d, R, 300 + Math.floor(rng() * 300));
    }
  }

  // Keep the start and the runway approach clear.
  t.obstacles = obs.filter((o) => {
    const my = (o.y1 + o.y2) / 2;
    const mx = (o.x1 + o.x2) / 2;
    if (my > -260 && Math.abs(mx - corridorX(0)) < 140 && o.kind !== 'hill') return false;
    if (my < -(LOW_ROUTE.plainsEnd - 200) && Math.abs(mx) < 360 && o.kind !== 'hill') return false;
    return true;
  });

  t.rivers.push(wiggleLine(rng, { x: -1400, y: -9900 }, { x: 1400, y: -10300 }, 30, 120, 12));
  t.roads.push(wiggleLine(rng, { x: -40, y: LOW_ROUTE.runwayY + 260 }, { x: -700, y: -8200 }, 20, 90, 3));
  for (let i = 0; i < 14; i++) {
    t.clouds.push({ x: (rng() - 0.5) * 2200, y: -rng() * 14000, variant: Math.floor(rng() * 3) });
  }
  return t;
}
