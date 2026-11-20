"""build-map: compose a level map as a Tiled JSON file (.tmj) from the final PNGs.

  python scripts/art/art.py build-map masroor                  refuses to overwrite an existing map
  python scripts/art/art.py build-map masroor --force          rebuilds everything (drops hand edits)
  python scripts/art/art.py build-map masroor --ground-only    rebuilds the ground and paint layers;
        keeps the objects, collision and markers layers and the walk_objects tileset as they are
  python scripts/art/art.py build-map masroor --refit-objects  objects whose picture changed size get
        the new width and height, keeping their bottom-centre point; footprints drawn by hand are scaled

Masroor writes src/mechanics/walk/levels/masroor.tmj (155 x 118 tiles of 16 px):
  tilesets  walk_tiles_ground (atlas, Wang corner set 'ground'), walk_tiles_paint (atlas),
            walk_objects (one PNG per tile, footprint rectangles drawn on the tile = colliders)
  layers    ground, paint (tile layers), objects (tile objects in the legacy drawing order),
            collision (the wall polyline + no-go rectangles), markers (points named after Masroor.ts)
The map property legacy: true says the map still matches the old baked map, so its colliders
must equal the old colliders, kept as tests/mechanics/walk/fixtures/masroorLayout.legacy.json;
build-map, verify and the game's tests all check that. Set legacy to false after the first hand edit.

It also renders the map from the .tmj itself (ground, paint, objects with shadows, wall) into
assets/art-wip/previews/ (gitignored): day and night at full size and 1/4, and a side-by-side
with the old baked day map if assets/art-wip/ still has it (the game no longer ships it).
"""
import json
import os

import numpy as np
from PIL import Image, ImageDraw, ImageOps

import manifest as M
import masroor_ground as G
import masroor_layout as L
import tmj

LEVELS = {
    'masroor': {
        'tmj': 'src/mechanics/walk/levels/masroor.tmj',
        'layout': 'tests/mechanics/walk/fixtures/masroorLayout.legacy.json',  # the old colliders (legacy parity)
        # The old baked day map, for the compare preview only (gitignored; skipped when missing).
        'oldDay': 'assets/art-wip/level-2/processed/masroor_map_day.png',
    },
}
GROUND, PAINT, OBJECTS = 'walk_tiles_ground', 'walk_tiles_paint', 'walk_objects'
# Wang colours of the ground set (ids 1, 2, 3 follow the manifest's tile.terrains order).
TERRAIN_COLORS = {'sand': '#c8a96e', 'asphalt': '#686a84', 'concrete': '#a9a59c'}
WALL_PROPS = {'step': 4, 'postW': 8, 'postH': 8, 'postDX': -4, 'postDY': -6, 'texture': 'walk_wall'}
# Legacy night: the day map darkened and pushed to blue (build_masroor_map.py).
NIGHT_KEEP, NIGHT_TINT = 0.30, (0.10, 0.14, 0.26)
# Legacy shadow: the sprite's silhouette in this colour, offset down-right.
SHADOW_RGBA, SHADOW_OFFSET = (20, 14, 30, 90), (6, 5)


# ---------------------------------------------------------------------------
# Small helpers.

def P(name, value):
    """A Tiled custom property."""
    kind = 'bool' if isinstance(value, bool) else 'int' if isinstance(value, int) else \
        'float' if isinstance(value, float) else 'string'
    return {'name': name, 'type': kind, 'value': value}


def rel(tmj_path, path):
    """A repo path as Tiled saves it: relative to the .tmj, with forward slashes."""
    return os.path.relpath(path, os.path.dirname(tmj_path)).replace('\\', '/')


def dumps(obj, ind=0, width=120):
    """JSON that diffs well: short things on one line, tile layer data one map row per line."""
    flat = json.dumps(obj, ensure_ascii=False)
    if not isinstance(obj, (dict, list)) or len(flat) + ind <= width:
        return flat
    pad, inner = ' ' * ind, ' ' * (ind + 1)
    if isinstance(obj, list):
        return '[\n' + ',\n'.join(inner + dumps(v, ind + 1, width) for v in obj) + '\n' + pad + ']'
    parts = []
    for k, v in obj.items():
        if k == 'data' and isinstance(v, list) and isinstance(obj.get('width'), int):
            w = obj['width']
            rows = [inner + ' ' + ','.join(str(g) for g in v[i:i + w]) for i in range(0, len(v), w)]
            val = '[\n' + ',\n'.join(rows) + '\n' + inner + ']'
        else:
            val = dumps(v, ind + 1, width)
        parts.append(f'{inner}{json.dumps(k)}: {val}')
    return '{\n' + ',\n'.join(parts) + '\n' + pad + '}'


def write(path, m):
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(dumps(m) + '\n')


def entry(man, key):
    return next(a for a in man['assets'] if a['key'] == key)


# ---------------------------------------------------------------------------
# The two tile layers: ground (Wang corners) and paint.

def paint_atlas(man, patterns, force=False):
    """Rebuild walk_tiles_paint.png (one tile per pattern, process.paint_atlas) and its manifest entry.
    A paint atlas edited by hand is only replaced with force (build-map --force)."""
    import process
    a = entry(man, PAINT)
    im = process.paint_atlas(a)  # writes tile.patterns and tile.rows
    if a['tile']['patterns'] != patterns:
        raise SystemExit(f'{PAINT}: process.paint_atlas made other patterns than the map uses')
    a['size'] = list(im.size)
    done = process.save_final(a, im, man, force)
    if done == 'kept':
        raise SystemExit(f'build-map: {process.kept_message(a)}, or use build-map --force (the map needs the paint atlas rebuilt)')
    M.save(man)
    return im, done


def tile_layers(man, tmj_path, force=False):
    """(tilesets [ground, paint], layers [ground, paint], report lines) for a fresh build."""
    g = G.ground_layer()
    report = [f'ground: {g["fix"]}: {g["promoted"]} corners changed so no tile has three terrains']
    gt = entry(man, GROUND)['tile']
    ids = G.ground_ids(g['vertices'], gt['tiles'])
    n = len(g['patterns'])
    if n > 256:
        print(f'  WARNING: {n} distinct paint patterns (more than 256): the paint atlas is getting big')
    _, done = paint_atlas(man, g['patterns'], force)
    pt = entry(man, PAINT)['tile']
    report.append(f'paint: {n} distinct tiles ({PAINT}.png {done}); '
                  f'{g["paint_dropped"]} paint cells left out (their tile is not asphalt at all four corners)')

    ground_ts = ground_tileset(man, tmj_path, 1)
    paint_ts = paint_tileset(man, tmj_path, 1 + ground_ts['tilecount'])
    index = {p: i for i, p in enumerate(pt['patterns'])}
    paint_data = [0 if p == G.EMPTY else paint_ts['firstgid'] + index[p] for p in g['paint'].ravel()]
    layers = [tile_layer(1, 'ground', [1 + int(i) for i in ids.ravel()]), tile_layer(2, 'paint', paint_data)]
    return [ground_ts, paint_ts], layers, report


def tile_layer(lid, name, data):
    return {'data': data, 'height': G.TILES_H, 'id': lid, 'name': name, 'opacity': 1, 'type': 'tilelayer',
            'visible': True, 'width': G.TILES_W, 'x': 0, 'y': 0}


def atlas_tileset(a, tmj_path, firstgid, tiles):
    t = a['tile']
    w, h = Image.open(M.final_path(a)).size
    count = len(t['patterns']) if 'patterns' in t else len(t['tiles'])
    return {'columns': t['columns'], 'firstgid': firstgid, 'image': rel(tmj_path, M.final_path(a)),
            'imageheight': h, 'imagewidth': w, 'margin': t['margin'], 'name': a['key'], 'spacing': t['spacing'],
            'tilecount': count, 'tileheight': t['size'], 'tiles': tiles, 'tilewidth': t['size']}


def ground_tileset(man, tmj_path, firstgid):
    """The ground atlas with walkable on every tile and a Wang corner set, so Tiled's terrain brush works."""
    a = entry(man, GROUND)
    t = a['tile']
    color = {name: i + 1 for i, name in enumerate(t['terrains'])}  # sand 1, asphalt 2, concrete 3
    tiles, wang = [], []
    for row in sorted(t['tiles'], key=lambda r: r['id']):
        nw, ne, sw, se = row['corners']
        walkable = all(t['walkable'][c] for c in row['corners'])
        tiles.append({'id': row['id'], 'properties': [P('walkable', walkable)]})
        # Tiled's corner order: top, top-right, right, bottom-right, bottom, bottom-left, left, top-left.
        wang.append({'tileid': row['id'], 'wangid': [0, color[ne], 0, color[se], 0, color[sw], 0, color[nw]]})
    ts = atlas_tileset(a, tmj_path, firstgid, tiles)
    ts['wangsets'] = [{'colors': [{'color': TERRAIN_COLORS.get(n, '#808080'), 'name': n, 'probability': 1, 'tile': -1}
                                  for n in t['terrains']],
                       'name': 'ground', 'tile': -1, 'type': 'corner', 'wangtiles': wang}]
    return ts


def paint_tileset(man, tmj_path, firstgid):
    a = entry(man, PAINT)
    walkable = bool(a['tile']['walkable'])
    tiles = [{'id': i, 'properties': [P('walkable', walkable)]} for i in range(len(a['tile']['patterns']))]
    return atlas_tileset(a, tmj_path, firstgid, tiles)


# ---------------------------------------------------------------------------
# Objects, collision and markers.

def object_keys(man):
    """The walk_objects tiles, in a fixed order: the house variants, then the other kinds."""
    houses = sorted(a['key'] for a in man['assets'] if a['key'].startswith('walk_house_'))
    kinds = L.BOX_KINDS + ('revetment', 'jet', 'tree', 'bush', 'shelter')
    return houses + [L.KEYS[k] for k in kinds]


def objects_tileset(man, tmj_path, firstgid):
    """One tile per object picture. sort and shadow come from the manifest's map block, and the
    footprint (collider) is the manifest's fractions turned into px (manifest.footprint_px)."""
    tiles = []
    for i, key in enumerate(object_keys(man)):
        a = entry(man, key)
        size = Image.open(M.final_path(a)).size
        mp = a.get('map') or {}
        tile = {'id': i, 'image': rel(tmj_path, M.final_path(a)), 'imageheight': size[1], 'imagewidth': size[0],
                'properties': [P('sort', mp.get('sort', 'ysort')), P('shadow', bool(mp.get('shadow', True)))]}
        fp = M.footprint_px(a, size)
        if fp:
            x, y, w, h = fp
            tile['objectgroup'] = {'draworder': 'index', 'id': 2, 'name': '', 'objects': [
                {'height': h, 'id': 1, 'name': 'footprint', 'rotation': 0, 'type': '', 'visible': True,
                 'width': w, 'x': x, 'y': y}], 'opacity': 1, 'type': 'objectgroup', 'visible': True, 'x': 0, 'y': 0}
        tiles.append(tile)
    return {'columns': 0, 'firstgid': firstgid, 'grid': {'height': 1, 'orientation': 'orthogonal', 'width': 1},
            'margin': 0, 'name': OBJECTS, 'spacing': 0, 'tilecount': len(tiles),
            'tileheight': max(t['imageheight'] for t in tiles), 'tiles': tiles,
            'tilewidth': max(t['imagewidth'] for t in tiles)}


def check_legacy_sizes(man, report):
    """The final PNGs must be the size the legacy builder drew them at (its scale rules), or the
    colliders move. Compared against the cropped raw image, when there is one."""
    import process
    boxes = {n: L.LAYOUT[n][0] for n in L.BOX_KINDS}
    boxes['revetment'] = L.REVETMENTS[0]
    for name, box in boxes.items():
        a = entry(man, L.KEYS[name])
        raw = process.raw_file(a) if a['source']['kind'] == 'local' else None
        if not raw:
            continue
        want = L.legacy_size(name, box, process.crop_alpha(process.rgba(raw)).size)
        have = Image.open(M.final_path(a)).size
        if tuple(want) != tuple(have):
            report.append(f'WARNING: {a["key"]} is {have[0]}x{have[1]}; the legacy builder drew it at '
                          f'{want[0]}x{want[1]}, so its colliders will not match the old map')


def object_layers(man, objects_ts):
    """(objects layer, collision layer, markers layer, next object id)."""
    sizes = {t['image'].rsplit('/', 1)[-1][:-4]: (t['imagewidth'], t['imageheight']) for t in objects_ts['tiles']}
    gid = {t['image'].rsplit('/', 1)[-1][:-4]: objects_ts['firstgid'] + t['id'] for t in objects_ts['tiles']}
    houses = L.house_variants(man['houseRoofs'])
    oid = 1
    objs = []
    for p in L.placements(sizes, houses):
        # Tiled anchors tile objects at their bottom-left corner: x = left, y = bottom.
        objs.append({'gid': gid[p['key']], 'height': p['h'], 'id': oid, 'name': p['name'], 'rotation': 0,
                     'type': '', 'visible': True, 'width': p['w'], 'x': p['left'], 'y': p['top'] + p['h']})
        oid += 1
    # The perimeter wall: the legacy polyline at world scale; its posts are the colliders.
    pts = [(x * L.S, y * L.S) for x, y in L.WALL]
    wall = {'height': 0, 'id': oid, 'name': 'wall', 'polyline': [{'x': x - pts[0][0], 'y': y - pts[0][1]} for x, y in pts],
            'properties': [P(k, v) for k, v in WALL_PROPS.items()], 'rotation': 0, 'type': '', 'visible': True,
            'width': 0, 'x': pts[0][0], 'y': pts[0][1]}
    oid += 1
    marks = []
    for name, x, y in L.markers():
        marks.append({'height': 0, 'id': oid, 'name': name, 'point': True, 'rotation': 0, 'type': '',
                      'visible': True, 'width': 0, 'x': x, 'y': y})
        oid += 1
    group = lambda lid, name, objects: {'draworder': 'topdown', 'id': lid, 'name': name, 'objects': objects,
                                        'opacity': 1, 'type': 'objectgroup', 'visible': True, 'x': 0, 'y': 0}
    return group(3, 'objects', objs), group(4, 'collision', [wall]), group(5, 'markers', marks), oid


# ---------------------------------------------------------------------------
# The three ways to build.

def build_full(man, tmj_path, force=False):
    report = []
    check_legacy_sizes(man, report)
    sets, tlayers, rep = tile_layers(man, tmj_path, force)  # --force rebuilds everything, a hand-edited paint atlas too
    report += rep
    first = sets[-1]['firstgid'] + sets[-1]['tilecount']
    objects_ts = objects_tileset(man, tmj_path, first)
    objects, collision, marks, next_id = object_layers(man, objects_ts)
    m = {'compressionlevel': -1, 'height': G.TILES_H, 'infinite': False,
         'layers': tlayers + [objects, collision, marks], 'nextlayerid': 6, 'nextobjectid': next_id,
         'orientation': 'orthogonal',
         'properties': [P('worldWidth', L.W), P('worldHeight', L.H), P('legacy', True)],
         'renderorder': 'right-down', 'tiledversion': '1.10.2', 'tileheight': G.TILE,
         'tilesets': sets + [objects_ts], 'tilewidth': G.TILE, 'type': 'map', 'version': '1.10', 'width': G.TILES_W}
    report.append(f'objects: {len(objects["objects"])} placed, {len(marks["objects"])} markers, '
                  f'wall polyline of {len(collision["objects"][0]["polyline"])} points')
    return m, report


def build_ground_only(man, tmj_path):
    """New ground and paint; every other tileset and layer kept, with gids moved if the paint atlas grew."""
    old = tmj.load(tmj_path)
    old_sets = tmj.tilesets(old)
    sets, tlayers, report = tile_layers(man, tmj_path)
    new_first = {t['name']: t['firstgid'] for t in sets}
    kept = [t for t in sorted(old['tilesets'], key=lambda t: t['firstgid']) if t.get('name') not in (GROUND, PAINT)]
    nxt = sets[-1]['firstgid'] + sets[-1]['tilecount']
    for t in kept:
        new_first[t['name']] = nxt
        ids = [tt['id'] for tt in t.get('tiles', [])]
        nxt += max([t.get('tilecount', 0)] + [i + 1 for i in ids])

    def remap(raw):
        if raw & tmj.GID_MASK == 0:
            return raw
        hit = tmj.find(old_sets, raw)
        if not hit:
            raise SystemExit(f'{tmj_path}: gid {raw & tmj.GID_MASK} is in no tileset')
        return (raw & ~tmj.GID_MASK & 0xFFFFFFFF) | (new_first[hit[0]['name']] + hit[1])

    layers = []
    fresh = {l['name']: l for l in tlayers}
    for l in old['layers']:
        if l.get('type') == 'tilelayer' and l.get('name') in fresh:
            layers.append({**fresh.pop(l['name']), 'id': l['id']})
            continue
        for sub in tmj.layers({'layers': [l]}):
            for o in sub.get('objects', []):
                if 'gid' in o:
                    o['gid'] = remap(o['gid'])
            if sub.get('type') == 'tilelayer':
                tmj.set_layer_data(sub, [remap(g) for g in tmj.layer_data(sub)])
        layers.append(l)
    layers = list(fresh.values()) + layers  # a ground or paint layer that was deleted comes back at the bottom
    for t in kept:
        t['firstgid'] = new_first[t['name']]
    old['tilesets'] = sets + kept
    old['layers'] = layers
    return old, report


def build_refit(man, tmj_path):
    """Pictures that changed size: tiles get the new size, objects keep their bottom centre. A tile's
    footprint is made again from the manifest if it was still the generated one; a footprint drawn
    by hand is scaled with the picture."""
    m = tmj.load(tmj_path)
    report = []
    by_key = {a['key']: a for a in man['assets']}
    for t in m['tilesets']:
        if 'image' in t:
            continue
        for tile in t.get('tiles', []):
            w, h = Image.open(tmj.image_path(tmj_path, tile['image'])).size
            ow, oh = tile['imagewidth'], tile['imageheight']
            if (w, h) == (ow, oh):
                continue
            tile['imagewidth'], tile['imageheight'] = w, h
            a = by_key.get(tmj.key_of(tile['image']))
            fp = M.footprint_px(a, (w, h)) if a else None
            rects = (tile.get('objectgroup') or {}).get('objects', [])
            # The footprint build-map made for the old size, untouched: make it again from the manifest.
            # Anything else (redrawn, several, or deleted to make the object walkable) was done by hand.
            generated = len(rects) == 1 and a and \
                (rects[0]['x'], rects[0]['y'], rects[0]['width'], rects[0]['height']) == M.footprint_px(a, (ow, oh))
            if fp and generated:
                x, y, fw, fh = fp
                tile['objectgroup'] = {'draworder': 'index', 'id': 2, 'name': '', 'objects': [
                    {'height': fh, 'id': 1, 'name': 'footprint', 'rotation': 0, 'type': '', 'visible': True,
                     'width': fw, 'x': x, 'y': y}], 'opacity': 1, 'type': 'objectgroup', 'visible': True, 'x': 0, 'y': 0}
            else:
                # Footprints drawn by hand: scale them with the picture.
                for r in rects:
                    r['x'], r['width'] = round(r['x'] * w / ow), max(1, round(r['width'] * w / ow))
                    r['y'], r['height'] = round(r['y'] * h / oh), max(1, round(r['height'] * h / oh))
            report.append(f'tile {tmj.key_of(tile["image"])}: {ow}x{oh} -> {w}x{h}')
        t['tilewidth'] = max(tt['imagewidth'] for tt in t['tiles'])
        t['tileheight'] = max(tt['imageheight'] for tt in t['tiles'])
    sets = tmj.tilesets(m)
    moved = 0
    for l in tmj.layers(m):
        for o in l.get('objects', []):
            hit = tmj.find(sets, o['gid']) if 'gid' in o else None
            if not hit or hit[0]['kind'] != 'collection':
                continue
            w, h = hit[2]['imagewidth'], hit[2]['imageheight']
            if (o.get('width'), o.get('height')) != (w, h):
                cx = o['x'] + o.get('width', w) / 2
                o['x'], o['width'], o['height'] = int(round(cx - w / 2)), w, h
                moved += 1
    report.append(f'objects refitted: {moved}')
    return m, report


# ---------------------------------------------------------------------------
# Checks: used by build-map after writing and by art.py verify.

def legacy_parity(m, layout_path, have=None):
    """(ok, message): the map's colliders, as the game computes them, against the old colliders (masroorLayout.legacy.json)."""
    want = json.load(open(layout_path, encoding='utf-8'))['solids']
    have = tmj.collision_rects(m) if have is None else have
    if have == want:
        return True, f'legacy parity: {len(have)} of {len(want)} colliders identical and in order'
    first = next((i for i, (a, b) in enumerate(zip(have, want)) if a != b), min(len(have), len(want)))
    return False, (f'legacy parity FAILED: {len(have)} colliders, the old map has {len(want)}; first difference at '
                   f'#{first}: {have[first] if first < len(have) else None} vs {want[first] if first < len(want) else None}')


def check_map(level):
    """(errors, notes) for a level's .tmj: tile layer data is readable (a list or uncompressed base64),
    every gid resolves, every object has its picture's size, every atlas tile says walkable, the ground
    has no empty cell, the gameplay markers exist, the colliders can be computed (no blocking
    rectangle of zero size), and legacy parity while legacy is true."""
    cfg = LEVELS[level]
    path = cfg['tmj']
    errors, notes = [], []
    if not os.path.exists(path):
        return [f'{path}: missing (run: art.py build-map {level})'], notes
    m = tmj.load(path)
    sets = tmj.tilesets(m)
    for t in sets:
        where = f'{path} tileset {t.get("name")}'
        if t['kind'] == 'atlas':
            img = tmj.image_path(path, t['image'])
            if not os.path.exists(img):
                errors.append(f'{where}: image {t["image"]} not found')
                continue
            if Image.open(img).size != (t['imagewidth'], t['imageheight']):
                errors.append(f'{where}: imagewidth/imageheight do not match {img}')
            rows = (t['imageheight'] - 2 * t.get('margin', 0) + t.get('spacing', 0)) // (t['tileheight'] + t.get('spacing', 0))
            if t['columns'] * rows < t['tilecount']:
                errors.append(f'{where}: {t["tilecount"]} tiles do not fit a {t["columns"]} x {rows} grid')
            # Every atlas tile must say whether it can be walked on.
            for i in range(t['tilecount']):
                v = tmj.props(t['byId'].get(i, {}).get('properties')).get('walkable')
                if not isinstance(v, bool):
                    errors.append(f'{where}: tile {i} has no bool walkable property')
                    break
        else:
            for tt in t['byId'].values():
                img = tmj.image_path(path, tt.get('image', ''))
                if not os.path.exists(img):
                    errors.append(f'{where}: tile {tt["id"]} image {tt.get("image")} not found')
                elif Image.open(img).size != (tt.get('imagewidth'), tt.get('imageheight')):
                    errors.append(f'{where}: tile {tt["id"]} says {tt.get("imagewidth")}x{tt.get("imageheight")}, '
                                  f'{img} is {Image.open(img).size[0]}x{Image.open(img).size[1]} (run: art.py build-map {level} --refit-objects)')
    for l in tmj.layers(m):
        where = f'{path} layer {l.get("name")}'
        if l.get('type') == 'tilelayer':
            try:
                data = tmj.layer_data(l)
            except (ValueError, KeyError) as e:
                errors.append(f'{where}: {e}')
                continue
            bad = sorted({g & tmj.GID_MASK for g in data if g and not tmj.find(sets, g)})
            if bad:
                errors.append(f'{where}: unknown gids {bad[:10]}')
            if l.get('name') == 'ground' and 0 in data:
                errors.append(f'{where}: {data.count(0)} empty cells (every ground cell needs a tile)')
        # Hidden objects (visible: false) are checked too: unhiding one must not break the map.
        for o in l.get('objects', []):
            if 'gid' not in o:
                continue
            hit = tmj.find(sets, o['gid'])
            if not hit:
                errors.append(f'{where}: object {o["id"]} uses unknown gid {o["gid"] & tmj.GID_MASK}')
                continue
            tile = hit[2]
            img = tmj.image_path(path, tile.get('image', ''))
            if hit[0]['kind'] != 'collection' or not os.path.exists(img):
                errors.append(f'{where}: object {o["id"]} is not a picture from an image collection')
                continue
            size = Image.open(img).size
            if (o.get('width'), o.get('height')) != size:
                errors.append(f'{where}: object {o["id"]} ({o.get("name")}) is {o.get("width")}x{o.get("height")}, '
                              f'its picture {tmj.key_of(img)}.png is {size[0]}x{size[1]} (run: art.py build-map {level} --refit-objects)')
    names = {o.get('name') for l in tmj.layers(m) if l.get('name') == 'markers' for o in l.get('objects', [])}
    missing = [n for n in L.NEEDED_MARKERS if n not in names]
    if missing:
        errors.append(f'{path}: markers layer has no {", ".join(missing)}')
    # The colliders, the way the game computes them (a blocking rectangle of zero size is an error there too).
    try:
        rects = tmj.collision_rects(m)
    except (ValueError, KeyError) as e:
        errors.append(f'{path}: {e}')
    if tmj.props(m.get('properties')).get('legacy') is True:
        if errors:
            notes.append(f'{path}: legacy parity not checked until the errors above are fixed')
        else:
            ok, msg = legacy_parity(m, cfg['layout'], rects)
            (notes if ok else errors).append(msg)
    else:
        notes.append(f'{path}: legacy is false, colliders are no longer compared with {cfg["layout"]}')
    return errors, notes


# ---------------------------------------------------------------------------
# Rendering the map from the .tmj (previews only; the game draws it with Phaser).

def _tile_pixels(t, local, raw, cache, path):
    """RGBA array of one atlas tile, flips applied."""
    key = (t['name'], local, raw & ~tmj.GID_MASK & 0xFFFFFFFF)
    if key not in cache:
        if t['name'] not in cache:
            cache[t['name']] = np.asarray(Image.open(tmj.image_path(path, t['image'])).convert('RGBA'))
        a = cache[t['name']]
        tw, th, mg, sp = t['tilewidth'], t['tileheight'], t.get('margin', 0), t.get('spacing', 0)
        x = mg + (local % t['columns']) * (tw + sp)
        y = mg + (local // t['columns']) * (th + sp)
        px = a[y:y + th, x:x + tw]
        if raw & tmj.FLIP_D:
            px = px.transpose(1, 0, 2)
        if raw & tmj.FLIP_H:
            px = px[:, ::-1]
        if raw & tmj.FLIP_V:
            px = px[::-1]
        cache[key] = px.astype(float)
    return cache[key]


def render(path):
    """The day map as an RGB image of the world's size, drawn from the .tmj:
    tile layers in order, flat objects, shadows, y-sorted objects (by bottom edge), then the wall on top.
    Hidden layers and hidden objects are left out."""
    m = tmj.load(path)
    sets = tmj.tilesets(m)
    props = tmj.props(m.get('properties'))
    tw, th = m['tilewidth'], m['tileheight']
    canvas = np.zeros((m['height'] * th, m['width'] * tw, 3), float)
    cache = {}
    for l in tmj.layers(m):
        if l.get('type') != 'tilelayer' or not l.get('visible', True):
            continue
        for i, raw in enumerate(tmj.layer_data(l)):
            hit = tmj.find(sets, raw) if raw else None
            if not hit:
                continue
            px = _tile_pixels(hit[0], hit[1], raw, cache, path)
            y, x = i // l['width'] * th, i % l['width'] * tw
            a = px[..., 3:] / 255
            canvas[y:y + th, x:x + tw] = px[..., :3] * a + canvas[y:y + th, x:x + tw] * (1 - a)
    world = Image.fromarray(canvas.clip(0, 255).astype(np.uint8)).convert('RGBA')

    flat, sorted_, walls = [], [], []
    images = {}
    for l in tmj.layers(m):
        if l.get('type') != 'objectgroup' or not l.get('visible', True):
            continue
        for o in l.get('objects', []):
            if o.get('visible') is False:
                continue  # hidden in Tiled: the game neither draws it nor collides with it
            if 'gid' in o:
                t, _, tile = tmj.find(sets, o['gid'])
                p = {**tmj.props(tile.get('properties')), **tmj.props(o.get('properties'))}
                img = tmj.image_path(path, tile['image'])
                if img not in images:
                    images[img] = Image.open(img).convert('RGBA')
                im = ImageOps.mirror(images[img]) if o['gid'] & tmj.FLIP_H else images[img]
                item = (im, int(o['x']), int(o['y'] - o['height']), p.get('shadow', True))
                (flat if p.get('sort') == 'flat' else sorted_).append(item)
            elif 'polyline' in o and tmj.props(o.get('properties')).get('texture'):
                walls.append(o)
    # Flat things lie on the ground, under every shadow.
    for im, x, y, _ in sorted(flat, key=lambda o: o[2] + o[0].height):
        world.paste(im, (x, y), im)
    # Shadows: one layer, the legacy way (a silhouette pasted per object, then composited once).
    shadow = Image.new('RGBA', world.size, (0, 0, 0, 0))
    for im, x, y, cast in flat + sorted_:
        if cast:
            sil = Image.new('RGBA', im.size, SHADOW_RGBA)
            sil.putalpha(im.getchannel('A').point(lambda v: SHADOW_RGBA[3] if v > 0 else 0))
            shadow.paste(sil, (x + SHADOW_OFFSET[0], y + SHADOW_OFFSET[1]), sil)
    world.alpha_composite(shadow)
    for im, x, y, _ in sorted(sorted_, key=lambda o: o[2] + o[0].height):
        world.paste(im, (x, y), im)
    for o in walls:
        draw_wall(world, o, path)
    return world.convert('RGB').crop((0, 0, props.get('worldWidth', world.width), props.get('worldHeight', world.height)))


def draw_wall(world, o, path):
    """The wall texture stamped at every px along the polyline (legacy look: light concrete, a 2 px dark top)."""
    key = tmj.props(o.get('properties'))['texture']
    tex = np.asarray(Image.open(f'{M.FINAL}/objects/{key}.png').convert('RGBA'))
    h, w = tex.shape[:2]
    pts = [(o['x'] + q['x'], o['y'] + q['y']) for q in o['polyline']]
    wa = np.zeros((world.height, world.width), bool)
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        n = int(max(abs(bx - ax), abs(by - ay)))
        for i in range(n + 1):
            px = int(ax + (bx - ax) * i / n)
            py = int(ay + (by - ay) * i / n)
            wa[max(0, py - (h - 2)):py + 2, max(0, px - w // 2):px + w // 2] = True
    a = np.asarray(world).copy()
    a[wa] = tex[-1, 0]
    a[wa & ~np.roll(wa, 2, axis=0)] = tex[0, 0]
    world.paste(Image.fromarray(a, 'RGBA'))


def night(day):
    """The legacy night map: the day darkened, plus its brightness pushed to blue."""
    a = np.asarray(day).astype(float) / 255
    lum = a.mean(2, keepdims=True)
    return Image.fromarray((np.clip(a * NIGHT_KEEP + lum * np.array(NIGHT_TINT), 0, 1) * 255).astype(np.uint8))


def previews(level, path):
    """Day and night at full size and 1/4, plus old vs new side by side (half size). Returns the paths."""
    os.makedirs(M.PREVIEWS, exist_ok=True)
    day = render(path)
    nite = night(day)
    out = []
    for img, name in ((day, 'day'), (nite, 'night')):
        full = f'{M.PREVIEWS}/{level}_tmj_{name}.png'
        quarter = f'{M.PREVIEWS}/{level}_tmj_{name}_quarter.png'
        img.save(full)
        img.resize((img.width // 4, img.height // 4), Image.LANCZOS).save(quarter)
        out += [full, quarter]
    old_path = LEVELS[level]['oldDay']
    if os.path.exists(old_path):
        old = Image.open(old_path).convert('RGB')
        hw, hh = day.width // 2, day.height // 2
        sheet = Image.new('RGB', (hw * 2 + 8, hh + 24), (40, 40, 44))
        sheet.paste(old.resize((hw, hh), Image.LANCZOS), (0, 24))
        sheet.paste(day.resize((hw, hh), Image.LANCZOS), (hw + 8, 24))
        d = ImageDraw.Draw(sheet)
        d.text((6, 6), f'old: {old_path} (one baked picture)', fill=(235, 235, 225))
        d.text((hw + 14, 6), f'new: {path} (tiles + objects)', fill=(235, 235, 225))
        cmp_path = f'{M.PREVIEWS}/{level}_tmj_compare.png'
        sheet.save(cmp_path)
        out.append(cmp_path)
    return out


# ---------------------------------------------------------------------------

def main(level, force=False, ground_only=False, refit_objects=False):
    cfg = LEVELS[level]
    path = cfg['tmj']
    exists = os.path.exists(path)
    if (ground_only or refit_objects) and not exists:
        print(f'build-map: {path} does not exist yet; build it first (art.py build-map {level})')
        return 1
    if exists and not (force or ground_only or refit_objects):
        print(f'build-map: {path} exists and may hold edits made in Tiled. Use --force to rebuild it,\n'
              f'  --ground-only to rebuild only the ground and paint, or --refit-objects after art changed size.')
        return 1
    man = M.load()
    try:
        if ground_only:
            m, report = build_ground_only(man, path)
        elif refit_objects:
            m, report = build_refit(man, path)
        else:
            m, report = build_full(man, path, force)
        # A map whose colliders moved is no longer the old map: stop comparing it with the old layout.
        ok, msg = legacy_parity(m, cfg['layout'])
    except ValueError as e:  # a map edited in Tiled can hold things the game refuses (tmj.py says what)
        print(f'build-map: {path} was not written: {e}. Fix it in Tiled first.')
        return 1
    legacy = next((p for p in m.get('properties', []) if p['name'] == 'legacy'), None)
    if legacy and legacy['value'] is True and not ok and refit_objects:
        legacy['value'] = False
        msg += f'\n  the objects changed, so the map property legacy is now false'
    os.makedirs(os.path.dirname(path), exist_ok=True)
    write(path, m)
    print(f'build-map: wrote {path} ({m["width"]} x {m["height"]} tiles)')
    for r in report:
        print(f'  {r}')
    print(f'  {msg}')
    for p in previews(level, path):
        print(f'  preview: {p}')
    errors, notes = check_map(level)
    for e in errors:
        print(f'  FAIL: {e}')
    return 1 if errors else 0
