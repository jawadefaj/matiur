// Placeholder pixel art, generated at boot. Aircraft are drawn facing north
// as half-bitmaps (mirrored), then baked into 16 rotation frames with
// nearest-neighbour sampling and a 1 px dark outline. No runtime rotation.
import { TAU } from '../systems/math';

// Bitmap character -> CSS colour. '.' is always transparent.
type Palette = Record<string, string>;

/** Left half of the aircraft; the last column is the centre line. */
const SHAPES: Record<string, string[]> = {
  sabre: [
    '..........a',
    '.........aa',
    '.........ac',
    '.........ac',
    '.........aa',
    '.........aa',
    '........aaa',
    '.......aaaa',
    '......aaaaa',
    '.....aaaaaa',
    '....aaaaaaa',
    '...aaa...aa',
    '.........aa',
    '.........aa',
    '.........aa',
    '........aaa',
    '......aaaaa',
    '.....aa..aa',
    '..........d',
  ],
  hunter: [
    '...........a',
    '..........aa',
    '..........aa',
    '..........ac',
    '..........ac',
    '..........aa',
    '..........aa',
    '.........aaa',
    '........aaaa',
    '.......aaaaa',
    '......aaaaaa',
    '.....aaaaaaa',
    '....aaaaaaaa',
    '...aaaaa.aaa',
    '..aaa.....aa',
    '..........aa',
    '..........aa',
    '.........aaa',
    '.......aaaaa',
    '......aaa.aa',
    '...........d',
  ],
  gnat: [
    '.......a',
    '......ac',
    '......ac',
    '......aa',
    '.....aaa',
    '...aaaaa',
    '.aaaaaaa',
    'aaa...aa',
    '......aa',
    '......aa',
    '.....aaa',
    '...aa.aa',
    '.......d',
  ],
  canberra: [
    '.............a',
    '............aa',
    '............ac',
    '............ac',
    '............aa',
    '......d.....aa',
    '.....aaa....aa',
    'aaaaaaaaaaaaaa',
    'aaaaaaaaaaaaaa',
    '.aaaaaaaaaaaaa',
    '..aaaaaaaaaaaa',
    '.....aaa....aa',
    '......a.....aa',
    '............aa',
    '............aa',
    '............aa',
    '............aa',
    '........aaaaaa',
    '.........aaaaa',
    '............aa',
    '.............a',
  ],
};

const OUTLINE = '#1e2124';

/**
 * Art per aircraft kind: a shape from SHAPES and its colours (a airframe,
 * c canopy, d dark details). Keys must match tuning.aircraft, because
 * FlightScene uses an aircraft's kind as its texture key. mystere and b57
 * reuse the sabre and canberra shapes.
 */
export const AIRCRAFT_ART: Record<string, { shape: string; pal: Palette }> = {
  sabre: { shape: 'sabre', pal: { a: '#d5dadf', c: '#4c8db5', d: '#2a2d31' } },
  mystere: { shape: 'sabre', pal: { a: '#a9ad9c', c: '#4c8db5', d: '#2a2d31' } },
  hunter: { shape: 'hunter', pal: { a: '#7c8468', c: '#4c8db5', d: '#2a2d31' } },
  gnat: { shape: 'gnat', pal: { a: '#9aa08e', c: '#4c8db5', d: '#2a2d31' } },
  canberra: { shape: 'canberra', pal: { a: '#868d76', c: '#4c8db5', d: '#2a2d31' } },
  b57: { shape: 'canberra', pal: { a: '#c4c9c2', c: '#4c8db5', d: '#2a2d31' } },
};

// Append the mirrored right half without repeating the centre column.
function mirror(half: string[]): string[] {
  return half.map((row) => row + row.slice(0, -1).split('').reverse().join(''));
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

/** Add a 1 px outline around opaque pixels of a char grid (in place). */
function outline(grid: string[][]): void {
  const h = grid.length;
  const w = grid[0].length;
  const add: [number, number][] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (grid[y][x] !== '.') continue;
      const n =
        (y > 0 && grid[y - 1][x] !== '.' && grid[y - 1][x] !== 'o') ||
        (y < h - 1 && grid[y + 1][x] !== '.' && grid[y + 1][x] !== 'o') ||
        (x > 0 && grid[y][x - 1] !== '.' && grid[y][x - 1] !== 'o') ||
        (x < w - 1 && grid[y][x + 1] !== '.' && grid[y][x + 1] !== 'o');
      if (n) add.push([x, y]);
    }
  }
  for (const [x, y] of add) grid[y][x] = 'o';
}

/**
 * Square frames side by side in one canvas. Frame k is turned k/frames of a
 * full turn clockwise from north, matching frameForHeading() in systems/math.ts.
 */
export interface BakedSheet {
  canvas: HTMLCanvasElement;
  /** Width and height of one frame, px. */
  frameSize: number;
  frames: number;
}

/**
 * Bake 16 rotations of an aircraft into a horizontal strip.
 * `silhouette` draws every pixel in one colour (used for shadows).
 */
export function bakeAircraft(name: string, silhouette?: string, frames = 16): BakedSheet {
  const art = AIRCRAFT_ART[name];
  const src = mirror(SHAPES[art.shape]);
  const sh = src.length;
  const sw = src[0].length;
  // Big enough for the bitmap's diagonal at any angle, plus room for the outline.
  const size = Math.ceil(Math.hypot(sw, sh)) + 4;
  const [canvas, ctx] = makeCanvas(size * frames, size);
  for (let k = 0; k < frames; k++) {
    const th = (k / frames) * TAU;
    const c = Math.cos(th);
    const s = Math.sin(th);
    const grid: string[][] = [];
    // Work backwards from each output pixel: rotate its centre into the source
    // bitmap and copy the nearest source pixel. This leaves no holes.
    for (let dy = 0; dy < size; dy++) {
      const row: string[] = [];
      for (let dx = 0; dx < size; dx++) {
        const px = dx + 0.5 - size / 2;
        const py = dy + 0.5 - size / 2;
        // Inverse of a clockwise rotation (y down).
        const sx = px * c + py * s;
        const sy = -px * s + py * c;
        const col = Math.floor(sx + sw / 2);
        const rr = Math.floor(sy + sh / 2);
        row.push(rr >= 0 && rr < sh && col >= 0 && col < sw ? src[rr][col] : '.');
      }
      grid.push(row);
    }
    if (!silhouette) outline(grid);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const ch = grid[y][x];
        if (ch === '.') continue;
        // 'o' is the outline. Magenta flags a shape character missing from the palette.
        ctx.fillStyle = silhouette ?? (ch === 'o' ? OUTLINE : art.pal[ch] ?? '#ff00ff');
        ctx.fillRect(k * size + x, y, 1, 1);
      }
    }
  }
  return { canvas, frameSize: size, frames };
}

// ---------------------------------------------------------------------------
// Terrain and effects

// Integer hash to [0, 1), so the baked ground looks the same on every run.
function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Tileable patchwork of fields, 128×128. */
export function bakeGround(kind: 'farmland' | 'plains'): HTMLCanvasElement {
  const S = 128;
  const [canvas, ctx] = makeCanvas(S, S);
  const fields =
    kind === 'farmland'
      ? ['#6e8b3d', '#7f9a46', '#93a552', '#a7a65a', '#c4a24c', '#b58f45', '#5f7d38']
      : ['#b9a067', '#c6ad72', '#a99260', '#9f9a5c', '#c9b27a', '#8e8d52', '#b49a62'];
  // Bunds: the raised earth borders between fields.
  const bund = kind === 'farmland' ? '#566c32' : '#8f7a4f';
  const seed = kind === 'farmland' ? 7 : 19;
  // Columns of random width, each split into rows of random height.
  // A field's height, colour and furrow direction each add their own offset
  // (+1, +50, +90) to the hash's row argument, so they are picked independently.
  let x = 0;
  let ci = 0;
  while (x < S) {
    const w = Math.min(S - x, 14 + Math.floor(hash(ci, 0, seed) * 22));
    let y = 0;
    let ri = 0;
    while (y < S) {
      const h = Math.min(S - y, 10 + Math.floor(hash(ci, ri + 1, seed) * 26));
      ctx.fillStyle = fields[Math.floor(hash(ci, ri + 50, seed) * fields.length)];
      ctx.fillRect(x, y, w, h);
      // Furrow texture.
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      const vertical = hash(ci, ri + 90, seed) < 0.5;
      for (let k = 2; k < (vertical ? w : h); k += 3) {
        if (vertical) ctx.fillRect(x + k, y, 1, h);
        else ctx.fillRect(x, y + k, w, 1);
      }
      ctx.fillStyle = bund;
      ctx.fillRect(x, y, w, 1);
      y += h;
      ri++;
    }
    ctx.fillStyle = bund;
    ctx.fillRect(x, 0, 1, S);
    x += w;
    ci++;
  }
  // Scattered trees.
  for (let i = 0; i < 26; i++) {
    const tx = Math.floor(hash(i, 3, seed) * (S - 3));
    const ty = Math.floor(hash(i, 4, seed) * (S - 3));
    ctx.fillStyle = '#2f4f28';
    ctx.fillRect(tx, ty, 3, 3);
    ctx.fillStyle = '#4a7038';
    ctx.fillRect(tx, ty, 2, 2);
  }
  return canvas;
}

/** Shaded hill blob of radius r with a dark outline. */
export function bakeHill(r: number): HTMLCanvasElement {
  const S = r * 2 + 4;
  const [canvas, ctx] = makeCanvas(S, S);
  const c = S / 2;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = x + 0.5 - c;
      const dy = y + 0.5 - c;
      const ang = Math.atan2(dy, dx);
      // Two sine waves wobble the edge, so hills are not perfect circles.
      // The edge stays between about 0.75r and 1.05r, but LowLevel collides with the full r.
      const edge = r * (0.9 + 0.1 * Math.sin(ang * 5 + r) + 0.05 * Math.sin(ang * 11));
      const d = Math.hypot(dx, dy);
      if (d > edge + 1) continue;
      if (d > edge) {
        ctx.fillStyle = '#3b2e20';
      } else {
        // Light from the top-left.
        const lit = (-dx - dy) / (r * 1.4);
        const ring = d / edge;
        // Base colour, a lit and a shaded side, a lighter summit and one contour line.
        let col = '#7a6243';
        if (lit > 0.35 && ring < 0.85) col = '#9a7d55';
        else if (lit < -0.3) col = '#5a4630';
        if (ring < 0.35) col = lit > 0 ? '#a88a60' : '#86704c';
        if (Math.abs(ring - 0.62) < 0.04) col = '#6a5539';
        ctx.fillStyle = col;
      }
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

// Paint a character grid with a palette, one pixel per character.
function bakeFromRows(rows: string[], pal: Palette): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(rows[0].length, rows.length);
  rows.forEach((row, y) =>
    row.split('').forEach((ch, x) => {
      if (ch === '.') return;
      ctx.fillStyle = pal[ch];
      ctx.fillRect(x, y, 1, 1);
    }),
  );
  return canvas;
}

/** 8×8 px tree with its shadow (s) baked in. */
export function bakeTree(): HTMLCanvasElement {
  return bakeFromRows(
    ['..ooo...', '.oggho..', 'oggghho.', 'ogggggo.', 'oggggdo.', '.oddddos', '..ooooss', '....sss.'],
    { o: '#1f2f1a', g: '#3e6b35', h: '#5a8a47', d: '#2f5228', s: 'rgba(0,0,0,0.25)' },
  );
}

/** 7×7 px hut (roof, wall and door) with its shadow (s) baked in. */
export function bakeHut(): HTMLCanvasElement {
  return bakeFromRows(
    ['oooooo.', 'orrrro.', 'orRRro.', 'owwwwos', 'owdwwos', 'oooooos', '.ssssss'],
    { o: '#2b2118', r: '#8a5a3a', R: '#a46d45', w: '#c9b48a', d: '#4a3a2a', s: 'rgba(0,0,0,0.25)' },
  );
}

/** 5×5 px pylon for the power lines in sortie 3. */
export function bakePylon(): HTMLCanvasElement {
  return bakeFromRows(['o...o', '.o.o.', '..o..', '.o.o.', 'o...o'], { o: '#3a3d40' });
}

/** Filled circle `size` px across, for smoke, sparks, fuel vapour and dust puffs. */
export function bakePuff(size: number, color: string): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(size, size);
  const c = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (Math.hypot(x + 0.5 - c, y + 0.5 - c) <= c) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  return canvas;
}

/**
 * 56×32 px cloud of overlapping circles, in three shapes (variant % 3).
 * `shadow` draws it all black, for the cloud's shadow on the ground.
 */
export function bakeCloud(variant: number, shadow = false): HTMLCanvasElement {
  const W = 56;
  const H = 32;
  const [canvas, ctx] = makeCanvas(W, H);
  // Circles as [centre x, centre y, radius], px.
  const blobs: [number, number, number][] = [
    [[16, 18, 10], [28, 14, 12], [40, 18, 10], [24, 22, 9], [34, 22, 9]],
    [[14, 16, 9], [26, 12, 11], [38, 15, 10], [46, 19, 7], [22, 22, 8], [34, 23, 8]],
    [[20, 16, 11], [33, 15, 12], [26, 23, 8], [40, 22, 8]],
  ][variant % 3] as [number, number, number][];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let inside = false;
      let under = false;
      for (const [bx, by, br] of blobs) {
        const d = Math.hypot(x + 0.5 - bx, y + 0.5 - by);
        if (d <= br) {
          inside = true;
          // The lower part of each circle is the shaded underside.
          if (y + 0.5 - by > br * 0.45) under = true;
        }
      }
      if (!inside) continue;
      ctx.fillStyle = shadow ? '#000000' : under ? '#d6dbe0' : '#f4f6f4';
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}
