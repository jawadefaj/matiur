// Turns art into Phaser textures. BootScene loads any PNGs from assets/sprites/
// (pngArt.ts), then core and every mechanic register their textures once
// through an ArtKit. Each key uses its PNG if there is one, else the
// placeholder drawn in code.
import Phaser from 'phaser';
import { bakeGround, bakeTree } from './commonArt';
import type { BakedSheet } from './pixel';
import { PNG_ART, imageToCanvas, pngKey } from './pngArt';

type Source = HTMLImageElement | HTMLCanvasElement;

/** What a mechanic's art registration gets: texture helpers bound to one owner. */
export interface ArtKit {
  /** 'core' or the mechanic id. Two owners may not register the same key. */
  readonly owner: string;
  /** Add (or replace) a canvas texture. */
  addCanvas(key: string, canvas: HTMLCanvasElement): Phaser.Textures.Texture;
  /** One texture with frames named 0..frames-1, one per heading (see frameForHeading in core/math.ts). */
  addStrip(key: string, sheet: BakedSheet): void;
  /** The PNG for a key as a canvas, or the placeholder if there is no PNG. */
  art(key: string, placeholder: () => HTMLCanvasElement): HTMLCanvasElement;
  /** The loaded PNG for a texture key, or undefined if there is none. */
  png(key: string): Source | undefined;
}

/** Queue every PNG in assets/sprites/ for loading. Called from BootScene.preload(). */
export function loadPngArt(scene: Phaser.Scene): void {
  for (const [key, url] of Object.entries(PNG_ART)) scene.load.image(pngKey(key), url);
}

/**
 * An ArtKit for `owner`. `owners` is shared by every kit made at boot, so a key
 * registered by two owners is caught (it throws in dev, warns in a build).
 */
export function makeArtKit(scene: Phaser.Scene, owner: string, owners: Map<string, string>): ArtKit {
  const tm = scene.textures;
  const png = (key: string): Source | undefined => {
    if (!tm.exists(pngKey(key))) return undefined;
    return tm.get(pngKey(key)).getSourceImage() as Source;
  };
  const addCanvas = (key: string, canvas: HTMLCanvasElement): Phaser.Textures.Texture => {
    const prev = owners.get(key);
    if (prev && prev !== owner) {
      const msg = `Texture key "${key}" is registered by both ${prev} and ${owner}. Prefix mechanic keys with the mechanic id.`;
      if (import.meta.env.DEV) throw new Error(msg);
      console.warn(msg);
    }
    owners.set(key, owner);
    // Phaser will not add a key that is already in use, so replace the old texture.
    if (tm.exists(key)) tm.remove(key);
    const tex = tm.addCanvas(key, canvas);
    if (!tex) throw new Error(`Could not add texture ${key}`);
    return tex;
  };
  return {
    owner,
    png,
    addCanvas,
    addStrip(key, sheet) {
      const tex = addCanvas(key, sheet.canvas);
      for (let k = 0; k < sheet.frames; k++) tex.add(k, 0, k * sheet.frameSize, 0, sheet.frameSize, sheet.frameSize);
    },
    art(key, placeholder) {
      const img = png(key);
      return img ? imageToCanvas(img) : placeholder();
    },
  };
}

/** Textures more than one mechanic uses: the ground patterns and the tree. */
export function registerCommonArt(kit: ArtKit): void {
  kit.addCanvas('ground_farmland', kit.art('ground_farmland', () => bakeGround('farmland')));
  kit.addCanvas('ground_plains', kit.art('ground_plains', () => bakeGround('plains')));
  kit.addCanvas('tree', kit.art('tree', bakeTree));
}
