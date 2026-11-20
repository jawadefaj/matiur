// The walk mechanic's textures: walking characters, the parked jet, and the
// Level 2 art (Masroor's tiles and map pictures, Matiur in service dress,
// guards, Bluebird). Each key uses its PNG from assets/sprites/final/ if there is one.
import type { ArtKit } from '../../../core/gfx/textures';
import { makeCanvas } from '../../../core/gfx/pixel';
import { silhouette } from '../../../core/gfx/pngArt';
import { mapTextures } from '../mapScenery';
import { masroorMap } from '../levels/Masroor';
import { WALKER_COLS, WALKER_LOOKS, WALKER_ROWS, bakeParkedSabre, bakeWalker } from './pixelArt';

/** Walker sheets that only exist as PNGs, with the baked look to stand in when the PNG is missing. */
const PNG_WALKERS: Record<string, string> = {
  walk_matiur_sd: 'walker_pilot',
  walk_guard: 'walker_crew',
};

/** Colour of a ground shadow (the old baked map's: 20, 14, 30). WalkScene draws it see-through. */
const SHADOW_COLOR = '#140e1e';

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

  // Level 2: everything Masroor's Tiled map draws: the tile atlases, each
  // object picture (plus '<key>_sh', its shadow, if it casts one) and the wall
  // stamp. The sizes come from the map; a pink box shows if a PNG goes missing.
  const done = new Set<string>();
  for (const tex of mapTextures(masroorMap())) {
    const canvas = kit.art(tex.key, flat(tex.w, tex.h, '#d040a0'));
    kit.addCanvas(tex.key, canvas);
    if (tex.shadow) kit.addCanvas(`${tex.key}_sh`, silhouette(canvas, SHADOW_COLOR));
    done.add(tex.key);
  }
  // Bluebird from above (usually a parked T-33 on the map too, so already done).
  if (!done.has('walk_t33')) kit.addCanvas('walk_t33', kit.art('walk_t33', flat(80, 94, '#b8bcc0')));
}
