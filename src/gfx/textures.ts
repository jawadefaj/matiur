// Turns the canvases drawn in pixelArt.ts into Phaser textures. BootScene calls
// registerTextures() once; the scenes then use the texture keys made here.
import Phaser from 'phaser';
import {
  AIRCRAFT_ART,
  bakeAircraft,
  bakeCloud,
  bakeGround,
  bakeHill,
  bakeHut,
  bakePuff,
  bakePylon,
  bakeTree,
  type BakedSheet,
} from './pixelArt';

/**
 * Texture key per hill radius (px). The radii match HILL_SIZES in
 * sortie/terrain.ts; FlightScene uses hill32 for any other size.
 */
export const HILL_KEYS: Record<number, string> = { 24: 'hill24', 32: 'hill32', 40: 'hill40', 48: 'hill48' };

function addCanvas(tm: Phaser.Textures.TextureManager, key: string, canvas: HTMLCanvasElement): Phaser.Textures.Texture {
  // Phaser will not add a key that is already in use, so replace the old texture.
  if (tm.exists(key)) tm.remove(key);
  const tex = tm.addCanvas(key, canvas);
  if (!tex) throw new Error(`Could not add texture ${key}`);
  return tex;
}

// One texture with frames named 0..frames-1, one per heading (see frameForHeading in systems/math.ts).
function addStrip(tm: Phaser.Textures.TextureManager, key: string, sheet: BakedSheet): void {
  const tex = addCanvas(tm, key, sheet.canvas);
  for (let k = 0; k < sheet.frames; k++) {
    tex.add(k, 0, k * sheet.frameSize, 0, sheet.frameSize, sheet.frameSize);
  }
}

/** Generate every placeholder texture. Called once by the boot scene. */
export function registerTextures(scene: Phaser.Scene): void {
  const tm = scene.textures;
  // Each aircraft kind, plus a black silhouette (<kind>_sh) used as its ground shadow.
  for (const name of Object.keys(AIRCRAFT_ART)) {
    addStrip(tm, name, bakeAircraft(name));
    addStrip(tm, `${name}_sh`, bakeAircraft(name, '#000000'));
  }
  addCanvas(tm, 'ground_farmland', bakeGround('farmland'));
  addCanvas(tm, 'ground_plains', bakeGround('plains'));
  for (const r of [24, 32, 40, 48]) addCanvas(tm, HILL_KEYS[r], bakeHill(r));
  addCanvas(tm, 'tree', bakeTree());
  addCanvas(tm, 'hut', bakeHut());
  addCanvas(tm, 'pylon', bakePylon());
  // Puffs for smoke trails, fuel vapour and hit sparks. 'dust' is the smoke
  // over a bombed base.
  addCanvas(tm, 'puff_light', bakePuff(6, '#cfcfca'));
  addCanvas(tm, 'puff_dark', bakePuff(6, '#55585a'));
  addCanvas(tm, 'puff_fuel', bakePuff(4, '#e8e6dc'));
  addCanvas(tm, 'spark', bakePuff(4, '#ffe27a'));
  addCanvas(tm, 'dust', bakePuff(10, '#8c7f6a'));
  // Three cloud shapes, each with a black copy for its ground shadow.
  for (let v = 0; v < 3; v++) {
    addCanvas(tm, `cloud${v}`, bakeCloud(v));
    addCanvas(tm, `cloudsh${v}`, bakeCloud(v, true));
  }
}
