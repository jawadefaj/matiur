// Placeholder art for the on-foot scenes: walking characters and the parked jet.
import { OUTLINE, makeCanvas, outline } from '../../../core/gfx/pixel';

/** Rows of a walker sheet, top to bottom. Matches Facing in ../WalkWorld.ts. */
export const WALKER_ROWS = ['down', 'left', 'right', 'up'] as const;
/** Columns: standing, left foot forward, right foot forward. */
export const WALKER_COLS = 3;
/** Frame size of a baked walker, px (a 14 × 24 figure plus its outline). */
export const WALKER_W = 16;
export const WALKER_H = 26;

/**
 * Colours per look: h hair, c cap (if any), s skin, e eyes, b top, B belt and
 * shading, l trousers, f boots.
 */
export const WALKER_LOOKS: Record<string, Record<string, string> & { cap?: string }> = {
  // Matiur: olive flight suit, dark g-suit legs.
  walker_pilot: { h: '#1d1a17', s: '#9a6a48', e: '#1d1a17', b: '#6b7048', B: '#4f5335', l: '#4a4e33', f: '#2a221b' },
  // Sherdil Two: lighter khaki flight suit.
  walker_wingman: { h: '#2b241e', s: '#a57552', e: '#1d1a17', b: '#8a8058', B: '#6a623f', l: '#5f5a3e', f: '#2a221b' },
  // Crew chief: blue-grey overalls and a cap.
  walker_crew: { h: '#24201c', c: '#2f3d52', s: '#8e6143', e: '#1d1a17', b: '#5d6b78', B: '#46525d', l: '#4f5b66', f: '#1f1f1f', cap: 'y' },
};

/** One 14 × 24 figure as a char grid, facing `dir`, in walk pose `pose` (0 stand, 1 and 2 stepping). */
function walkerGrid(dir: (typeof WALKER_ROWS)[number], pose: number, cap: boolean): string[][] {
  const g: string[][] = Array.from({ length: 24 }, () => Array(14).fill('.'));
  const fill = (x: number, y: number, w: number, h: number, ch: string) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (yy >= 0 && yy < 24 && xx >= 0 && xx < 14) g[yy][xx] = ch;
  };
  const side = dir === 'left' || dir === 'right';
  // Arm swing and leg lift: pose 1 and 2 are mirror steps.
  const swing = pose === 0 ? 0 : pose === 1 ? 1 : -1;
  const hair = cap ? 'c' : 'h';

  if (!side) {
    // Head
    fill(4, 1, 6, 7, 's');
    fill(4, 1, 6, 2, hair);
    fill(4, 3, 1, 1, hair);
    fill(9, 3, 1, 1, hair);
    if (cap) fill(3, 3, 8, 1, 'c');
    if (dir === 'down') {
      g[4][5] = 'e';
      g[4][8] = 'e';
    } else {
      fill(4, 1, 6, 6, hair);
      if (cap) fill(4, 6, 6, 1, 'h');
    }
    fill(6, 8, 2, 1, 's');
    // Body and belt
    fill(3, 9, 8, 7, 'b');
    fill(3, 14, 8, 1, 'B');
    // Arms swing up and down in opposite steps.
    fill(2, 9 - swing, 1, 6, 'b');
    fill(2, 15 - swing, 1, 1, 's');
    fill(11, 9 + swing, 1, 6, 'b');
    fill(11, 15 + swing, 1, 1, 's');
    // Legs: the stepping leg is lifted one pixel.
    const liftL = pose === 1 ? 1 : 0;
    const liftR = pose === 2 ? 1 : 0;
    fill(4, 16, 3, 6 - liftL, 'l');
    fill(4, 22 - liftL, 3, 1, 'f');
    fill(7, 16, 3, 6 - liftR, 'l');
    fill(7, 22 - liftR, 3, 1, 'f');
  } else {
    // Drawn facing right; 'left' is mirrored below.
    fill(5, 1, 5, 7, 's');
    fill(4, 1, 6, 2, hair);
    fill(4, 3, 3, 3, hair);
    if (cap) fill(4, 3, 8, 1, 'c');
    g[4][8] = 'e';
    fill(6, 8, 2, 1, 's');
    fill(4, 9, 6, 7, 'b');
    fill(4, 14, 6, 1, 'B');
    // One arm, swinging forward and back.
    fill(6 + swing, 10, 2, 5, 'B');
    fill(6 + swing * 2, 15, 2, 1, 's');
    if (pose === 0) {
      fill(5, 16, 4, 6, 'l');
      fill(5, 22, 5, 1, 'f');
    } else {
      // Legs apart: front leg forward, back leg behind.
      const front = pose === 1 ? 8 : 3;
      const back = pose === 1 ? 3 : 8;
      fill(5, 16, 4, 2, 'l');
      fill(front, 18, 3, 4, 'l');
      fill(front, 22, 3, 1, 'f');
      fill(back, 18, 3, 3, 'l');
      fill(back, 21, 3, 1, 'f');
    }
    if (dir === 'left') for (const row of g) row.reverse();
  }
  return g;
}

/**
 * Bake a walker sheet: WALKER_ROWS rows (down, left, right, up) by
 * WALKER_COLS columns (stand, step, step) of WALKER_W × WALKER_H frames, each
 * with a 1 px outline and a soft shadow under the feet.
 */
export function bakeWalker(look: string): HTMLCanvasElement {
  const pal = WALKER_LOOKS[look];
  const [canvas, ctx] = makeCanvas(WALKER_W * WALKER_COLS, WALKER_H * WALKER_ROWS.length);
  WALKER_ROWS.forEach((dir, r) => {
    for (let c = 0; c < WALKER_COLS; c++) {
      const ox = c * WALKER_W;
      const oy = r * WALKER_H;
      // Shadow first, so the figure covers it.
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(ox + 3, oy + 23, 10, 2);
      ctx.fillRect(ox + 4, oy + 22, 8, 1);
      const fig = walkerGrid(dir, c, !!pal.cap);
      // Pad by one pixel each side so the outline fits.
      const grid = [Array(16).fill('.'), ...fig.map((row) => ['.', ...row, '.']), Array(16).fill('.')];
      outline(grid);
      for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
          const ch = grid[y][x];
          if (ch === '.') continue;
          ctx.fillStyle = ch === 'o' ? OUTLINE : pal[ch] ?? '#ff00ff';
          ctx.fillRect(ox + x, oy + y, 1, 1);
        }
      }
    }
  });
  return canvas;
}

/** Point-in-polygon (even-odd rule). */
function inPoly(x: number, y: number, pts: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Size of the parked Sabre, px. Its centre is the fuselage centre. */
export const PARKED_SABRE_W = 100;
export const PARKED_SABRE_H = 104;

/**
 * A parked F-86 seen from above at walking scale (about 96 px long), nose
 * north, with a 1 px outline and a shadow to the lower right. The collision
 * boxes in ../levels/FlightLine.ts follow this shape.
 */
export function bakeParkedSabre(): HTMLCanvasElement {
  const W = PARKED_SABRE_W;
  const H = PARKED_SABRE_H;
  const cx = W / 2;
  const cy = H / 2;
  // Shapes relative to the centre, right half; mirrored for the left.
  const half = (pts: [number, number][]): [number, number][] => [
    ...pts,
    ...pts
      .slice()
      .reverse()
      .map(([x, y]) => [-x, y] as [number, number]),
  ];
  const wing = half([
    [7, -6],
    [44, 12],
    [44, 18],
    [7, 16],
  ]);
  const tail = half([
    [6, 32],
    [18, 40],
    [18, 43],
    [6, 42],
  ]);
  const grid: string[][] = Array.from({ length: H }, () => Array(W).fill('.'));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const px = x + 0.5 - cx;
      const py = y + 0.5 - cy;
      let ch = '.';
      if (inPoly(px, py, wing)) ch = px > 0 ? 'A' : 'a';
      if (inPoly(px, py, tail)) ch = 'a';
      // Fuselage: straight sides, a rounded nose and a tapered tail.
      const fw = py < -40 ? 7 * Math.sqrt(Math.max(0, 1 - ((py + 40) / 7) ** 2)) : py > 36 ? 7 - (py - 36) * 0.5 : 7;
      if (Math.abs(px) < fw && py > -47 && py < 46) ch = px > 2 ? 'A' : 'a';
      // Intake ring at the nose, canopy, fin line and wing roundels.
      if (py > -47 && py < -43 && Math.abs(px) < 4) ch = 'd';
      if (((px / 4) ** 2 + ((py + 26) / 8) ** 2) < 1) ch = 'c';
      if (Math.abs(px) < 1 && py > 28 && py < 46) ch = 'd';
      if (Math.hypot(Math.abs(px) - 32, py - 11) < 3.2) ch = 'g';
      if (Math.hypot(Math.abs(px) - 32, py - 11) < 1.5) ch = 'w';
      grid[y][x] = ch;
    }
  }
  outline(grid);
  const pal: Record<string, string> = { a: '#d5dadf', A: '#b4bac0', c: '#4c8db5', d: '#2a2d31', g: '#2f6b3a', w: '#f4f4ef', o: OUTLINE };
  const [canvas, ctx] = makeCanvas(W, H);
  // Shadow: the whole shape offset down-right (light from the top left).
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (grid[y][x] !== '.' && x + 3 < W && y + 3 < H) ctx.fillRect(x + 3, y + 3, 1, 1);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const ch = grid[y][x];
      if (ch === '.') continue;
      ctx.fillStyle = pal[ch];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}
