// The GIF decoder that lets the menu background animate.
import { describe, expect, it } from 'vitest';
import { decodeGif } from '../../src/core/gfx/gif';
import menuGif from '../../assets/sprites/original/UI/Idle_v3_walking_south.gif?inline';

const bytes = (dataUrl: string): Uint8Array => Uint8Array.from(atob(dataUrl.slice(dataUrl.indexOf(',') + 1)), (c) => c.charCodeAt(0));

describe('decodeGif', () => {
  it('decodes a 1x1 transparent GIF', () => {
    const g = decodeGif(bytes('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'));
    expect([g.width, g.height, g.frames.length]).toEqual([1, 1, 1]);
    expect(g.frames[0].rgba[3]).toBe(0);
    // A delay of 0 plays at 100 ms, as in browsers.
    expect(g.frames[0].delay).toBe(100);
  });

  it('decodes every frame of the menu background', () => {
    const g = decodeGif(bytes(menuGif));
    expect([g.width, g.height]).toEqual([84, 84]);
    expect(g.frames.map((f) => f.delay)).toEqual(Array(8).fill(200));
    for (const f of g.frames) {
      expect(f.rgba[3]).toBe(0); // transparent corner
      const opaque = f.rgba.filter((v, i) => i % 4 === 3 && v === 255).length;
      expect(opaque).toBeGreaterThan(1000);
    }
    // It animates: frames differ.
    expect(g.frames[1].rgba).not.toEqual(g.frames[0].rgba);
  });

  it('rejects a file that is not a GIF', () => {
    expect(() => decodeGif(new TextEncoder().encode('PNG...'))).toThrow('Not a GIF');
  });
});
