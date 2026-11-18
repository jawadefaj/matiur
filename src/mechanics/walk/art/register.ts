// The walk mechanic's textures: walking characters, the parked jet, and the
// Level 2 art (Masroor map, Matiur in service dress, guards, Bluebird).
// Each key uses its PNG from assets/sprites/ if there is one.
import type { ArtKit } from '../../../core/gfx/textures';
import { makeCanvas } from '../../../core/gfx/pixel';
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
  // Level 2: the base map (620 × 470, drawn at 4x) by day and by night, and Bluebird from above.
  kit.addCanvas('walk_masroor_day', kit.art('walk_masroor_day', flat(620, 470, '#9a8458')));
  kit.addCanvas('walk_masroor_night', kit.art('walk_masroor_night', flat(620, 470, '#1c2230')));
  kit.addCanvas('walk_t33', kit.art('walk_t33', flat(40, 40, '#b8bcc0')));
}
