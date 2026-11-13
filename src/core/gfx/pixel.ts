// Pixel-art helpers shared by every mechanic's placeholder art: canvases,
// char-grid painting and outlines. Each mechanic draws its own art in
// src/mechanics/<id>/art/; shared textures are in commonArt.ts.

/** Bitmap character -> CSS colour. '.' is always transparent. */
export type Palette = Record<string, string>;

/** Outline colour used by all baked art. */
export const OUTLINE = '#1e2124';

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

/** Add a 1 px outline around opaque pixels of a char grid (in place). */
export function outline(grid: string[][]): void {
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
 * full turn clockwise from north, matching frameForHeading() in core/math.ts.
 */
export interface BakedSheet {
  canvas: HTMLCanvasElement;
  /** Width and height of one frame, px. */
  frameSize: number;
  frames: number;
}

/** Paint a character grid with a palette, one pixel per character. */
export function bakeFromRows(rows: string[], pal: Palette): HTMLCanvasElement {
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
