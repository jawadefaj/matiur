// Turns a Tiled map (read by src/core/tiled.ts) into what a walk level draws:
// the tile layers, the object pictures and the walls, plus the list of
// textures they need. No Phaser here: WalkScene draws the result and
// art/register.ts makes the textures.
import { prop, type TiledMap } from '../../core/tiled';
import type { LevelTilemap, MapSprite, WallLine } from './WalkLevel';

/** Size of a wall stamp (the legacy wall: a 6 px band, 2 px of it below the line). */
export const WALL_STAMP = { w: 6, h: 8 };

/** The scenery of a level drawn from a Tiled map. */
export interface MapScenery {
  tilemap: LevelTilemap;
  sprites: MapSprite[];
  wallLines: WallLine[];
}

/** A texture a Tiled map needs, with the size of its picture. */
export interface MapTexture {
  key: string;
  w: number;
  h: number;
  /** Something on the map casts a shadow with it, so it also needs '<key>_sh'. */
  shadow: boolean;
}

/**
 * The tile layers, pictures and walls of `map`. `json` is the .tmj itself, for
 * Phaser. Objects hidden in Tiled (visible: false) are left out, as
 * collisionRects leaves out their colliders.
 */
export function sceneryFromMap(cacheKey: string, json: unknown, map: TiledMap): MapScenery {
  const atlases = map.tilesets.filter((t) => t.kind === 'atlas');
  for (const t of atlases) {
    // WalkScene finds an atlas's texture by the tileset's name.
    if (t.name !== t.key) throw new Error(`Tiled map: tileset "${t.name}" uses ${t.key}.png. Name the tileset after its picture: "${t.key}".`);
  }
  return {
    tilemap: { cacheKey, json, layers: map.tileLayers.map((l) => l.name), tilesets: atlases.map((t) => t.name) },
    sprites: map.sprites.filter((s) => s.visible).map((s) => ({
      key: s.key,
      x: s.x,
      y: s.y,
      w: s.w,
      h: s.h,
      sortY: s.y,
      flat: prop(s.props, 'sort', 'ysort') === 'flat',
      shadow: prop(s.props, 'shadow', false),
      flipX: s.flipX,
    })),
    // A polyline with a `texture` property is drawn as a wall.
    wallLines: map.polylines
      .filter((p) => p.visible && prop(p.props, 'texture', '') !== '')
      .map((p) => ({ points: p.closed ? [...p.points, p.points[0]] : p.points, key: prop(p.props, 'texture', '') })),
  };
}

/** Every texture `map` uses: atlas images, object pictures (each once) and wall stamps. */
export function mapTextures(map: TiledMap): MapTexture[] {
  const out = new Map<string, MapTexture>();
  for (const t of map.tilesets) {
    if (t.kind === 'atlas') {
      out.set(t.key, { key: t.key, w: t.imagewidth, h: t.imageheight, shadow: false });
      continue;
    }
    for (const tile of t.tiles.values()) {
      const key = tile.key ?? '';
      out.set(key, { key, w: tile.imagewidth ?? 1, h: tile.imageheight ?? 1, shadow: prop(tile.props, 'shadow', false) });
    }
  }
  // An object may switch its shadow on even if its tile has none.
  for (const s of map.sprites) {
    const tex = out.get(s.key);
    if (tex && s.visible && prop(s.props, 'shadow', false)) tex.shadow = true;
  }
  for (const p of map.polylines) {
    const key = prop(p.props, 'texture', '');
    if (key && !out.has(key)) out.set(key, { key, ...WALL_STAMP, shadow: false });
  }
  return [...out.values()];
}
