// Level 2's Tiled map (src/mechanics/walk/levels/masroor.tmj): its colliders,
// its pictures and its markers, as the game reads them.
import { describe, expect, it } from 'vitest';
import { collisionRects, prop, spriteFootprints, tileOf } from '../../../src/core/tiled';
import { PNG_ART } from '../../../src/core/gfx/pngArt';
import { makeWalkLevel } from '../../../src/mechanics/walk/levels';
import { mapTextures } from '../../../src/mechanics/walk/mapScenery';
import { WalkWorld } from '../../../src/mechanics/walk/WalkWorld';
import {
  BLUEBIRD_ROUTE,
  HOME,
  HOSPITAL,
  INTERCEPT,
  OFFICE,
  RAMP_ROAD,
  RAMP_START,
  WATCHTOWER,
  masroorMap,
  readMasroorMap,
} from '../../../src/mechanics/walk/levels/Masroor';
import raw from '../../../src/mechanics/walk/levels/masroor.tmj?raw';
import legacy from './fixtures/masroorLayout.legacy.json';

const map = masroorMap();
const LEVELS = ['masroor-schedule', 'masroor-hospital', 'masroor-intercept'] as const;

describe('Masroor map', () => {
  // The map still is the old baked map until someone edits it in Tiled and sets legacy to false.
  it.skipIf(prop(map.props, 'legacy', false) !== true)('has exactly the old colliders, in order, while legacy is true', () => {
    expect(collisionRects(map)).toEqual(legacy.solids);
  });

  it("blocks Matiur's house in every Masroor level", () => {
    for (const id of LEVELS) {
      expect(makeWalkLevel(id).blocks, id).toContainEqual(expect.objectContaining({ x: 1829, y: 1373, w: 53, h: 46, solid: true }));
    }
  });

  it('resolves every gid, and the ground has no empty cell', () => {
    for (const layer of map.tileLayers) {
      for (const gid of new Set(layer.data)) if (gid !== 0) expect(() => tileOf(map, gid), `gid ${gid}`).not.toThrow();
      if (layer.name === 'ground') expect(layer.data.includes(0)).toBe(false);
    }
    for (const s of map.sprites) expect(tileOf(map, s.gid).tile.key).toBe(s.key);
  });

  it('has a PNG under assets/sprites/final/ for every texture it uses', () => {
    const keys = mapTextures(map).map((t) => t.key);
    expect(keys).toEqual(expect.arrayContaining(['walk_tiles_ground', 'walk_tiles_paint', 'walk_house_1', 'walk_wall']));
    for (const k of keys) expect(PNG_ART[k], k).toBeDefined();
  });

  it('says walkable (true or false) on every tile of every atlas', () => {
    for (const t of map.tilesets.filter((ts) => ts.kind === 'atlas')) {
      expect(t.tiles.size).toBe(t.tilecount);
      for (const [id, tile] of t.tiles) expect(typeof tile.props.walkable, `${t.name} tile ${id}`).toBe('boolean');
    }
  });

  it('has its markers where Masroor.ts puts things', () => {
    const got = Object.fromEntries(map.points.map((p) => [p.name, { x: p.x, y: p.y }]));
    expect(got).toEqual({
      HOME,
      OFFICE,
      HOSPITAL,
      RAMP_START,
      ...Object.fromEntries(BLUEBIRD_ROUTE.map((p, i) => [`BLUEBIRD_ROUTE_${i}`, p])),
      INTERCEPT,
      WATCHTOWER: { x: WATCHTOWER.x, y: WATCHTOWER.y },
      RAMP_ROAD: { x: RAMP_ROAD.x, y: RAMP_ROAD.y },
    });
  });

  it('gives the levels its tiles, pictures and wall', () => {
    const level = makeWalkLevel('masroor-schedule');
    expect(level.tilemap?.layers).toEqual(['ground', 'paint']);
    expect(level.tilemap?.tilesets).toEqual(['walk_tiles_ground', 'walk_tiles_paint']);
    expect(level.sprites.length).toBe(map.sprites.length);
    expect(level.sprites.filter((s) => s.flat).map((s) => s.key)).toEqual(expect.arrayContaining(['walk_pond', 'walk_track']));
    expect(level.wallLines.map((l) => l.key)).toEqual(['walk_wall']);
  });

  it("doesn't draw the parked T-33 Bluebird starts on in Intercept, but keeps its collider", () => {
    const start = BLUEBIRD_ROUTE[0];
    // A T-33 picture (x = left, y = bottom) with Bluebird's start inside it.
    const under = (s: { key: string; x: number; y: number; w: number; h: number }) =>
      s.key === 'walk_t33' && s.x <= start.x && start.x <= s.x + s.w && s.y - s.h <= start.y && start.y <= s.y;
    // Exactly one parked jet stands where Bluebird starts.
    const parked = map.sprites.filter(under);
    expect(parked).toHaveLength(1);
    const intercept = makeWalkLevel('masroor-intercept');
    const schedule = makeWalkLevel('masroor-schedule');
    // Intercept leaves out just that picture (and so its shadow); the night levels keep it.
    expect(intercept.sprites.filter(under)).toEqual([]);
    expect(intercept.sprites).toHaveLength(map.sprites.length - 1);
    expect(schedule.sprites.filter(under)).toHaveLength(1);
    expect(intercept.vehicles.map((v) => [v.key, v.x, v.y])).toEqual([['walk_t33', start.x, start.y]]);
    // The colliders are the same in every Masroor level, the parked jet's footprint included.
    expect(intercept.blocks).toEqual(schedule.blocks);
    for (const f of spriteFootprints(map, parked[0])) expect(intercept.blocks).toContainEqual(expect.objectContaining(f));
  });

  it('draws the watchtower guard above his tower', () => {
    // He stands inside the tower's picture, whose bottom is below his feet, so
    // y-sorting alone would hide him: he is marked elevated.
    const tower = makeWalkLevel('masroor-schedule').sprites.find(
      (s) => s.key === 'walk_watchtower' && s.x <= WATCHTOWER.x && WATCHTOWER.x <= s.x + s.w && s.y - s.h <= WATCHTOWER.y && WATCHTOWER.y <= s.y,
    );
    expect(tower?.sortY).toBeGreaterThan(WATCHTOWER.y);
    const level = makeWalkLevel('masroor-schedule');
    const w = new WalkWorld(level.map());
    level.setup(w);
    expect(w.actor(WATCHTOWER.id).elevated).toBe(true);
    expect(w.player.elevated).toBe(false);
  });
});

describe('Masroor map checks', () => {
  /** The real map's JSON, changed by `edit`. */
  const edited = (edit: (j: Record<string, any>) => void): unknown => {
    const j = JSON.parse(raw);
    edit(j);
    return j;
  };

  it('accepts the real map: tiles cover 2480 x 1888 px, the world is the top 2480 x 1880', () => {
    const m = readMasroorMap(JSON.parse(raw));
    expect([m.width * m.tilewidth, m.height * m.tileheight]).toEqual([2480, 1888]);
    expect([prop(m.props, 'worldWidth', 0), prop(m.props, 'worldHeight', 0)]).toEqual([2480, 1880]);
    const level = makeWalkLevel('masroor-schedule').map();
    expect([level.width, level.height]).toEqual([2480, 1880]);
  });

  it('refuses a map whose tiles fall short of the world', () => {
    expect(() => readMasroorMap(edited((j) => (j.tilewidth = 15)))).toThrow(/155 x 118 tiles of 15 x 16 px cover 2325 x 1888 px, less than the 2480 x 1880 world/);
    expect(() => readMasroorMap(edited((j) => (j.tileheight = 15)))).toThrow(/cover 2480 x 1770 px, less than the 2480 x 1880 world/);
  });

  it('refuses a map made for another world size', () => {
    const world = (j: Record<string, any>) => j.properties.find((p: { name: string }) => p.name === 'worldHeight');
    expect(() => readMasroorMap(edited((j) => (world(j).value = 1888)))).toThrow(/worldWidth x worldHeight is 2480 x 1888, the level needs 2480 x 1880/);
  });
});
