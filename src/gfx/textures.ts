// Turns the art into Phaser textures. BootScene loads any PNGs from
// assets/sprites/ (pngArt.ts), then calls registerTextures() once. Each key uses
// its PNG if there is one, else the placeholder drawn in pixelArt.ts. The
// scenes then use the texture keys made here.
import Phaser from 'phaser';
import { PNG_ART, aircraftSheetFromImage, imageToCanvas, pngKey, silhouette } from './pngArt';
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

/** Queue every PNG in assets/sprites/ for loading. Called from BootScene.preload(). */
export function loadPngArt(scene: Phaser.Scene): void {
  for (const [key, url] of Object.entries(PNG_ART)) scene.load.image(pngKey(key), url);
}

/** The loaded PNG for a texture key, or undefined if there is none. */
function png(tm: Phaser.Textures.TextureManager, key: string): HTMLImageElement | HTMLCanvasElement | undefined {
  if (!tm.exists(pngKey(key))) return undefined;
  return tm.get(pngKey(key)).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
}

/** The PNG for a key as a canvas, or the placeholder if there is no PNG. */
function art(tm: Phaser.Textures.TextureManager, key: string, placeholder: () => HTMLCanvasElement): HTMLCanvasElement {
  const img = png(tm, key);
  return img ? imageToCanvas(img) : placeholder();
}

/** Make every texture, from PNGs where they exist. Called once by the boot scene. */
export function registerTextures(scene: Phaser.Scene): void {
  const tm = scene.textures;
  // Each aircraft kind, plus a black silhouette (<kind>_sh) used as its ground shadow.
  for (const name of Object.keys(AIRCRAFT_ART)) {
    const img = png(tm, name);
    const sheet = img ? aircraftSheetFromImage(img) : bakeAircraft(name);
    addStrip(tm, name, sheet);
    addStrip(tm, `${name}_sh`, { ...sheet, canvas: silhouette(sheet.canvas) });
  }
  addCanvas(tm, 'ground_farmland', art(tm, 'ground_farmland', () => bakeGround('farmland')));
  addCanvas(tm, 'ground_plains', art(tm, 'ground_plains', () => bakeGround('plains')));
  for (const r of [24, 32, 40, 48]) addCanvas(tm, HILL_KEYS[r], art(tm, HILL_KEYS[r], () => bakeHill(r)));
  addCanvas(tm, 'tree', art(tm, 'tree', bakeTree));
  addCanvas(tm, 'hut', art(tm, 'hut', bakeHut));
  addCanvas(tm, 'pylon', art(tm, 'pylon', bakePylon));
  // Puffs for smoke trails, fuel vapour and hit sparks. 'dust' is the smoke
  // over a bombed base.
  addCanvas(tm, 'puff_light', art(tm, 'puff_light', () => bakePuff(6, '#cfcfca')));
  addCanvas(tm, 'puff_dark', art(tm, 'puff_dark', () => bakePuff(6, '#55585a')));
  addCanvas(tm, 'puff_fuel', art(tm, 'puff_fuel', () => bakePuff(4, '#e8e6dc')));
  addCanvas(tm, 'spark', art(tm, 'spark', () => bakePuff(4, '#ffe27a')));
  addCanvas(tm, 'dust', art(tm, 'dust', () => bakePuff(10, '#8c7f6a')));
  // Three cloud shapes, each with a black copy for its ground shadow. A cloud
  // PNG gets its shadow made from it unless cloudsh<n>.png is also given.
  for (let v = 0; v < 3; v++) {
    const cloud = art(tm, `cloud${v}`, () => bakeCloud(v));
    addCanvas(tm, `cloud${v}`, cloud);
    const shadow = png(tm, `cloudsh${v}`);
    addCanvas(tm, `cloudsh${v}`, shadow ? imageToCanvas(shadow) : png(tm, `cloud${v}`) ? silhouette(cloud) : bakeCloud(v, true));
  }
}
