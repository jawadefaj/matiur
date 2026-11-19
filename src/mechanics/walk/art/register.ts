// The walk mechanic's textures: walking characters, the parked jet, and the
// Level 2 art (Masroor map, Matiur in service dress, guards, Bluebird).
// Each key uses its PNG from assets/sprites/ if there is one.
import type { ArtKit } from '../../../core/gfx/textures';
import { bakeFromRows, makeCanvas } from '../../../core/gfx/pixel';
import { WALKER_COLS, WALKER_LOOKS, WALKER_ROWS, bakeParkedSabre, bakeWalker } from './pixelArt';

/** Walker sheets that only exist as PNGs, with the baked look to stand in when the PNG is missing. */
const PNG_WALKERS: Record<string, string> = {
  walk_matiur_sd: 'walker_pilot',
  walk_guard: 'walker_crew',
};

/** A flat-coloured canvas, the stand-in for a missing picture. */
function flat(w: number, h: number, color: string): () => HTMLCanvasElement {
  return () => {
    const [c, ctx] = makeCanvas(w, h);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    return c;
  };
}

/** A 16 × 16 orange tree from above; `ripe` dots it with fruit. */
function bakeOrangeTree(ripe: boolean): () => HTMLCanvasElement {
  const rows = [
    '.....oooooo.....',
    '...ooggggggoo...',
    '..oggghhgggggo..',
    '.ogghhhhggRgggo.',
    '.oggRhhgggggggo.',
    'ogggggggggRgdgo.',
    'oggggRgggggggdos',
    'ogggggggRggdddos',
    'ogRgggggggggddos',
    'ogggggRgggdddoss',
    '.ogggggggddddos.',
    '.oggdRgdddddoss.',
    '..ooddddddooss..',
    '...ooooooooss...',
    '.....sssssss....',
    '................',
  ];
  return () =>
    bakeFromRows(rows, {
      o: '#1f2f1a',
      g: '#3e6b35',
      h: '#5a8a47',
      d: '#2f5228',
      s: 'rgba(0,0,0,0.25)',
      R: ripe ? '#f08a1c' : '#3e6b35',
    });
}

export function registerWalkArt(kit: ArtKit): void {
  // Walking characters: a sheet of WALKER_ROWS × WALKER_COLS frames, numbered
  // row by row (frame = row * WALKER_COLS + col). A PNG must use the same grid.
  const looks: [string, () => HTMLCanvasElement][] = [
    ...Object.keys(WALKER_LOOKS).map((l): [string, () => HTMLCanvasElement] => [l, () => bakeWalker(l)]),
    ...Object.entries(PNG_WALKERS).map(([k, stand]): [string, () => HTMLCanvasElement] => [k, () => bakeWalker(stand)]),
  ];
  for (const [look, bake] of looks) {
    const sheet = kit.art(look, bake);
    const tex = kit.addCanvas(look, sheet);
    const fw = sheet.width / WALKER_COLS;
    const fh = sheet.height / WALKER_ROWS.length;
    for (let r = 0; r < WALKER_ROWS.length; r++) {
      for (let c = 0; c < WALKER_COLS; c++) tex.add(r * WALKER_COLS + c, 0, c * fw, r * fh, fw, fh);
    }
  }
  kit.addCanvas('sabre_parked', kit.art('sabre_parked', bakeParkedSabre));
  // Level 1's orchard: orange trees, with and without ripe fruit.
  kit.addCanvas('walk_orange_tree', kit.art('walk_orange_tree', bakeOrangeTree(true)));
  kit.addCanvas('walk_orchard_tree', kit.art('walk_orchard_tree', bakeOrangeTree(false)));
  // Level 2: the base map (2480 × 1880, one px per world px) by day and by night, and Bluebird from above.
  kit.addCanvas('walk_masroor_day', kit.art('walk_masroor_day', flat(2480, 1880, '#9a8458')));
  kit.addCanvas('walk_masroor_night', kit.art('walk_masroor_night', flat(2480, 1880, '#1c2230')));
  kit.addCanvas('walk_t33', kit.art('walk_t33', flat(40, 40, '#b8bcc0')));
}
