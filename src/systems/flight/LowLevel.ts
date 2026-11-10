// Low-level flight: altitude band, radar and terrain collision.
// Used by Episode 2 sortie 3 and, later, Episode 4 Phase 3.
import { tuning } from '../../data/tuning';
import { pointSegmentDist } from '../math';
import { pxPerSec, type FlightState } from './FlightModel';

export type ObstacleKind = 'hill' | 'tree' | 'hut' | 'pylon' | 'wire' | 'ridge';

/** A capsule (segment with radius); a circle when both ends match. Height in ft. */
export interface Obstacle {
  kind: ObstacleKind;
  /** Segment end points, world px. */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Radius around the segment, px. */
  r: number;
  h: number;
}

/** Result of one update(). 'contact' and 'cleared' are reported once, on the step the radar state changes. */
export type LowLevelResult = 'ok' | 'crash' | 'contact' | 'cleared' | 'intercepted';
/** 'terrain': something ahead is taller than the jet will be. 'low': below lowLevel.bandLow. */
export type TerrainWarning = 'none' | 'low' | 'terrain';

export class LowLevel {
  /** 0..1 radar fill; full = radar contact. */
  radar = 0;
  /** True from radar contact until the radar drains to empty. */
  contact = false;
  /** Seconds until interceptors arrive while in contact. */
  interceptTimer = 0;
  warning: TerrainWarning = 'none';
  /** Sorted by top edge (smallest y) so near() can binary-search them. */
  readonly obstacles: Obstacle[];
  /** Top edge of each obstacle, in the same order as `obstacles`. */
  private minY: number[];
  /** Largest north-south extent of any obstacle, px. */
  private maxSpan = 0;

  constructor(obstacles: Obstacle[]) {
    this.obstacles = [...obstacles].sort((a, b) => lo(a) - lo(b));
    this.minY = this.obstacles.map(lo);
    for (const o of this.obstacles) this.maxSpan = Math.max(this.maxSpan, hi(o) - lo(o));
  }

  reset(): void {
    this.radar = 0;
    this.contact = false;
    this.interceptTimer = 0;
    this.warning = 'none';
  }

  /** Obstacles whose vertical extent overlaps [y0, y1]. */
  near(y0: number, y1: number): Obstacle[] {
    const out: Obstacle[] = [];
    // Any obstacle reaching y0 has its top edge at or after y0 - maxSpan, so the
    // scan starts there and stops at the first top edge beyond y1.
    const start = lowerBound(this.minY, y0 - this.maxSpan);
    for (let i = start; i < this.obstacles.length && this.minY[i] <= y1; i++) {
      const o = this.obstacles[i];
      if (hi(o) >= y0) out.push(o);
    }
    return out;
  }

  /** Highest obstacle under a point (0 if open ground). */
  heightAt(x: number, y: number, pad = 0): number {
    let h = 0;
    // Only obstacles whose north-south extent reaches y ± 1 px are tested, so
    // `pad` adds reach east-west but not north-south.
    for (const o of this.near(y - 1, y + 1)) {
      if (pointSegmentDist(x, y, o.x1, o.y1, o.x2, o.y2) <= o.r + pad) h = Math.max(h, o.h);
    }
    return h;
  }

  /** Call once per step with the player's flight state. Checks for a crash, sets `warning` and runs the radar. */
  update(f: FlightState, dt: number): LowLevelResult {
    const ll = tuning.lowLevel;
    const pr = ll.playerRadius;

    // Collision with the ground or anything taller than we are.
    if (f.altitude <= 0) return 'crash';
    if (this.heightAt(f.x, f.y, pr) > f.altitude) return 'crash';

    // Warnings: obstacle ahead taller than us, or below the safe band.
    const ahead = pxPerSec(f.speed) * ll.warnLookAhead;
    const ax = f.x + Math.sin(f.heading) * ahead;
    const ay = f.y - Math.cos(f.heading) * ahead;
    let terrainAhead = false;
    // Sample four points over the next warnLookAhead seconds of flight, comparing
    // each with the altitude the jet will have there at its current vertical speed.
    for (let k = 1; k <= 4 && !terrainAhead; k++) {
      const t = k / 4;
      const px = f.x + (ax - f.x) * t;
      const py = f.y + (ay - f.y) * t;
      if (this.heightAt(px, py, pr + 2) > f.altitude + f.vz * ll.warnLookAhead * t) terrainAhead = true;
    }
    this.warning = terrainAhead ? 'terrain' : f.altitude < ll.bandLow ? 'low' : 'none';

    // Radar.
    if (f.altitude > ll.bandHigh) this.radar = Math.min(1, this.radar + ll.radarFill * dt);
    else this.radar = Math.max(0, this.radar - ll.radarDrain * dt);

    // A full radar starts the intercept clock; draining it to empty breaks contact.
    if (!this.contact && this.radar >= 1) {
      this.contact = true;
      this.interceptTimer = ll.interceptTime;
      return 'contact';
    }
    if (this.contact) {
      if (this.radar <= 0) {
        this.contact = false;
        return 'cleared';
      }
      this.interceptTimer -= dt;
      if (this.interceptTimer <= 0) return 'intercepted';
    }
    return 'ok';
  }
}

/** Top (northmost) edge of an obstacle, including its radius. */
function lo(o: Obstacle): number {
  return Math.min(o.y1, o.y2) - o.r;
}

/** Bottom (southmost) edge of an obstacle, including its radius. */
function hi(o: Obstacle): number {
  return Math.max(o.y1, o.y2) + o.r;
}

/** First index in the sorted `arr` whose value is >= v (binary search). */
function lowerBound(arr: number[], v: number): number {
  let a = 0;
  let b = arr.length;
  while (a < b) {
    const m = (a + b) >> 1;
    if (arr[m] < v) a = m + 1;
    else b = m;
  }
  return a;
}
