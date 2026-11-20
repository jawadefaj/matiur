// Reads maps saved by the Tiled editor (JSON, .tmj) and works out what the
// player can't walk through. No Phaser here, so it runs in tests.
//
// What a map holds:
// - tile layers ('ground', 'paint'): cells drawn from atlas tilesets. A tile
//   whose `walkable` property is false blocks the player (missing = walkable).
// - tile objects (houses, trees, jets...): one PNG each, from an image-collection
//   tileset. x is the left edge and y the BOTTOM edge (Tiled's anchor). The
//   footprint rectangles drawn on the tile in Tiled's collision editor are its
//   colliders. An object with the property `solid: false` never collides.
// - rectangle objects: no-go areas, blocked as drawn, when they are on the
//   object layer named 'collision' or have the property `solid: true`. A
//   rectangle on another layer (a zone on 'markers') never collides, nor does
//   one with `solid: false`. A blocking rectangle must have a size.
// - polylines with a whole-number `step` property: walls, blocked by a row of
//   small posts placed exactly as the old map builder placed them.
// - point objects: markers (doors, spawn points). They never collide.
// An object hidden in Tiled (its eye switched off, `visible: false`) is read
// but ignored: it has no collider and is not drawn.
// scripts/art/tmj.py reads maps the same way: change both together.

/** A rectangle in px: top-left corner and size. */
export interface TiledRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A position in px. */
export interface TiledXY {
  x: number;
  y: number;
}

/** Custom properties by name. Tiled saves them as [{name, type, value}]. */
export type TiledProps = Record<string, unknown>;

/** One tile of a tileset. */
export interface TiledTile {
  props: TiledProps;
  /** Collection tiles only: the image path as saved in the map. */
  image?: string;
  /** Collection tiles only: the texture key (image file name without .png). */
  key?: string;
  imagewidth?: number;
  imageheight?: number;
  /** Rectangles drawn in Tiled's tile collision editor, in px from the image's top-left. */
  footprints: TiledRect[];
}

/** A tileset embedded in the map. */
export interface TiledTileset {
  name: string;
  firstgid: number;
  /** 'atlas' = one image cut into a grid; 'collection' = one image per tile. */
  kind: 'atlas' | 'collection';
  /** Atlas: texture key (image file name without .png). Collection: '' (each tile has its own key). */
  key: string;
  image?: string;
  imagewidth: number;
  imageheight: number;
  tilewidth: number;
  tileheight: number;
  margin: number;
  spacing: number;
  columns: number;
  tilecount: number;
  /** Local tile id -> tile. An atlas has an entry for every tile. */
  tiles: Map<number, TiledTile>;
}

/** A tile object: one picture placed on the map. */
export interface TiledSprite {
  kind: 'sprite';
  id: number;
  /** The tile's gid, without the flip bits. */
  gid: number;
  /** Texture key of the picture. */
  key: string;
  /** What it is, e.g. 'house'. */
  name: string;
  /** Name of the object layer it is on. */
  layer: string;
  /** False when hidden in Tiled: the game then ignores it (no collider, not drawn). */
  visible: boolean;
  /** Left edge. */
  x: number;
  /** BOTTOM edge (Tiled anchors tile objects at their bottom-left corner). */
  y: number;
  w: number;
  h: number;
  /** Mirrored left-right. */
  flipX: boolean;
  /** The tile's properties, overridden by this object's own. */
  props: TiledProps;
}

/** A plain rectangle object: a no-go area if rectCollides() says so, else a zone. */
export interface TiledRectObject extends TiledRect {
  kind: 'rect';
  id: number;
  name: string;
  layer: string;
  visible: boolean;
  props: TiledProps;
}

/** A polyline (or a polygon, `closed`), with its points in map px. */
export interface TiledPolyline {
  kind: 'polyline';
  id: number;
  name: string;
  layer: string;
  visible: boolean;
  /** Absolute points (Tiled saves them relative to the object's x, y). */
  points: TiledXY[];
  /** A polygon: the last point joins back to the first. */
  closed: boolean;
  props: TiledProps;
}

/** A point object: a marker. */
export interface TiledPoint {
  kind: 'point';
  id: number;
  name: string;
  layer: string;
  visible: boolean;
  x: number;
  y: number;
  props: TiledProps;
}

export type TiledObject = TiledSprite | TiledRectObject | TiledPolyline | TiledPoint;

/** A tile layer: one gid per cell, row by row. */
export interface TiledTileLayer {
  id: number;
  name: string;
  width: number;
  height: number;
  /** Raw gids, flip bits included. 0 = empty cell. */
  data: number[];
  props: TiledProps;
}

export interface TiledMap {
  /** Size in tiles. */
  width: number;
  height: number;
  /** Size of one tile in px. */
  tilewidth: number;
  tileheight: number;
  props: TiledProps;
  /** In firstgid order. */
  tilesets: TiledTileset[];
  tileLayers: TiledTileLayer[];
  /** Every object (ellipses and text aside), layers in file order, then objects in order. */
  objects: TiledObject[];
  // The same objects, sorted by kind (each list keeps file order).
  sprites: TiledSprite[];
  rects: TiledRectObject[];
  polylines: TiledPolyline[];
  points: TiledPoint[];
}

/** A gid looked up in its tileset. */
export interface TiledTileRef {
  tileset: TiledTileset;
  localId: number;
  tile: TiledTile;
}

// Tiled keeps flips in the top 4 bits of a gid.
export const FLIP_H = 0x80000000;
export const FLIP_V = 0x40000000;
export const FLIP_D = 0x20000000;
export const FLIP_HEX = 0x10000000;
/** The gid without its flip bits. */
export const GID_MASK = 0x0fffffff;

/** What a wall polyline's posts default to when the map doesn't say (the old map builder's values). */
const POST_DEFAULTS = { postW: 8, postH: 8, postDX: -4, postDY: -6 };

/** The hint shown when an object was resized in Tiled. */
const REFIT = "python scripts/art/art.py build-map masroor --refit-objects";

/** A property's value, or `fallback` when it isn't set. Throws if it has another type. */
export function prop(props: TiledProps, name: string, fallback: boolean): boolean;
export function prop(props: TiledProps, name: string, fallback: number): number;
export function prop(props: TiledProps, name: string, fallback: string): string;
export function prop(props: TiledProps, name: string, fallback: boolean | number | string): boolean | number | string {
  const v = props[name];
  if (v === undefined) return fallback;
  if (typeof v !== typeof fallback) throw new Error(`Tiled map: property "${name}" should be a ${typeof fallback}, not ${JSON.stringify(v)}.`);
  return v as boolean | number | string;
}

// ---------------------------------------------------------------------------
// Reading the JSON. Every check fails with a message that says where to look.

type Json = Record<string, unknown>;

function fail(msg: string): never {
  throw new Error(`Tiled map: ${msg}`);
}

function obj(v: unknown, where: string): Json {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) fail(`${where} should be a JSON object.`);
  return v as Json;
}

function num(o: Json, key: string, where: string, fallback?: number): number {
  const v = o[key] ?? fallback;
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(`${where} needs a number "${key}".`);
  return v;
}

/** A whole number of 0 or more. */
function int(o: Json, key: string, where: string, fallback?: number): number {
  const v = num(o, key, where, fallback);
  if (!Number.isInteger(v) || v < 0) fail(`${where}: "${key}" should be a whole number, not ${v}.`);
  return v;
}

function str(o: Json, key: string, where: string, fallback?: string): string {
  const v = o[key] ?? fallback;
  if (typeof v !== 'string') fail(`${where} needs a text "${key}".`);
  return v;
}

function list(o: Json, key: string, where: string): unknown[] {
  const v = o[key] ?? [];
  if (!Array.isArray(v)) fail(`${where}: "${key}" should be a list.`);
  return v;
}

/** [{name, type, value}] -> {name: value}. */
function readProps(raw: unknown, where: string): TiledProps {
  const out: TiledProps = {};
  if (raw === undefined) return out;
  if (!Array.isArray(raw)) fail(`${where}: "properties" should be a list.`);
  for (const p of raw) {
    const q = obj(p, `a property of ${where}`);
    out[str(q, 'name', `a property of ${where}`)] = q.value;
  }
  return out;
}

/** Throws unless the property is missing or has the given type. */
function checkType(props: TiledProps, name: string, type: 'boolean' | 'number', where: string): void {
  const v = props[name];
  if (v !== undefined && typeof v !== type) fail(`${where}: property "${name}" should be a ${type === 'number' ? 'number' : 'bool'}, not ${JSON.stringify(v)}.`);
}

/** Texture key of an image path: its file name without .png. */
function keyOf(path: string, where: string): string {
  const file = path.slice(path.lastIndexOf('/') + 1);
  if (!/\.png$/i.test(file)) fail(`${where} uses ${path}, which isn't a PNG. The game only loads PNGs.`);
  return file.slice(0, -4);
}

/** The rectangles drawn on a tile in Tiled's collision editor. */
function readFootprints(raw: unknown, where: string): TiledRect[] {
  if (raw === undefined) return [];
  const g = obj(raw, `the collision shapes of ${where}`);
  return list(g, 'objects', where).map((r) => {
    const o = obj(r, `a collision shape of ${where}`);
    const at = `collision shape ${String(o.id)} of ${where}`;
    if (o.gid !== undefined || o.point || o.ellipse || o.polygon || o.polyline || o.text) fail(`${at} isn't a rectangle. Draw footprints with the rectangle tool.`);
    if (num(o, 'rotation', at, 0) !== 0) fail(`${at} is rotated. Set its rotation back to 0.`);
    return { x: num(o, 'x', at), y: num(o, 'y', at), w: num(o, 'width', at), h: num(o, 'height', at) };
  });
}

function readTileset(raw: unknown): TiledTileset {
  const t = obj(raw, 'a tileset');
  const firstgid = int(t, 'firstgid', 'a tileset');
  if (t.source !== undefined) fail(`the tileset at firstgid ${firstgid} is external (${String(t.source)}). Embed it: in Tiled's Tilesets panel press "Embed Tileset".`);
  const name = str(t, 'name', `the tileset at firstgid ${firstgid}`, '');
  const where = `tileset "${name}"`;
  // Objects are anchored at their bottom-left corner; another anchor would move every one.
  const align = str(t, 'objectalignment', where, 'unspecified');
  if (align !== 'unspecified' && align !== 'bottomleft') fail(`${where} anchors objects at "${align}". Set Object Alignment to Unspecified or Bottom Left.`);

  const tiles = new Map<number, TiledTile>();
  for (const r of list(t, 'tiles', where)) {
    const tt = obj(r, `a tile of ${where}`);
    const id = int(tt, 'id', `a tile of ${where}`);
    const at = `tile ${id} of ${where}`;
    const tile: TiledTile = { props: readProps(tt.properties, at), footprints: readFootprints(tt.objectgroup, at) };
    checkType(tile.props, 'walkable', 'boolean', at);
    checkType(tile.props, 'solid', 'boolean', at);
    if (tt.image !== undefined) {
      tile.image = str(tt, 'image', at);
      tile.key = keyOf(tile.image, at);
      tile.imagewidth = num(tt, 'imagewidth', at);
      tile.imageheight = num(tt, 'imageheight', at);
    }
    tiles.set(id, tile);
  }

  const base = {
    name,
    firstgid,
    tilewidth: int(t, 'tilewidth', where),
    tileheight: int(t, 'tileheight', where),
    margin: int(t, 'margin', where, 0),
    spacing: int(t, 'spacing', where, 0),
    columns: int(t, 'columns', where, 0),
    tilecount: int(t, 'tilecount', where, tiles.size),
    tiles,
  };
  if (t.image === undefined) {
    // An image collection: every tile is its own picture.
    for (const [id, tile] of tiles) if (tile.key === undefined) fail(`tile ${id} of ${where} has no image.`);
    return { ...base, kind: 'collection', key: '', imagewidth: 0, imageheight: 0 };
  }
  // An atlas: give every tile an entry, so any gid in range can be looked up.
  const image = str(t, 'image', where);
  for (let id = 0; id < base.tilecount; id++) if (!tiles.has(id)) tiles.set(id, { props: {}, footprints: [] });
  return { ...base, kind: 'atlas', key: keyOf(image, where), image, imagewidth: int(t, 'imagewidth', where), imageheight: int(t, 'imageheight', where) };
}

/** Tile layer data: a plain list of gids, or uncompressed base64 (4 bytes per cell, little-endian). */
function readData(l: Json, cells: number, where: string): number[] {
  const compression = str(l, 'compression', where, '');
  if (compression) fail(`${where} is compressed (${compression}). In Tiled, Map > Map Properties > Tile Layer Format: pick CSV or Base64 (uncompressed).`);
  let data: number[];
  if (l.encoding === 'base64') {
    if (typeof l.data !== 'string') fail(`${where} says base64 but its data isn't text.`);
    const bin = atob(l.data.trim());
    if (bin.length !== cells * 4) fail(`${where} has ${bin.length / 4} cells, expected ${cells}.`);
    data = [];
    for (let i = 0; i < bin.length; i += 4) {
      // >>> 0 keeps the top (flip) bit from turning the number negative.
      data.push((bin.charCodeAt(i) | (bin.charCodeAt(i + 1) << 8) | (bin.charCodeAt(i + 2) << 16) | (bin.charCodeAt(i + 3) << 24)) >>> 0);
    }
  } else {
    data = list(l, 'data', where).map((v) => {
      if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 0xffffffff) fail(`${where} has a cell that isn't a gid: ${JSON.stringify(v)}.`);
      return v;
    });
  }
  if (data.length !== cells) fail(`${where} has ${data.length} cells, expected ${cells}.`);
  return data;
}

function readTileLayer(l: Json, name: string, where: string, map: TiledMap): void {
  if (l.chunks !== undefined) fail(`${where} is split into chunks (an infinite map). Untick Infinite in Map > Map Properties.`);
  const width = int(l, 'width', where);
  const height = int(l, 'height', where);
  if (width !== map.width || height !== map.height) fail(`${where} is ${width}x${height} tiles but the map is ${map.width}x${map.height}.`);
  const data = readData(l, width * height, where);
  data.forEach((gid, i) => {
    if (gid !== 0 && !findTile(map.tilesets, gid)) fail(`${where} cell (${i % width}, ${Math.floor(i / width)}) uses unknown gid ${gid & GID_MASK}.`);
  });
  map.tileLayers.push({ id: int(l, 'id', where, 0), name, width, height, data, props: readProps(l.properties, where) });
}

function readObjects(l: Json, layer: string, where: string, map: TiledMap): void {
  for (const r of list(l, 'objects', where)) {
    const o = obj(r, `an object in ${where}`);
    const id = int(o, 'id', `an object in ${where}`);
    const at = `object ${id} in ${where}`;
    if (o.template !== undefined) fail(`${at} comes from a template (${String(o.template)}). Detach it from the template first.`);
    const rotation = num(o, 'rotation', at, 0);
    if (rotation !== 0) fail(`${at} is rotated ${rotation}°. Rotation isn't supported: set it back to 0.`);
    const name = str(o, 'name', at, '');
    const props = readProps(o.properties, at);
    checkType(props, 'solid', 'boolean', at);
    const x = num(o, 'x', at);
    const y = num(o, 'y', at);
    // Tiled saves visible: false for an object hidden with its eye icon.
    const visible = o.visible !== false;

    if (o.gid !== undefined) {
      const raw = num(o, 'gid', at);
      if (!Number.isInteger(raw) || raw < 0 || raw > 0xffffffff) fail(`${at} has a bad gid ${raw}.`);
      if (raw & (FLIP_V | FLIP_D | FLIP_HEX)) fail(`${at} is flipped vertically or turned. Only left-right flips are supported.`);
      const gid = raw & GID_MASK;
      const ref = findTile(map.tilesets, gid);
      if (!ref) fail(`${at} uses unknown gid ${gid}.`);
      if (ref.tileset.kind !== 'collection') fail(`${at} is a tile from the atlas "${ref.tileset.name}". Place objects from an image-collection tileset (like walk_objects).`);
      const sprite: TiledSprite = {
        kind: 'sprite',
        id,
        gid,
        key: ref.tile.key ?? '',
        name,
        layer,
        visible,
        x,
        y,
        w: num(o, 'width', at, ref.tile.imagewidth),
        h: num(o, 'height', at, ref.tile.imageheight),
        flipX: (raw & FLIP_H) !== 0,
        props: { ...ref.tile.props, ...props },
      };
      checkSize(sprite, ref.tile);
      map.objects.push(sprite);
    } else if (o.point === true) {
      map.objects.push({ kind: 'point', id, name, layer, visible, x, y, props });
    } else if (o.polyline !== undefined || o.polygon !== undefined) {
      const closed = o.polygon !== undefined;
      const points = list(o, closed ? 'polygon' : 'polyline', at).map((p) => {
        const q = obj(p, `a point of ${at}`);
        // Tiled saves points relative to the object's position.
        return { x: x + num(q, 'x', at), y: y + num(q, 'y', at) };
      });
      for (const k of ['step', 'postW', 'postH', 'postDX', 'postDY']) checkType(props, k, 'number', at);
      const step = props.step;
      if (typeof step === 'number' && (!Number.isInteger(step) || step < 1)) fail(`${at} has step ${step}. It must be a whole number of 1 or more.`);
      map.objects.push({ kind: 'polyline', id, name, layer, visible, points, closed, props });
    } else if (o.ellipse === true || o.text !== undefined) {
      // Ellipses and text aren't used by the game.
    } else {
      map.objects.push({ kind: 'rect', id, name, layer, visible, x, y, w: num(o, 'width', at, 0), h: num(o, 'height', at, 0), props });
    }
  }
}

/** Reads the layers in file order. Group layers are opened up in place. */
function readLayers(layers: unknown[], map: TiledMap): void {
  for (const r of layers) {
    const l = obj(r, 'a layer');
    const name = str(l, 'name', 'a layer', '');
    const where = `layer "${name}" (id ${String(l.id)})`;
    if (num(l, 'offsetx', where, 0) !== 0 || num(l, 'offsety', where, 0) !== 0) fail(`${where} is offset. Set its Offset back to 0, 0 and move its contents instead.`);
    switch (l.type) {
      case 'tilelayer':
        readTileLayer(l, name, where, map);
        break;
      case 'objectgroup':
        readObjects(l, name, where, map);
        break;
      case 'group':
        readLayers(list(l, 'layers', where), map);
        break;
      case 'imagelayer':
        break; // a picture only: nothing to collide with
      default:
        fail(`${where} has an unknown type ${JSON.stringify(l.type)}.`);
    }
  }
}

/** Reads and checks a map saved by Tiled as JSON (.tmj). Throws on anything the game can't use. */
export function parseTiledMap(json: unknown): TiledMap {
  const m = obj(json, 'The file');
  if (m.infinite === true) fail('the map is infinite. Untick Infinite in Map > Map Properties so it has a fixed size.');
  const orientation = str(m, 'orientation', 'the map', 'orthogonal');
  if (orientation !== 'orthogonal') fail(`the map is ${orientation}. Only orthogonal maps are supported.`);
  const map: TiledMap = {
    width: int(m, 'width', 'the map'),
    height: int(m, 'height', 'the map'),
    tilewidth: int(m, 'tilewidth', 'the map'),
    tileheight: int(m, 'tileheight', 'the map'),
    props: readProps(m.properties, 'the map'),
    tilesets: list(m, 'tilesets', 'the map')
      .map(readTileset)
      .sort((a, b) => a.firstgid - b.firstgid),
    tileLayers: [],
    objects: [],
    sprites: [],
    rects: [],
    polylines: [],
    points: [],
  };
  readLayers(list(m, 'layers', 'the map'), map);
  for (const o of map.objects) {
    if (o.kind === 'sprite') map.sprites.push(o);
    else if (o.kind === 'rect') map.rects.push(o);
    else if (o.kind === 'polyline') map.polylines.push(o);
    else map.points.push(o);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Looking things up.

function findTile(tilesets: readonly TiledTileset[], gid: number): TiledTileRef | undefined {
  const id = gid & GID_MASK;
  if (id === 0) return undefined;
  // The tileset with the highest firstgid not above the gid.
  for (let i = tilesets.length - 1; i >= 0; i--) {
    const tileset = tilesets[i];
    if (tileset.firstgid > id) continue;
    const tile = tileset.tiles.get(id - tileset.firstgid);
    return tile && { tileset, localId: id - tileset.firstgid, tile };
  }
  return undefined;
}

/** The tile a gid points at (flip bits ignored). Throws for an empty cell (0) or an unknown gid. */
export function tileOf(map: Pick<TiledMap, 'tilesets'>, gid: number): TiledTileRef {
  const ref = findTile(map.tilesets, gid);
  if (!ref) fail(`unknown gid ${gid & GID_MASK}.`);
  return ref;
}

/** Throws if an object is drawn at another size than its picture. */
function checkSize(s: TiledSprite, tile: TiledTile): void {
  const iw = tile.imagewidth ?? s.w;
  const ih = tile.imageheight ?? s.h;
  if (Math.abs(s.w - iw) > 0.001 || Math.abs(s.h - ih) > 0.001) {
    fail(`object ${s.id} ("${s.name}") is ${s.w}x${s.h} but its picture ${s.key}.png is ${iw}x${ih}. Objects are never scaled: run '${REFIT}' to fit them back.`);
  }
}

// ---------------------------------------------------------------------------
// Collision.

/** A sprite's colliders in map px: its tile's footprints, placed (and mirrored) with it. None when solid is false. */
export function spriteFootprints(map: Pick<TiledMap, 'tilesets'>, s: TiledSprite): TiledRect[] {
  if (!prop(s.props, 'solid', true)) return [];
  const { tile } = tileOf(map, s.gid);
  checkSize(s, tile);
  const top = s.y - s.h;
  return tile.footprints.map((f) => ({ x: s.x + (s.flipX ? s.w - f.x - f.w : f.x), y: top + f.y, w: f.w, h: f.h }));
}

/**
 * Posts along a wall, exactly as the old Python map builder placed them: on each
 * segment, n = the longer side in whole px; a post every `step` px from the
 * segment's start (the corner points are counted by both segments, so they get
 * two posts). The arithmetic order matches the old code, so results are identical.
 */
export function polylinePosts(points: readonly TiledXY[], step: number, postW: number, postH: number, postDX: number, postDY: number): TiledRect[] {
  if (!Number.isInteger(step) || step < 1) fail(`wall step must be a whole number of 1 or more, not ${step}.`);
  const out: TiledRect[] = [];
  for (let k = 1; k < points.length; k++) {
    const { x: ax, y: ay } = points[k - 1];
    const { x: bx, y: by } = points[k];
    const n = Math.trunc(Math.max(Math.abs(bx - ax), Math.abs(by - ay)));
    if (n === 0) continue; // shorter than 1 px: no posts
    // The old loop visited every i in 0..n and kept those with i % step === 0: the same i's as this.
    for (let i = 0; i <= n; i += step) {
      const px = Math.trunc(ax + ((bx - ax) * i) / n);
      const py = Math.trunc(ay + ((by - ay) * i) / n);
      out.push({ x: px + postDX, y: py + postDY, w: postW, h: postH });
    }
  }
  return out;
}

/** Cells whose tile has walkable: false, joined into runs along each row. Layer by layer, top row first. */
export function blockedTileRects(map: TiledMap): TiledRect[] {
  const out: TiledRect[] = [];
  const blocked = (gid: number): boolean => gid !== 0 && !prop(tileOf(map, gid).tile.props, 'walkable', true);
  for (const layer of map.tileLayers) {
    for (let row = 0; row < layer.height; row++) {
      let start = -1; // first column of the run so far, or -1
      for (let col = 0; col <= layer.width; col++) {
        const b = col < layer.width && blocked(layer.data[row * layer.width + col]);
        if (b && start < 0) start = col;
        if (!b && start >= 0) {
          out.push({ x: start * map.tilewidth, y: row * map.tileheight, w: (col - start) * map.tilewidth, h: map.tileheight });
          start = -1;
        }
      }
    }
  }
  return out;
}

/** Rectangles on the object layer with this name are no-go areas without needing solid: true. */
export const COLLISION_LAYER = 'collision';

/**
 * Whether a plain rectangle is a no-go area: it must be on the 'collision'
 * layer or have solid: true, must not have solid: false, and must not be
 * hidden. One that blocks must have a size, or the map is refused.
 */
export function rectCollides(r: TiledRectObject): boolean {
  // solid: true or false wins; without it, the layer decides.
  if (!r.visible || !prop(r.props, 'solid', r.layer === COLLISION_LAYER)) return false;
  if (r.w <= 0 || r.h <= 0) {
    fail(`object ${r.id} ("${r.name}") on layer "${r.layer}" is a no-go rectangle of ${r.w}x${r.h} px. Give it a width and a height, or delete it.`);
  }
  return true;
}

/**
 * Everything the player can't walk through, in one ordered list: each object
 * in file order (sprite footprints, rectangles, wall posts), then blocked tiles.
 * Points never collide; neither does any object with solid: false, any object
 * hidden in Tiled, or a rectangle that isn't a no-go area (see rectCollides).
 * A polygon wall also gets posts along its closing side.
 */
export function collisionRects(map: TiledMap): TiledRect[] {
  const out: TiledRect[] = [];
  for (const o of map.objects) {
    if (!o.visible) {
      // hidden in Tiled: ignored
    } else if (o.kind === 'sprite') {
      out.push(...spriteFootprints(map, o));
    } else if (o.kind === 'rect') {
      if (rectCollides(o)) out.push({ x: o.x, y: o.y, w: o.w, h: o.h });
    } else if (!prop(o.props, 'solid', true)) {
      // switched off
    } else if (o.kind === 'polyline' && typeof o.props.step === 'number') {
      const p = (name: keyof typeof POST_DEFAULTS): number => prop(o.props, name, POST_DEFAULTS[name]);
      const points = o.closed && o.points.length > 1 ? [...o.points, o.points[0]] : o.points;
      out.push(...polylinePosts(points, o.props.step, p('postW'), p('postH'), p('postDX'), p('postDY')));
    }
  }
  out.push(...blockedTileRects(map));
  return out;
}
