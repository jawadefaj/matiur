// Grid pathfinding for walking characters. The map is cut into square cells;
// a cell is blocked if a character standing at its centre would touch a wall.
// A* finds a cell path, then string-pulling turns it into a few straight legs.
// No Phaser here, so the tests can walk characters headlessly.

export interface Point {
  x: number;
  y: number;
}

/** An axis-aligned box in world px (top-left corner, width and height). */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** True if a circle at (cx, cy) with radius r overlaps the box. */
export function circleHitsRect(cx: number, cy: number, r: number, b: Rect): boolean {
  const nx = Math.max(b.x, Math.min(cx, b.x + b.w));
  const ny = Math.max(b.y, Math.min(cy, b.y + b.h));
  return (cx - nx) ** 2 + (cy - ny) ** 2 < r * r;
}

export class NavGrid {
  readonly cols: number;
  readonly rows: number;
  /** 1 = blocked. Index row * cols + col. */
  private blocked: Uint8Array;

  /**
   * @param width,height map size, px
   * @param walls boxes a character can't enter
   * @param cell cell size, px
   * @param radius character radius, px (walls are grown by this much)
   */
  constructor(
    readonly width: number,
    readonly height: number,
    readonly walls: Rect[],
    readonly cell: number,
    readonly radius: number,
  ) {
    this.cols = Math.ceil(width / cell);
    this.rows = Math.ceil(height / cell);
    this.blocked = new Uint8Array(this.cols * this.rows);
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const p = this.centre(c, r);
        this.blocked[r * this.cols + c] = this.free(p.x, p.y) ? 0 : 1;
      }
    }
  }

  /** True if a character can stand at (x, y): inside the map and clear of every wall. */
  free(x: number, y: number): boolean {
    const r = this.radius;
    if (x < r || y < r || x > this.width - r || y > this.height - r) return false;
    for (const b of this.walls) if (circleHitsRect(x, y, r, b)) return false;
    return true;
  }

  centre(c: number, r: number): Point {
    return { x: (c + 0.5) * this.cell, y: (r + 0.5) * this.cell };
  }

  cellOf(x: number, y: number): [number, number] {
    return [
      Math.max(0, Math.min(this.cols - 1, Math.floor(x / this.cell))),
      Math.max(0, Math.min(this.rows - 1, Math.floor(y / this.cell))),
    ];
  }

  isBlocked(c: number, r: number): boolean {
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return true;
    return this.blocked[r * this.cols + c] === 1;
  }

  /** True if a character can walk in a straight line from a to b without touching a wall. */
  clearLine(a: Point, b: Point): boolean {
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.ceil(d / (this.radius * 0.5)));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      if (!this.free(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false;
    }
    return true;
  }

  /** The free point nearest to (x, y): itself if free, else the closest free cell centre. */
  nearestFree(x: number, y: number): Point | null {
    if (this.free(x, y)) return { x, y };
    const [c0, r0] = this.cellOf(x, y);
    let best: Point | null = null;
    let bestD = Infinity;
    // Search rings of cells outward; stop once a ring can't beat the best found.
    const maxRing = Math.max(this.cols, this.rows);
    for (let ring = 0; ring <= maxRing; ring++) {
      if (best && (ring - 1) * this.cell > bestD) break;
      for (let r = r0 - ring; r <= r0 + ring; r++) {
        for (let c = c0 - ring; c <= c0 + ring; c++) {
          if (Math.max(Math.abs(c - c0), Math.abs(r - r0)) !== ring || this.isBlocked(c, r)) continue;
          const p = this.centre(c, r);
          const d = Math.hypot(p.x - x, p.y - y);
          if (d < bestD) {
            bestD = d;
            best = p;
          }
        }
      }
    }
    return best;
  }

  /**
   * Waypoints from `from` to `to`, not including `from`. An unreachable or
   * blocked target walks to the nearest free spot instead. Returns [] if
   * there is nowhere to go.
   */
  findPath(from: Point, to: Point): Point[] {
    const goal = this.nearestFree(to.x, to.y);
    if (!goal) return [];
    if (this.clearLine(from, goal)) return [goal];

    const [sc, sr] = this.cellOf(from.x, from.y);
    const [gc, gr] = this.cellOf(goal.x, goal.y);
    const cols = this.cols;
    const start = sr * cols + sc;
    const target = gr * cols + gc;
    const g = new Float64Array(cols * this.rows).fill(Infinity);
    const came = new Int32Array(cols * this.rows).fill(-1);
    const closed = new Uint8Array(cols * this.rows);
    // A small binary heap of [f, index].
    const heap: [number, number][] = [];
    const push = (f: number, i: number) => {
      heap.push([f, i]);
      let k = heap.length - 1;
      while (k > 0) {
        const p = (k - 1) >> 1;
        if (heap[p][0] <= heap[k][0]) break;
        [heap[p], heap[k]] = [heap[k], heap[p]];
        k = p;
      }
    };
    const pop = (): [number, number] => {
      const top = heap[0];
      const last = heap.pop()!;
      if (heap.length > 0) {
        heap[0] = last;
        let k = 0;
        for (;;) {
          const l = 2 * k + 1;
          const r = l + 1;
          let m = k;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === k) break;
          [heap[m], heap[k]] = [heap[k], heap[m]];
          k = m;
        }
      }
      return top;
    };
    // Octile distance: the exact cost on an empty 8-way grid.
    const h = (c: number, r: number) => {
      const dx = Math.abs(c - gc);
      const dy = Math.abs(r - gr);
      return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
    };

    g[start] = 0;
    push(h(sc, sr), start);
    let found = false;
    while (heap.length > 0) {
      const [, i] = pop();
      if (closed[i]) continue;
      closed[i] = 1;
      if (i === target) {
        found = true;
        break;
      }
      const c = i % cols;
      const r = (i - c) / cols;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dc === 0 && dr === 0) continue;
          const nc = c + dc;
          const nr = r + dr;
          // The start cell may be "blocked" if the character stands near a wall; let it leave.
          if (this.isBlocked(nc, nr)) continue;
          // No cutting corners past a wall.
          if (dc !== 0 && dr !== 0 && (this.isBlocked(c + dc, r) || this.isBlocked(c, r + dr))) continue;
          const ni = nr * cols + nc;
          if (closed[ni]) continue;
          const ng = g[i] + (dc !== 0 && dr !== 0 ? Math.SQRT2 : 1);
          if (ng < g[ni]) {
            g[ni] = ng;
            came[ni] = i;
            push(ng + h(nc, nr), ni);
          }
        }
      }
    }
    if (!found) return [];

    // Cell centres from start to goal, with the exact goal point at the end.
    const cells: Point[] = [];
    for (let i = target; i !== -1 && i !== start; i = came[i]) {
      cells.push(this.centre(i % cols, Math.floor(i / cols)));
    }
    cells.reverse();
    cells[cells.length - 1] = goal;

    // String-pull: from each corner, jump to the furthest point still in a straight line.
    const out: Point[] = [];
    let at = from;
    let k = 0;
    while (k < cells.length) {
      let far = k;
      for (let j = cells.length - 1; j > k; j--) {
        if (this.clearLine(at, cells[j])) {
          far = j;
          break;
        }
      }
      out.push(cells[far]);
      at = cells[far];
      k = far + 1;
    }
    return out;
  }
}
