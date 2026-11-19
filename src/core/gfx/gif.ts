// Decodes a GIF into its frames so an animated GIF can play in the game
// (Phaser shows only a GIF's first frame). textures.ts turns the frames into a
// texture and an animation. Pure: no Phaser, no DOM.

/** One frame of a GIF, composited at the GIF's full size. */
export interface GifFrame {
  /** RGBA pixels, width x height x 4 bytes. */
  rgba: Uint8ClampedArray<ArrayBuffer>;
  /** How long the frame shows, in ms. */
  delay: number;
}

export interface Gif {
  width: number;
  height: number;
  frames: GifFrame[];
}

/** Decode GIF bytes. Throws if they are not a GIF or have no frames. */
export function decodeGif(bytes: Uint8Array): Gif {
  const r = new Reader(bytes);
  const sig = r.ascii(6);
  if (sig !== 'GIF87a' && sig !== 'GIF89a') throw new Error('Not a GIF file');
  const width = r.u16();
  const height = r.u16();
  const flags = r.u8();
  r.skip(2); // background colour index, pixel aspect ratio
  const globalColors = flags & 0x80 ? r.colors(flags & 7) : null;

  const frames: GifFrame[] = [];
  const screen = new Uint8ClampedArray(width * height * 4);
  // From the graphic control extension that comes before each image.
  let delay = 0;
  let transparent = -1;
  let disposal = 0;
  // The last image's area and disposal, undone before the next image is drawn.
  let undo: { x: number; y: number; w: number; h: number; disposal: number } | null = null;
  let saved: Uint8ClampedArray | null = null;

  for (;;) {
    const block = r.u8();
    if (block === 0x3b) break; // trailer
    if (block === 0x21) {
      const label = r.u8();
      if (label === 0xf9) {
        const size = r.u8();
        const end = r.pos + size;
        const f = r.u8();
        delay = r.u16();
        const t = r.u8();
        transparent = f & 1 ? t : -1;
        disposal = (f >> 2) & 7;
        r.pos = end;
      }
      r.subBlocks();
      continue;
    }
    if (block !== 0x2c) throw new Error(`Bad GIF block 0x${block.toString(16)}`);

    const x = r.u16();
    const y = r.u16();
    const w = r.u16();
    const h = r.u16();
    const f = r.u8();
    const colors = f & 0x80 ? r.colors(f & 7) : globalColors;
    if (!colors) throw new Error('GIF image has no colour table');
    const minCodeSize = r.u8();
    const indices = lzw(minCodeSize, r.subBlocks(), w * h);

    // Undo the last image: 2 clears its area, 3 puts back what was under it.
    if (undo?.disposal === 2) clearRect(screen, width, height, undo);
    else if (undo?.disposal === 3 && saved) screen.set(saved);
    if (disposal === 3) saved = screen.slice();

    const rows = rowOrder(h, (f & 0x40) !== 0);
    for (let i = 0; i < h; i++) {
      const sy = y + rows[i];
      if (sy >= height) continue;
      for (let j = 0; j < w; j++) {
        const sx = x + j;
        const c = indices[i * w + j];
        if (sx >= width || c === transparent) continue;
        const o = (sy * width + sx) * 4;
        screen[o] = colors[c * 3];
        screen[o + 1] = colors[c * 3 + 1];
        screen[o + 2] = colors[c * 3 + 2];
        screen[o + 3] = 255;
      }
    }
    // Browsers show a delay under 20 ms as 100 ms; do the same.
    frames.push({ rgba: screen.slice(), delay: delay < 2 ? 100 : delay * 10 });
    undo = { x, y, w, h, disposal };
    delay = 0;
    transparent = -1;
    disposal = 0;
  }
  if (!frames.length) throw new Error('GIF has no frames');
  return { width, height, frames };
}

/** Byte reader over the file. Reading past the end throws. */
class Reader {
  pos = 0;
  constructor(private readonly b: Uint8Array) {}

  u8(): number {
    if (this.pos >= this.b.length) throw new Error('GIF file is cut short');
    return this.b[this.pos++];
  }

  u16(): number {
    const lo = this.u8();
    return lo | (this.u8() << 8);
  }

  ascii(n: number): string {
    let s = '';
    for (let i = 0; i < n; i++) s += String.fromCharCode(this.u8());
    return s;
  }

  skip(n: number): void {
    this.pos += n;
  }

  /** A colour table of 2^(bits+1) RGB triples. */
  colors(bits: number): Uint8Array {
    const n = 3 * (2 << bits);
    if (this.pos + n > this.b.length) throw new Error('GIF file is cut short');
    const t = this.b.subarray(this.pos, this.pos + n);
    this.pos += n;
    return t;
  }

  /** Data sub-blocks up to the empty one that ends them, joined. */
  subBlocks(): Uint8Array {
    const parts: Uint8Array[] = [];
    let total = 0;
    for (let n = this.u8(); n > 0; n = this.u8()) {
      if (this.pos + n > this.b.length) throw new Error('GIF file is cut short');
      parts.push(this.b.subarray(this.pos, this.pos + n));
      this.pos += n;
      total += n;
    }
    const out = new Uint8Array(total);
    let o = 0;
    for (const p of parts) {
      out.set(p, o);
      o += p.length;
    }
    return out;
  }
}

/** GIF's variable-width LZW: `count` colour indices from `data`. Missing pixels stay 0. */
function lzw(minCodeSize: number, data: Uint8Array, count: number): Uint8Array {
  const out = new Uint8Array(count);
  const clear = 1 << minCodeSize;
  const end = clear + 1;
  const prefix = new Uint16Array(4096);
  const suffix = new Uint8Array(4096);
  const stack = new Uint8Array(4097);
  for (let i = 0; i < clear; i++) suffix[i] = i;
  let size = minCodeSize + 1;
  let next = end + 1;
  let prev = -1;
  let first = 0;
  let acc = 0;
  let bits = 0;
  let pos = 0;
  let op = 0;
  while (op < count) {
    while (bits < size) {
      if (pos >= data.length) return out;
      acc |= data[pos++] << bits;
      bits += 8;
    }
    const code = acc & ((1 << size) - 1);
    acc >>>= size;
    bits -= size;
    if (code === clear) {
      size = minCodeSize + 1;
      next = end + 1;
      prev = -1;
      continue;
    }
    if (code === end) break;
    if (prev < 0) {
      if (code >= clear) break; // corrupt: must start with a plain colour
      out[op++] = code;
      prev = first = code;
      continue;
    }
    if (code > next) break; // corrupt
    // Unwind the code's string onto the stack, last colour first. A code not
    // yet in the table (code === next) is the previous string plus its own first colour.
    let sp = 0;
    let c = code;
    if (code === next) {
      stack[sp++] = first;
      c = prev;
    }
    while (c >= clear) {
      stack[sp++] = suffix[c];
      c = prefix[c];
    }
    first = c;
    stack[sp++] = c;
    if (next < 4096) {
      prefix[next] = prev;
      suffix[next] = first;
      next++;
      if (next === 1 << size && size < 12) size++;
    }
    prev = code;
    while (sp > 0 && op < count) out[op++] = stack[--sp];
  }
  return out;
}

/** Screen row of each decoded row: in order, or GIF's four interlace passes. */
function rowOrder(h: number, interlaced: boolean): number[] {
  if (!interlaced) return Array.from({ length: h }, (_, i) => i);
  const rows: number[] = [];
  for (const [start, step] of [[0, 8], [4, 8], [2, 4], [1, 2]]) {
    for (let r = start; r < h; r += step) rows.push(r);
  }
  return rows;
}

function clearRect(screen: Uint8ClampedArray, width: number, height: number, a: { x: number; y: number; w: number; h: number }): void {
  for (let y = a.y; y < Math.min(a.y + a.h, height); y++) {
    const from = (y * width + a.x) * 4;
    screen.fill(0, from, from + Math.max(0, Math.min(a.w, width - a.x)) * 4);
  }
}
