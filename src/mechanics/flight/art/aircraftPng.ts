// Turns an aircraft PNG from assets/sprites/ into a strip of rotation frames,
// like bakeAircraft() in pixelArt.ts.
import { TAU } from '../../../core/math';
import { makeCanvas, type BakedSheet } from '../../../core/gfx/pixel';
import { imageToCanvas } from '../../../core/gfx/pngArt';

type Source = HTMLImageElement | HTMLCanvasElement;

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
