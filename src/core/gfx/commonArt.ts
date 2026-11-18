// Placeholder art for textures that more than one mechanic uses: the ground
// (menu background and flight) and the tree (flight and walk).
import { bakeFromRows, makeCanvas } from './pixel';

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

/** 8×8 px tree with its shadow (s) baked in. */
export function bakeTree(): HTMLCanvasElement {
  return bakeFromRows(
    ['..ooo...', '.oggho..', 'oggghho.', 'ogggggo.', 'oggggdo.', '.oddddos', '..ooooss', '....sss.'],
    { o: '#1f2f1a', g: '#3e6b35', h: '#5a8a47', d: '#2f5228', s: 'rgba(0,0,0,0.25)' },
  );
}
