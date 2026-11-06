// Angle convention used everywhere: heading 0 = north (up the screen),
// increasing clockwise, in radians. Screen/world y grows downward.

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export function wrapAngle(a: number): number {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
}

export function wrapPositive(a: number): number {
  a %= TAU;
  return a < 0 ? a + TAU : a;
}

/** Signed shortest turn from `from` to `to`, in (-PI, PI]. */
export function angleDiff(from: number, to: number): number {
  return wrapAngle(to - from);
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Move `current` toward `target` by at most `maxDelta`. */
export function approach(current: number, target: number, maxDelta: number): number {
  if (current < target) return Math.min(target, current + maxDelta);
  return Math.max(target, current - maxDelta);
}

export function headingTo(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(x2 - x1, -(y2 - y1));
}

export function dirX(h: number): number {
  return Math.sin(h);
}

export function dirY(h: number): number {
  return -Math.cos(h);
}

export function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

/** Index of the pre-drawn rotation frame (16 directions) for a heading. */
export function frameForHeading(h: number, frames = 16): number {
  return Math.round(wrapPositive(h) / (TAU / frames)) % frames;
}

/** Clock position (1–12) of a relative bearing, where 12 is dead ahead. */
export function clockPosition(relBearing: number): number {
  const c = Math.round(wrapPositive(relBearing) / (TAU / 12)) % 12;
  return c === 0 ? 12 : c;
}

/** Rotate a local offset (right = +x, back = +y when facing north) by heading h. */
export function rotateOffset(ox: number, oy: number, h: number): { x: number; y: number } {
  const c = Math.cos(h);
  const s = Math.sin(h);
  return { x: ox * c - oy * s, y: ox * s + oy * c };
}

/** Small seeded PRNG so terrain and AI behave the same on every run. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Distance from point (px,py) to segment (x1,y1)-(x2,y2). */
export function pointSegmentDist(
  px: number, py: number, x1: number, y1: number, x2: number, y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/** True if a moving point (segment) passes within r of a circle centre. */
export function segmentCircleHit(
  x1: number, y1: number, x2: number, y2: number, cx: number, cy: number, r: number,
): boolean {
  return pointSegmentDist(cx, cy, x1, y1, x2, y2) <= r;
}
