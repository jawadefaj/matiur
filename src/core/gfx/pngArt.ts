// PNG art from assets/sprites/. A file named after a texture key (for example
// sabre.png or tree.png) replaces that key's placeholder art. Keys with no PNG
// keep the placeholder, so art can arrive one file at a time.
// See assets/sprites/README.md for the key list and the rules for each kind.
import { makeCanvas } from './pixel';

// Vite finds every PNG in the folder when it builds, so the game never asks
// the server for a file that isn't there. Subfolders (like templates/) are ignored.
const FILES = import.meta.glob('/assets/sprites/*.png', {
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
