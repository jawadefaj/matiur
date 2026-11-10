// PNG art from assets/sprites/. A file named after a texture key (for example
// sabre.png or tree.png) replaces that key's placeholder from pixelArt.ts.
// Keys with no PNG keep the placeholder, so art can arrive one file at a time.
// See assets/sprites/README.md for the key list and the rules for each kind.
import { TAU } from '../systems/math';
import type { BakedSheet } from './pixelArt';

// Vite finds every PNG in the folder when it builds, so the game never asks
// the server for a file that isn't there. Subfolders (like templates/) are ignored.
const FILES = import.meta.glob('../../assets/sprites/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/** Texture key -> URL of its PNG. */
export const PNG_ART: Record<string, string> = Object.fromEntries(
  Object.entries(FILES).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -4), url]),
);

/** Key the PNG is loaded under, so it doesn't clash with the final texture key. */
export const pngKey = (key: string): string => `png:${key}`;

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

type Source = HTMLImageElement | HTMLCanvasElement;

/** Copy an image onto a canvas so it can be drawn into or used as a texture. */
export function imageToCanvas(img: Source): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(img.width, img.height);
  ctx.drawImage(img, 0, 0);
  return canvas;
}

/** The same canvas with every visible pixel painted one colour (for ground shadows). */
export function silhouette(src: HTMLCanvasElement, color = '#000000'): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(src.width, src.height);
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, src.width, src.height);
  return canvas;
}

/**
 * Turn an aircraft PNG into a strip of rotation frames, like bakeAircraft().
 * Two layouts work:
 * - One picture of the aircraft facing north (up). It is turned into `frames`
 *   frames here, with nearest-neighbour sampling so the pixels stay sharp.
 * - A strip already drawn by hand: `frames` square frames side by side, frame k
 *   turned k/frames of a full turn clockwise from north.
 */
export function aircraftSheetFromImage(img: Source, frames = 16): BakedSheet {
  if (img.width === img.height * frames) {
    return { canvas: imageToCanvas(img), frameSize: img.height, frames };
  }
  const sw = img.width;
  const sh = img.height;
  const src = imageToCanvas(img).getContext('2d')!.getImageData(0, 0, sw, sh).data;
  // Big enough for the picture's diagonal at any angle.
  const size = Math.ceil(Math.hypot(sw, sh)) + 2;
  const [canvas, ctx] = makeCanvas(size * frames, size);
  const out = ctx.createImageData(size * frames, size);
  for (let k = 0; k < frames; k++) {
    const th = (k / frames) * TAU;
    const c = Math.cos(th);
    const s = Math.sin(th);
    // Work backwards from each output pixel: rotate its centre into the source
    // picture and copy the nearest pixel. This leaves no holes.
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        const px = dx + 0.5 - size / 2;
        const py = dy + 0.5 - size / 2;
        const col = Math.floor(px * c + py * s + sw / 2);
        const row = Math.floor(-px * s + py * c + sh / 2);
        if (row < 0 || row >= sh || col < 0 || col >= sw) continue;
        const i = (row * sw + col) * 4;
        const o = (dy * size * frames + k * size + dx) * 4;
        for (let ch = 0; ch < 4; ch++) out.data[o + ch] = src[i + ch];
      }
    }
  }
  ctx.putImageData(out, 0, 0);
  return { canvas, frameSize: size, frames };
}
