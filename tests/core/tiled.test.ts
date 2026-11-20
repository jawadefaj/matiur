// The Tiled map reader: where objects sit, what collides, and the errors that
// stop a broken map from loading. Maps here are small ones built by hand.
import { describe, expect, it } from 'vitest';
import {
  FLIP_D,
  FLIP_H,
  FLIP_HEX,
  FLIP_V,
  blockedTileRects,
  collisionRects,
  parseTiledMap,
  polylinePosts,
  prop,
  rectCollides,
  spriteFootprints,
  tileOf,
  type TiledRect,
} from '../../src/core/tiled';
import { sceneryFromMap } from '../../src/mechanics/walk/mapScenery';

// Raw Tiled JSON: loosely typed on purpose, the parser is what checks it.
type J = Record<string, any>;

const FINAL = '../../../../assets/sprites/final';

/** A Tiled property. */
const P = (name: string, value: boolean | number | string): J => ({
  name,
  type: typeof value === 'boolean' ? 'bool' : typeof value === 'number' ? 'int' : 'string',
  value,
});

/** A 4-tile atlas (2x2 tiles of 16 px). The local ids in `blocked` are walkable: false. */
function atlas(name: string, firstgid: number, blocked: number[] = []): J {
  return {
    name,
    firstgid,
    image: `${FINAL}/tiles/${name}.png`,
    imagewidth: 36,
    imageheight: 36,
    tilewidth: 16,
    tileheight: 16,
    margin: 1,
    spacing: 2,
    columns: 2,
    tilecount: 4,
    tiles: [0, 1, 2, 3].map((id) => ({ id, properties: [P('walkable', !blocked.includes(id))] })),
  };
}

interface ObjTile {
  key: string;
  w: number;
  h: number;
  /** Footprint [x, y, w, h] in image px. */
  foot?: [number, number, number, number];
  props?: J[];
}

/** An image-collection tileset, one PNG per tile, like walk_objects. */
function collection(firstgid: number, tiles: ObjTile[]): J {
  return {
    name: 'walk_objects',
    firstgid,
    columns: 0,
    margin: 0,
    spacing: 0,
    grid: { orientation: 'orthogonal', width: 1, height: 1 },
    tilewidth: Math.max(...tiles.map((t) => t.w)),
    tileheight: Math.max(...tiles.map((t) => t.h)),
    tilecount: tiles.length,
    tiles: tiles.map((t, id) => ({
      id,
      image: `${FINAL}/objects/${t.key}.png`,
      imagewidth: t.w,
      imageheight: t.h,
      properties: [...(t.props ?? [])],
      ...(t.foot && {
        objectgroup: {
          type: 'objectgroup',
          name: '',
          draworder: 'index',
          id: 2,
          opacity: 1,
          visible: true,
          x: 0,
          y: 0,
          objects: [{ id: 1, name: 'footprint', type: '', x: t.foot[0], y: t.foot[1], width: t.foot[2], height: t.foot[3], rotation: 0, visible: true }],
        },
      }),
    })),
  };
}

function tileLayer(id: number, name: string, data: number[], width = 4, height = 2): J {
  return { type: 'tilelayer', id, name, width, height, x: 0, y: 0, opacity: 1, visible: true, data: [...data] };
}

function objectLayer(id: number, name: string, objects: J[]): J {
  return { type: 'objectgroup', id, name, draworder: 'topdown', opacity: 1, visible: true, x: 0, y: 0, objects };
}

/** A tile object: x = left, y = bottom. */
function tileObject(id: number, gid: number, name: string, x: number, y: number, w: number, h: number, properties?: J[]): J {
  return { id, gid, name, type: '', x, y, width: w, height: h, rotation: 0, visible: true, ...(properties && { properties }) };
}

function rectObject(id: number, x: number, y: number, w: number, h: number, properties?: J[]): J {
  return { id, name: '', type: '', x, y, width: w, height: h, rotation: 0, visible: true, ...(properties && { properties }) };
}

function polylineObject(id: number, x: number, y: number, rel: [number, number][], properties?: J[]): J {
  return { id, name: 'wall', type: '', x, y, width: 0, height: 0, rotation: 0, visible: true, polyline: rel.map(([px, py]) => ({ x: px, y: py })), ...(properties && { properties }) };
}

function pointObject(id: number, name: string, x: number, y: number): J {
  return { id, name, type: '', x, y, width: 0, height: 0, rotation: 0, visible: true, point: true };
}

function tiledMap(tilesets: J[], layers: J[], width = 4, height = 2): J {
  return {
    type: 'map',
    version: '1.10',
    tiledversion: '1.10.2',
    orientation: 'orthogonal',
    renderorder: 'right-down',
    infinite: false,
    width,
    height,
    tilewidth: 16,
    tileheight: 16,
    nextlayerid: layers.length + 1,
    nextobjectid: 100,
    properties: [P('worldWidth', 64), P('legacy', true)],
    tilesets,
    layers,
  };
}

// The objects tileset used below starts at gid 9 (after two 4-tile atlases).
const HOUSE = 9; // 40x30, footprint (4, 10) 32x20
const TREE = 10; // 20x30, footprint (2, 24) 4x6, tile props sort/shadow
const POND = 11; // 30x20, footprint (0, 0) 30x20, tile prop solid: false
const OBJ_TILES: ObjTile[] = [
  { key: 'walk_house_1', w: 40, h: 30, foot: [4, 10, 32, 20], props: [P('sort', 'ysort'), P('shadow', true)] },
  { key: 'walk_tree', w: 20, h: 30, foot: [2, 24, 4, 6], props: [P('sort', 'ysort'), P('shadow', true)] },
  { key: 'walk_pond', w: 30, h: 20, foot: [0, 0, 30, 20], props: [P('sort', 'flat'), P('solid', false)] },
];
// Ground atlas: local 3 (gid 4) blocks. Paint atlas: local 3 (gid 8) blocks.
const GROUND_DATA = [1, 4, 4 | FLIP_H, 1, 4, 1, 1, 4].map((g) => g >>> 0);
const PAINT_DATA = [0, 0, 0, 8, 0, 0, 0, 0];

/**
 * One of everything: two tile layers, objects of every kind across three object
 * layers. Rectangle 2 blocks off the collision layer because it says solid: true;
 * rectangle 10 is a zone on the markers layer and never blocks.
 */
function fullMap(): J {
  return tiledMap(
    [atlas('walk_tiles_ground', 1, [3]), atlas('walk_tiles_paint', 5, [3]), collection(9, OBJ_TILES)],
    [
      tileLayer(1, 'ground', GROUND_DATA),
      tileLayer(2, 'paint', PAINT_DATA),
      objectLayer(3, 'objects', [
        tileObject(1, HOUSE, 'house', 100, 200, 40, 30),
        rectObject(2, 10, 20, 30, 40, [P('solid', true)]),
        polylineObject(3, 0, 50, [[0, 0], [8, 0]], [P('step', 4), P('postW', 2), P('postH', 2), P('postDX', -1), P('postDY', -1)]),
        pointObject(4, 'door', 5, 6),
        tileObject(5, (TREE | FLIP_H) >>> 0, 'tree', 300, 400, 20, 30, [P('shadow', false)]),
        tileObject(6, POND, 'pond', 500, 600, 30, 20),
      ]),
      objectLayer(4, 'collision', [rectObject(7, 1, 2, 3, 4, [P('solid', false)]), rectObject(8, 50, 60, 5, 5)]),
      objectLayer(5, 'markers', [pointObject(9, 'home', 70, 80), rectObject(10, 0, 0, 40, 40)]),
    ],
  );
}

/** Little-endian uint32 cells as base64, like Tiled's uncompressed base64 format. */
function base64(cells: number[]): string {
  let s = '';
  for (const c of cells) s += String.fromCharCode(c & 0xff, (c >>> 8) & 0xff, (c >>> 16) & 0xff, (c >>> 24) & 0xff);
  return btoa(s);
}

describe('parseTiledMap', () => {
  it('reads the map, its tilesets and layers', () => {
    const map = parseTiledMap(fullMap());
    expect([map.width, map.height, map.tilewidth, map.tileheight]).toEqual([4, 2, 16, 16]);
    expect(map.props).toEqual({ worldWidth: 64, legacy: true });
    expect(map.tilesets.map((t) => [t.name, t.kind, t.key, t.firstgid])).toEqual([
      ['walk_tiles_ground', 'atlas', 'walk_tiles_ground', 1],
      ['walk_tiles_paint', 'atlas', 'walk_tiles_paint', 5],
      ['walk_objects', 'collection', '', 9],
    ]);
    const objects = map.tilesets[2];
    expect(objects.tiles.get(0)).toMatchObject({ key: 'walk_house_1', imagewidth: 40, imageheight: 30, footprints: [{ x: 4, y: 10, w: 32, h: 20 }] });
    expect(map.tileLayers.map((l) => [l.name, l.data.length])).toEqual([
      ['ground', 8],
      ['paint', 8],
    ]);
    // Raw gids are kept, flip bits and all.
    expect(map.tileLayers[0].data[2]).toBe(0x80000004);
    expect(map.objects.map((o) => `${o.kind}:${o.id}`)).toEqual(['sprite:1', 'rect:2', 'polyline:3', 'point:4', 'sprite:5', 'sprite:6', 'rect:7', 'rect:8', 'point:9', 'rect:10']);
    expect(map.objects.every((o) => o.visible)).toBe(true);
    expect(map.sprites.map((s) => s.id)).toEqual([1, 5, 6]);
    expect(map.rects.map((r) => [r.id, r.layer])).toEqual([
      [2, 'objects'],
      [7, 'collision'],
      [8, 'collision'],
      [10, 'markers'],
    ]);
    expect(map.polylines.map((p) => p.id)).toEqual([3]);
    expect(map.points.map((p) => [p.name, p.x, p.y, p.layer])).toEqual([
      ['door', 5, 6, 'objects'],
      ['home', 70, 80, 'markers'],
    ]);
  });

  it('anchors tile objects at their bottom-left corner', () => {
    const house = parseTiledMap(fullMap()).sprites[0];
    expect(house).toMatchObject({ key: 'walk_house_1', name: 'house', layer: 'objects', x: 100, y: 200, w: 40, h: 30, gid: HOUSE, flipX: false });
  });

  it("overlays the object's own properties on its tile's", () => {
    const [house, tree, pond] = parseTiledMap(fullMap()).sprites;
    expect(house.props).toEqual({ sort: 'ysort', shadow: true });
    expect(tree.props).toEqual({ sort: 'ysort', shadow: false });
    expect(pond.props).toEqual({ sort: 'flat', solid: false });
  });

  it('reads a left-right flip from the gid', () => {
    const tree = parseTiledMap(fullMap()).sprites[1];
    expect([tree.gid, tree.flipX, tree.key]).toEqual([TREE, true, 'walk_tree']);
  });

  it('turns relative polyline points into map points', () => {
    const m = tiledMap([], [objectLayer(1, 'collision', [polylineObject(1, 100, 50, [[0, 0], [10, -5], [3, 20]])])]);
    const line = parseTiledMap(m).polylines[0];
    expect(line.points).toEqual([
      { x: 100, y: 50 },
      { x: 110, y: 45 },
      { x: 103, y: 70 },
    ]);
    expect(line.closed).toBe(false);
  });

  it('reads polygons as closed polylines', () => {
    const poly = { ...rectObject(1, 10, 10, 0, 0), polygon: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }] };
    const line = parseTiledMap(tiledMap([], [objectLayer(1, 'a', [poly])])).polylines[0];
    expect(line.points).toEqual([
      { x: 10, y: 10 },
      { x: 14, y: 10 },
      { x: 14, y: 14 },
    ]);
    expect(line.closed).toBe(true);
  });

  it('reads tile data saved as uncompressed base64', () => {
    const m = fullMap();
    m.layers[0] = { ...m.layers[0], encoding: 'base64', data: base64(GROUND_DATA) };
    const map = parseTiledMap(m);
    expect(map.tileLayers[0].data).toEqual(GROUND_DATA);
    expect(collisionRects(map)).toEqual(collisionRects(parseTiledMap(fullMap())));
  });

  it('opens group layers in place, keeping the file order', () => {
    const m = tiledMap(
      [],
      [
        objectLayer(1, 'a', [rectObject(1, 0, 0, 1, 1)]),
        { type: 'group', id: 2, name: 'g', layers: [objectLayer(3, 'b', [rectObject(2, 0, 0, 2, 2)])] },
        { type: 'imagelayer', id: 4, name: 'pic', image: 'x.png' },
        objectLayer(5, 'c', [rectObject(3, 0, 0, 3, 3)]),
      ],
    );
    expect(parseTiledMap(m).objects.map((o) => [o.id, o.layer])).toEqual([
      [1, 'a'],
      [2, 'b'],
      [3, 'c'],
    ]);
  });
});

describe('tileOf', () => {
  const map = parseTiledMap(fullMap());

  it('finds the tileset and local id, ignoring flip bits', () => {
    for (const flip of [0, FLIP_H, FLIP_V, FLIP_D, FLIP_HEX]) {
      const ref = tileOf(map, (6 | flip) >>> 0);
      expect([ref.tileset.name, ref.localId]).toEqual(['walk_tiles_paint', 1]);
    }
    expect(tileOf(map, TREE).tile.key).toBe('walk_tree');
    expect(tileOf(map, 4).tile.props).toEqual({ walkable: false });
  });

  it('throws for an empty cell or a gid no tileset has', () => {
    expect(() => tileOf(map, 0)).toThrow(/unknown gid 0/);
    expect(() => tileOf(map, 12)).toThrow(/unknown gid 12/);
  });
});

describe('spriteFootprints', () => {
  const map = parseTiledMap(fullMap());
  const [house, tree, pond] = map.sprites;

  it("places the tile's footprint from the object's top-left", () => {
    // top = bottom - h = 200 - 30 = 170
    expect(spriteFootprints(map, house)).toEqual([{ x: 104, y: 180, w: 32, h: 20 }]);
  });

  it('mirrors the footprint when the object is flipped', () => {
    // top = 400 - 30 = 370; mirrored x = 300 + (20 - 2 - 4) = 314
    expect(spriteFootprints(map, tree)).toEqual([{ x: 314, y: 394, w: 4, h: 6 }]);
    expect(spriteFootprints(map, { ...tree, flipX: false })).toEqual([{ x: 302, y: 394, w: 4, h: 6 }]);
  });

  it('gives nothing when solid is false (on the tile or the object)', () => {
    expect(spriteFootprints(map, pond)).toEqual([]);
    expect(spriteFootprints(map, { ...house, props: { ...house.props, solid: false } })).toEqual([]);
    // The object can switch its tile back on.
    expect(spriteFootprints(map, { ...pond, props: { ...pond.props, solid: true } })).toEqual([{ x: 500, y: 580, w: 30, h: 20 }]);
  });

  it('refuses an object drawn at another size than its picture', () => {
    expect(() => spriteFootprints(map, { ...house, w: 80 })).toThrow(/art\.py build-map masroor --refit-objects/);
  });
});

describe('polylinePosts', () => {
  it('places a post every `step` px, counting shared corners twice', () => {
    const posts = polylinePosts(
      [
        { x: 0, y: 0 },
        { x: 8, y: 0 },
        { x: 8, y: 3 },
      ],
      4,
      2,
      2,
      -1,
      -1,
    );
    // Segment 1 (n = 8): i = 0, 4, 8. Segment 2 (n = 3): i = 0 only.
    expect(posts).toEqual([
      { x: -1, y: -1, w: 2, h: 2 },
      { x: 3, y: -1, w: 2, h: 2 },
      { x: 7, y: -1, w: 2, h: 2 },
      { x: 7, y: -1, w: 2, h: 2 },
    ]);
  });

  it('truncates toward zero like Python int()', () => {
    // i = 5 of n = 10: y = 2.5 -> 2.
    expect(polylinePosts([{ x: 0, y: 0 }, { x: 10, y: 5 }], 5, 1, 1, 0, 0).map((r) => [r.x, r.y])).toEqual([
      [0, 0],
      [5, 2],
      [10, 5],
    ]);
    // Going negative: -0.6 -> 0 and -1.8 -> -1 (floor would give -1 and -2).
    expect(polylinePosts([{ x: 0, y: 0 }, { x: -3, y: -5 }], 1, 1, 1, 10, 10).map((r) => [r.x, r.y])).toEqual([
      [10, 10],
      [10, 9],
      [9, 8],
      [9, 7],
      [8, 6],
      [7, 5],
    ]);
  });

  it('skips segments shorter than 1 px', () => {
    expect(polylinePosts([{ x: 5, y: 5 }, { x: 5, y: 5 }, { x: 5.5, y: 5.25 }], 1, 1, 1, 0, 0)).toEqual([]);
    expect(polylinePosts([{ x: 5, y: 5 }, { x: 5, y: 5 }, { x: 8, y: 5 }], 1, 1, 1, 0, 0)).toHaveLength(4);
  });

  it('refuses a step that is not a whole number of 1 or more', () => {
    expect(() => polylinePosts([], 0, 1, 1, 0, 0)).toThrow(/step/);
    expect(() => polylinePosts([], 2.5, 1, 1, 0, 0)).toThrow(/step/);
  });

  // The Masroor perimeter wall, in master-map-region px (x4 = world px), and
  // the loop from the old build_masroor_map.py, ported line for line.
  const WALL: [number, number][] = [[620, 306], [600, 325], [588, 345], [578, 370], [572, 395], [566, 428], [530, 435], [500, 440], [478, 450], [470, 470]];
  function legacyWallPosts(): TiledRect[] {
    const S = 4;
    const solids: TiledRect[] = [];
    for (let k = 0; k + 1 < WALL.length; k++) {
      const [ax, ay] = WALL[k];
      const [bx, by] = WALL[k + 1];
      const n = Math.trunc(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * S);
      for (let i = 0; i < n + 1; i++) {
        const px = Math.trunc((ax + ((bx - ax) * i) / n) * S);
        const py = Math.trunc((ay + ((by - ay) * i) / n) * S);
        if (i % 4 === 0) solids.push({ x: px - 4, y: py - 6, w: 8, h: 8 });
      }
    }
    return solids;
  }
  const world = WALL.map(([x, y]) => ({ x: x * 4, y: y * 4 }));

  it('matches the old map builder on the Masroor wall (240 posts)', () => {
    const legacy = legacyWallPosts();
    expect(legacy).toHaveLength(240);
    expect(polylinePosts(world, 4, 8, 8, -4, -6)).toEqual(legacy);
  });

  it('matches it from a wall polyline saved in a map, too', () => {
    const [first] = world;
    const wall = polylineObject(
      1,
      first.x,
      first.y,
      world.map((p): [number, number] => [p.x - first.x, p.y - first.y]),
      [P('step', 4), P('postW', 8), P('postH', 8), P('postDX', -4), P('postDY', -6), P('texture', 'walk_wall')],
    );
    const map = parseTiledMap(tiledMap([], [objectLayer(4, 'collision', [wall])], 155, 118));
    expect(collisionRects(map)).toEqual(legacyWallPosts());
    // Without the post sizes it falls back to the same old values.
    const bare = { ...wall, properties: [P('step', 4)] };
    expect(collisionRects(parseTiledMap(tiledMap([], [objectLayer(4, 'collision', [bare])], 155, 118)))).toEqual(legacyWallPosts());
  });
});

describe('blockedTileRects', () => {
  it('joins blocked cells into runs along each row, layer by layer', () => {
    // ground: row 0 = . X X .   row 1 = X . . X   (the second X is flipped: still blocked)
    // paint:  row 0 = . . . X
    expect(blockedTileRects(parseTiledMap(fullMap()))).toEqual([
      { x: 16, y: 0, w: 32, h: 16 },
      { x: 0, y: 16, w: 16, h: 16 },
      { x: 48, y: 16, w: 16, h: 16 },
      { x: 48, y: 0, w: 16, h: 16 },
    ]);
  });

  it('treats a tile with no walkable property as walkable', () => {
    const m = fullMap();
    m.tilesets[0].tiles = [];
    m.layers[1].data = PAINT_DATA.map(() => 0);
    expect(blockedTileRects(parseTiledMap(m))).toEqual([]);
  });

  it('runs to the end of a row', () => {
    const m = tiledMap([atlas('walk_tiles_ground', 1, [3])], [tileLayer(1, 'ground', [4, 4, 4, 4, 1, 4, 4, 4])]);
    expect(blockedTileRects(parseTiledMap(m))).toEqual([
      { x: 0, y: 0, w: 64, h: 16 },
      { x: 16, y: 16, w: 48, h: 16 },
    ]);
  });
});

describe('collisionRects', () => {
  it('lists objects in file order, then blocked tiles', () => {
    expect(collisionRects(parseTiledMap(fullMap()))).toEqual([
      { x: 104, y: 180, w: 32, h: 20 }, // house (object 1)
      { x: 10, y: 20, w: 30, h: 40 }, // rectangle (object 2, solid: true)
      { x: -1, y: 49, w: 2, h: 2 }, // wall posts (object 3)
      { x: 3, y: 49, w: 2, h: 2 },
      { x: 7, y: 49, w: 2, h: 2 },
      { x: 314, y: 394, w: 4, h: 6 }, // flipped tree (object 5); the door point and the pond add nothing
      { x: 50, y: 60, w: 5, h: 5 }, // rectangle (object 8); object 7 has solid: false; zone 10 is on markers
      { x: 16, y: 0, w: 32, h: 16 }, // blocked ground
      { x: 0, y: 16, w: 16, h: 16 },
      { x: 48, y: 16, w: 16, h: 16 },
      { x: 48, y: 0, w: 16, h: 16 }, // blocked paint
    ]);
  });

  it('ignores polylines without a step, and closes polygon walls', () => {
    const plain = polylineObject(1, 0, 0, [[0, 0], [8, 0]]);
    const loop = { ...rectObject(2, 0, 0, 0, 0), polygon: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }], properties: [P('step', 4), P('postW', 1), P('postH', 1), P('postDX', 0), P('postDY', 0)] };
    const map = parseTiledMap(tiledMap([], [objectLayer(1, 'collision', [plain, loop])]));
    expect(collisionRects(map).map((r) => [r.x, r.y])).toEqual([
      [0, 0],
      [4, 0],
      [4, 0],
      [4, 4],
      [4, 4],
      [0, 0],
    ]);
  });

  it("blocks a rectangle only on the 'collision' layer or with solid: true", () => {
    const map = parseTiledMap(
      tiledMap(
        [],
        [
          objectLayer(1, 'collision', [rectObject(1, 0, 0, 1, 1), rectObject(2, 0, 0, 2, 2, [P('solid', false)]), rectObject(3, 0, 0, 3, 3, [P('solid', true)])]),
          objectLayer(2, 'markers', [rectObject(4, 0, 0, 4, 4), rectObject(5, 0, 0, 5, 5, [P('solid', true)]), rectObject(6, 0, 0, 6, 6, [P('solid', false)])]),
          objectLayer(3, 'objects', [rectObject(7, 0, 0, 7, 7)]),
        ],
      ),
    );
    expect(map.rects.map((r) => [r.id, rectCollides(r)])).toEqual([
      [1, true],
      [2, false],
      [3, true],
      [4, false], // a zone, not a wall
      [5, true],
      [6, false],
      [7, false],
    ]);
    expect(collisionRects(map).map((r) => r.w)).toEqual([1, 3, 5]);
  });

  it('refuses a no-go rectangle with no size, naming it', () => {
    for (const [w, h] of [
      [0, 10],
      [10, 0],
      [0, 0],
      [-4, 10],
    ]) {
      const map = parseTiledMap(tiledMap([], [objectLayer(1, 'collision', [{ ...rectObject(12, 5, 5, w, h), name: 'gate' }])]));
      expect(() => collisionRects(map)).toThrow(`object 12 ("gate") on layer "collision" is a no-go rectangle of ${w}x${h} px`);
    }
    // Rectangles that don't block may have no size (a zone drawn by a click).
    const zones = parseTiledMap(
      tiledMap(
        [],
        [objectLayer(1, 'markers', [rectObject(1, 5, 5, 0, 0)]), objectLayer(2, 'collision', [rectObject(2, 5, 5, 0, 0, [P('solid', false)]), { ...rectObject(3, 5, 5, 0, 0), visible: false }])],
      ),
    );
    expect(collisionRects(zones)).toEqual([]);
  });

  it('ignores every object hidden in Tiled (visible: false)', () => {
    const hide = (o: J): J => ({ ...o, visible: false });
    const wall = polylineObject(3, 0, 50, [[0, 0], [8, 0]], [P('step', 4), P('texture', 'walk_wall')]);
    const m = tiledMap(
      [collection(1, OBJ_TILES)],
      [objectLayer(1, 'objects', [hide(tileObject(1, 1, 'house', 100, 200, 40, 30)), tileObject(2, 1, 'house', 0, 30, 40, 30)]), objectLayer(2, 'collision', [hide(rectObject(4, 0, 0, 9, 9)), hide(wall)])],
    );
    const map = parseTiledMap(m);
    // Still read, so tools can see them, but marked hidden.
    expect(map.objects.map((o) => [o.id, o.visible])).toEqual([
      [1, false],
      [2, true],
      [4, false],
      [3, false],
    ]);
    // Only the shown house collides...
    expect(collisionRects(map)).toEqual([{ x: 4, y: 10, w: 32, h: 20 }]);
    // ...and only it is drawn; the hidden wall isn't either.
    const scenery = sceneryFromMap('test', m, map);
    expect(scenery.sprites.map((s) => [s.x, s.y])).toEqual([[0, 30]]);
    expect(scenery.wallLines).toEqual([]);
    // Shown again, the wall is drawn and blocks.
    const shown = parseTiledMap(tiledMap([], [objectLayer(2, 'collision', [wall])]));
    expect(sceneryFromMap('test', {}, shown).wallLines.map((l) => l.key)).toEqual(['walk_wall']);
    expect(collisionRects(shown)).toHaveLength(3);
  });
});

describe('prop', () => {
  const props = { solid: false, step: 4, texture: 'walk_wall' };

  it('returns the value, or the fallback when unset', () => {
    expect(prop(props, 'solid', true)).toBe(false);
    expect(prop(props, 'step', 1)).toBe(4);
    expect(prop(props, 'texture', '')).toBe('walk_wall');
    expect(prop(props, 'missing', 7)).toBe(7);
  });

  it('throws when the value has another type', () => {
    expect(() => prop(props, 'texture', 1)).toThrow(/"texture" should be a number/);
  });
});

describe('errors', () => {
  /** fullMap() changed by `edit`, which must stop it loading with a message matching `msg`. */
  const cases: [string, (m: J) => void, RegExp][] = [
    ['not an object', (m) => Object.assign(m, { layers: [7] }), /a layer should be a JSON object/],
    ['an infinite map', (m) => (m.infinite = true), /infinite/],
    ['a tile layer in chunks', (m) => (m.layers[0].chunks = []), /layer "ground" \(id 1\).*chunks/],
    ['an isometric map', (m) => (m.orientation = 'isometric'), /orthogonal/],
    ['an external tileset', (m) => (m.tilesets[2] = { firstgid: 9, source: 'objects.tsj' }), /firstgid 9 is external \(objects\.tsj\).*Embed Tileset/],
    ['a compressed layer', (m) => Object.assign(m.layers[0], { encoding: 'base64', compression: 'zlib', data: 'eJw=' }), /layer "ground" \(id 1\) is compressed \(zlib\)/],
    ['base64 of the wrong length', (m) => Object.assign(m.layers[0], { encoding: 'base64', data: base64([1, 1]) }), /layer "ground" \(id 1\) has 2 cells, expected 8/],
    ['too few cells', (m) => (m.layers[0].data = [1, 1]), /layer "ground" \(id 1\) has 2 cells, expected 8/],
    ['a cell that is not a gid', (m) => (m.layers[0].data[3] = 'x'), /layer "ground" \(id 1\) has a cell that isn't a gid/],
    ['a layer of another size', (m) => (m.layers[1].width = 3), /layer "paint" \(id 2\) is 3x2 tiles but the map is 4x2/],
    ['an unknown gid in a tile layer', (m) => (m.layers[1].data[5] = 12), /layer "paint" \(id 2\) cell \(1, 1\) uses unknown gid 12/],
    ['an unknown gid on an object', (m) => (m.layers[2].objects[0].gid = 40), /object 1 in layer "objects" \(id 3\) uses unknown gid 40/],
    ['a rotated object', (m) => (m.layers[2].objects[1].rotation = 15), /object 2 in layer "objects" \(id 3\) is rotated 15/],
    ['a vertical flip', (m) => (m.layers[2].objects[0].gid = (HOUSE | FLIP_V) >>> 0), /object 1 in layer "objects" \(id 3\) is flipped vertically/],
    ['a diagonal flip', (m) => (m.layers[2].objects[0].gid = (HOUSE | FLIP_D) >>> 0), /object 1 .* is flipped vertically or turned/],
    ['a hex rotation', (m) => (m.layers[2].objects[0].gid = (HOUSE | FLIP_HEX) >>> 0), /object 1 .* is flipped vertically or turned/],
    ['a resized object', (m) => (m.layers[2].objects[4].width = 40), /object 5 \("tree"\) is 40x30 but its picture walk_tree\.png is 20x30.*python scripts\/art\/art\.py build-map masroor --refit-objects/],
    ['an atlas tile as an object', (m) => (m.layers[2].objects[0] = tileObject(1, 2, 'x', 0, 16, 16, 16)), /object 1 .* is a tile from the atlas "walk_tiles_ground"/],
    ['a template instance', (m) => (m.layers[2].objects[1].template = 'house.tx'), /object 2 .* comes from a template/],
    ['an offset layer', (m) => (m.layers[3].offsetx = 8), /layer "collision" \(id 4\) is offset/],
    ['an unknown layer type', (m) => (m.layers[3].type = 'weird'), /layer "collision" \(id 4\) has an unknown type "weird"/],
    ['a step that is text', (m) => (m.layers[2].objects[2].properties[0] = { name: 'step', type: 'string', value: '4' }), /object 3 .* property "step" should be a number/],
    ['a step of 0', (m) => (m.layers[2].objects[2].properties[0] = P('step', 0)), /object 3 .* has step 0/],
    ['solid that is text', (m) => (m.layers[3].objects[0].properties = [{ name: 'solid', type: 'string', value: 'false' }]), /object 7 .* property "solid" should be a bool/],
    ['walkable that is text', (m) => (m.tilesets[0].tiles[1].properties = [{ name: 'walkable', type: 'string', value: 'no' }]), /tile 1 of tileset "walk_tiles_ground": property "walkable" should be a bool/],
    ['a non-PNG image', (m) => (m.tilesets[2].tiles[1].image = 'objects/walk_tree.jpg'), /tile 1 of tileset "walk_objects" uses objects\/walk_tree\.jpg, which isn't a PNG/],
    ['a collection tile with no image', (m) => delete m.tilesets[2].tiles[1].image, /tile 1 of tileset "walk_objects" has no image/],
    ['a footprint that is not a rectangle', (m) => (m.tilesets[2].tiles[0].objectgroup.objects[0].ellipse = true), /collision shape 1 of tile 0 of tileset "walk_objects" isn't a rectangle/],
    ['a rotated footprint', (m) => (m.tilesets[2].tiles[0].objectgroup.objects[0].rotation = 90), /collision shape 1 of tile 0 .* is rotated/],
    ['objects anchored elsewhere', (m) => (m.tilesets[2].objectalignment = 'center'), /tileset "walk_objects" anchors objects at "center"/],
  ];

  it('loads the unchanged map', () => {
    expect(() => parseTiledMap(fullMap())).not.toThrow();
  });

  for (const [what, edit, msg] of cases) {
    it(`refuses ${what}`, () => {
      const m = fullMap();
      edit(m);
      expect(() => parseTiledMap(m)).toThrow(msg);
    });
  }

  it('refuses something that is not a map at all', () => {
    expect(() => parseTiledMap(null)).toThrow(/The file should be a JSON object/);
    expect(() => parseTiledMap([])).toThrow(/The file should be a JSON object/);
  });
});
