// The flight mechanic's textures: aircraft, hills, huts, pylons, puffs and clouds.
// Each key uses its PNG from assets/sprites/ if there is one.
import type { ArtKit } from '../../../core/gfx/textures';
import { imageToCanvas, silhouette } from '../../../core/gfx/pngArt';
import { aircraftSheetFromImage } from './aircraftPng';
import { AIRCRAFT_ART, bakeAircraft, bakeCloud, bakeHill, bakeHut, bakePuff, bakePylon } from './pixelArt';

/**
 * Texture key per hill radius (px). The radii match HILL_SIZES in
 * sortie/terrain.ts; FlightScene uses hill32 for any other size.
 */
export const HILL_KEYS: Record<number, string> = { 24: 'hill24', 32: 'hill32', 40: 'hill40', 48: 'hill48' };

export function registerFlightArt(kit: ArtKit): void {
  // Each aircraft kind, plus a black silhouette (<kind>_sh) used as its ground shadow.
  for (const name of Object.keys(AIRCRAFT_ART)) {
    const img = kit.png(name);
    const sheet = img ? aircraftSheetFromImage(img) : bakeAircraft(name);
    kit.addStrip(name, sheet);
    kit.addStrip(`${name}_sh`, { ...sheet, canvas: silhouette(sheet.canvas) });
  }
  for (const r of [24, 32, 40, 48]) kit.addCanvas(HILL_KEYS[r], kit.art(HILL_KEYS[r], () => bakeHill(r)));
  kit.addCanvas('hut', kit.art('hut', bakeHut));
  kit.addCanvas('pylon', kit.art('pylon', bakePylon));
  // Puffs for smoke trails, fuel vapour and hit sparks. 'dust' is the smoke
  // over a bombed base.
  kit.addCanvas('puff_light', kit.art('puff_light', () => bakePuff(6, '#cfcfca')));
  kit.addCanvas('puff_dark', kit.art('puff_dark', () => bakePuff(6, '#55585a')));
  kit.addCanvas('puff_fuel', kit.art('puff_fuel', () => bakePuff(4, '#e8e6dc')));
  kit.addCanvas('spark', kit.art('spark', () => bakePuff(4, '#ffe27a')));
  kit.addCanvas('dust', kit.art('dust', () => bakePuff(10, '#8c7f6a')));
  // Three cloud shapes, each with a black copy for its ground shadow. A cloud
  // PNG gets its shadow made from it unless cloudsh<n>.png is also given.
  for (let v = 0; v < 3; v++) {
    const cloud = kit.art(`cloud${v}`, () => bakeCloud(v));
    kit.addCanvas(`cloud${v}`, cloud);
    const shadow = kit.png(`cloudsh${v}`);
    kit.addCanvas(`cloudsh${v}`, shadow ? imageToCanvas(shadow) : kit.png(`cloud${v}`) ? silhouette(cloud) : bakeCloud(v, true));
  }
}
