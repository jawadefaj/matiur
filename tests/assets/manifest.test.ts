// assets/sprites/manifest.json against the PNGs the game loads from
// assets/sprites/final/: one PNG per key, in its category folder, at the size
// the manifest gives. (scripts/art/art.py verify checks the same and more.)
import { describe, expect, it } from 'vitest';
import manifest from '../../assets/sprites/manifest.json';
import { AIRCRAFT_ART } from '../../src/mechanics/flight/art/pixelArt';
import { HILL_KEYS } from '../../src/mechanics/flight/art/register';
import { mapTextures } from '../../src/mechanics/walk/mapScenery';
import { masroorMap } from '../../src/mechanics/walk/levels/Masroor';

// Every PNG under final/, as a data URI, so its size can be read here.
const PNGS = import.meta.glob('/assets/sprites/final/**/*.png', { eager: true, query: '?inline', import: 'default' }) as Record<string, string>;

const nameOf = (path: string): string => path.slice(path.lastIndexOf('/') + 1, -4);

/** Width and height of a PNG, from its IHDR chunk (bytes 16..24, big-endian). */
function pngSize(dataUri: string): [number, number] {
  const bin = atob(dataUri.slice(dataUri.indexOf(',') + 1));
  const u32 = (i: number) => ((bin.charCodeAt(i) << 24) | (bin.charCodeAt(i + 1) << 16) | (bin.charCodeAt(i + 2) << 8) | bin.charCodeAt(i + 3)) >>> 0;
  return [u32(16), u32(20)];
}

const keys = manifest.assets.map((a) => a.key);

describe('sprite manifest', () => {
  it('lists each key once, in lowercase letters, digits and _', () => {
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) expect(k).toMatch(/^[a-z0-9_]+$/);
  });

  it('has exactly one PNG per key, at final/<category>/<key>.png, of the right size', () => {
    for (const a of manifest.assets) {
      const paths = Object.keys(PNGS).filter((p) => nameOf(p) === a.key);
      expect(paths, a.key).toEqual([`/assets/sprites/final/${a.category}/${a.key}.png`]);
      const [w, h] = pngSize(PNGS[paths[0]]);
      if (a.sizeRule === 'exact') expect([w, h], a.key).toEqual(a.size);
      else expect(w <= a.size[0] && h <= a.size[1], `${a.key} is ${w}x${h}, at most ${a.size.join('x')}`).toBe(true);
    }
  });

  it('has an entry for every PNG under final/', () => {
    for (const p of Object.keys(PNGS)) expect(keys, p).toContain(nameOf(p));
  });

  it('covers the aircraft, hills, clouds and everything the Masroor map draws', () => {
    const wanted = [
      ...Object.keys(AIRCRAFT_ART),
      ...Object.values(HILL_KEYS),
      'cloud0',
      'cloud1',
      'cloud2',
      ...mapTextures(masroorMap()).map((t) => t.key),
    ];
    for (const k of wanted) expect(keys, k).toContain(k);
  });
});
