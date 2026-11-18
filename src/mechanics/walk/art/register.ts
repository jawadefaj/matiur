// The walk mechanic's textures: walking characters and the parked jet.
// Each key uses its PNG from assets/sprites/ if there is one.
import type { ArtKit } from '../../../core/gfx/textures';
import { WALKER_COLS, WALKER_LOOKS, WALKER_ROWS, bakeParkedSabre, bakeWalker } from './pixelArt';

export function registerWalkArt(kit: ArtKit): void {
  // Walking characters: a sheet of WALKER_ROWS × WALKER_COLS frames, numbered
  // row by row (frame = row * WALKER_COLS + col). A PNG must use the same grid.
  for (const look of Object.keys(WALKER_LOOKS)) {
    const sheet = kit.art(look, () => bakeWalker(look));
    const tex = kit.addCanvas(look, sheet);
    const fw = sheet.width / WALKER_COLS;
    const fh = sheet.height / WALKER_ROWS.length;
    for (let r = 0; r < WALKER_ROWS.length; r++) {
      for (let c = 0; c < WALKER_COLS; c++) tex.add(r * WALKER_COLS + c, 0, c * fw, r * fh, fw, fh);
    }
  }
  kit.addCanvas('sabre_parked', kit.art('sabre_parked', bakeParkedSabre));
}
