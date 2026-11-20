// The PNG loader: which files become textures, and under which key.
import { describe, expect, it } from 'vitest';
import { PNG_ART, pngArtFromPaths } from '../../src/core/gfx/pngArt';

describe('pngArtFromPaths', () => {
  it('keys each PNG by its file name, whatever subfolder it is in', () => {
    expect(
      pngArtFromPaths({
        '/assets/sprites/final/objects/walk_house_1.png': 'a.png',
        '/assets/sprites/final/tiles/walk_tiles_ground.png': 'b.png',
      }),
    ).toEqual({ walk_house_1: 'a.png', walk_tiles_ground: 'b.png' });
  });

  it('refuses two PNGs with the same name in different subfolders', () => {
    expect(() =>
      pngArtFromPaths({
        '/assets/sprites/final/objects/tree.png': 'a.png',
        '/assets/sprites/final/effects/tree.png': 'b.png',
      }),
    ).toThrow(/tree/);
  });
});

describe('PNG_ART', () => {
  it('finds the game art in assets/sprites/final/', () => {
    // These were moved into final/ by an earlier commit and stopped loading
    // because the loader only looked at the root of assets/sprites/.
    expect(Object.keys(PNG_ART)).toEqual(expect.arrayContaining(['walk_guard', 'walk_matiur_sd', 'walk_t33']));
  });

  it('never loads templates/ or original/', () => {
    const ignored = import.meta.glob(['/assets/sprites/templates/**/*.png', '/assets/sprites/original/**/*.png'], {
      eager: true,
      query: '?url',
      import: 'default',
    }) as Record<string, string>;
    const loaded = new Set(Object.values(PNG_ART));
    for (const url of Object.values(ignored)) expect(loaded.has(url)).toBe(false);
  });
});
