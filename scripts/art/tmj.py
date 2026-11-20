"""Reading Tiled JSON maps (.tmj) the way the game does: a Python mirror of src/core/tiled.ts.

Only what the art pipeline needs: tilesets, gid lookup, tile layer data and the collision
rectangles, with the same rules, formulas and order as collisionRects() in tiled.ts, so the
parity check here proves what the game will compute. Change both together.

    m = tmj.load('src/mechanics/walk/levels/masroor.tmj')
    rects = tmj.collision_rects(m)     # [{'x', 'y', 'w', 'h'}], world px
"""
import base64
import json
import math
import os
import struct

# Tiled keeps flips in the top 4 bits of a gid.
FLIP_H = 0x80000000
FLIP_V = 0x40000000
FLIP_D = 0x20000000
GID_MASK = 0x0FFFFFFF
# A wall polyline's posts when the map doesn't say (the old map builder's values).
POST_DEFAULTS = {'postW': 8, 'postH': 8, 'postDX': -4, 'postDY': -6}


def load(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def props(raw):
    """[{name, type, value}] -> {name: value}."""
    return {p['name']: p.get('value') for p in raw or []}


def key_of(image):
    """Texture key of an image path: its file name without .png."""
    return os.path.basename(image)[:-4]


def image_path(tmj_path, image):
    """An image path as saved in the map (relative to the .tmj) -> a path from the repo root."""
    return os.path.normpath(os.path.join(os.path.dirname(tmj_path), image))


def tilesets(m):
    """The map's tilesets in firstgid order, each with its tiles by local id."""
    out = []
    for t in sorted(m.get('tilesets', []), key=lambda t: t['firstgid']):
        tiles = {tt['id']: tt for tt in t.get('tiles', [])}
        out.append({**t, 'kind': 'atlas' if 'image' in t else 'collection', 'byId': tiles})
    return out


def find(sets, gid):
    """(tileset, local id, tile or None) for a gid (flip bits ignored), or None if no tileset holds it."""
    gid &= GID_MASK
    if gid == 0:
        return None
    for t in reversed(sets):
        if t['firstgid'] <= gid:
            local = gid - t['firstgid']
            if t['kind'] == 'atlas':
                # An atlas has every tile, listed in 'tiles' or not.
                return (t, local, t['byId'].get(local, {})) if local < t['tilecount'] else None
            return (t, local, t['byId'][local]) if local in t['byId'] else None
    return None


def layers(m):
    """Every layer in file order, group layers opened up in place."""
    def walk(ls):
        for l in ls:
            if l.get('type') == 'group':
                yield from walk(l.get('layers', []))
            else:
                yield l
    return list(walk(m.get('layers', [])))


def layer_data(l):
    """A tile layer's gids, one per cell, row by row. Tiled saves them as a plain list (CSV) or as
    uncompressed base64 (4 bytes per cell, little-endian); compressed data is refused."""
    where = f'tile layer "{l.get("name")}"'
    if 'chunks' in l:
        raise ValueError(f'{where} is split into chunks (an infinite map): untick Infinite in Map > Map Properties')
    if l.get('compression'):
        raise ValueError(f'{where} is compressed ({l["compression"]}): in Tiled, Map > Map Properties > '
                         f'Tile Layer Format, pick CSV or Base64 (uncompressed)')
    cells = l['width'] * l['height']
    if l.get('encoding') == 'base64':
        raw = base64.b64decode(l['data'].strip())
        if len(raw) != cells * 4:
            raise ValueError(f'{where} has {len(raw) / 4:g} cells, expected {cells}')
        return list(struct.unpack(f'<{cells}I', raw))
    if len(l['data']) != cells:
        raise ValueError(f'{where} has {len(l["data"])} cells, expected {cells}')
    return l['data']


def set_layer_data(l, data):
    """Store gids back in a tile layer, in the encoding it already had."""
    if l.get('encoding') == 'base64':
        l['data'] = base64.b64encode(struct.pack(f'<{len(data)}I', *data)).decode()
    else:
        l['data'] = list(data)


def footprints(tile):
    """The rectangles drawn on a tile in Tiled's collision editor: [(x, y, w, h)] in image px."""
    return [(o['x'], o['y'], o['width'], o['height']) for o in (tile.get('objectgroup') or {}).get('objects', [])]


def polyline_posts(points, step, w, h, dx, dy):
    """Posts along a wall, exactly as the old Python map builder (and tiled.ts polylinePosts) place them."""
    out = []
    for (ax, ay), (bx, by) in zip(points, points[1:]):
        n = math.trunc(max(abs(bx - ax), abs(by - ay)))
        if n == 0:
            continue
        for i in range(0, n + 1, step):
            px = math.trunc(ax + ((bx - ax) * i) / n)
            py = math.trunc(ay + ((by - ay) * i) / n)
            out.append({'x': px + dx, 'y': py + dy, 'w': w, 'h': h})
    return out


def rect_collides(layer, o):
    """Does a plain rectangle object block the player? Only on the layer named 'collision' or with
    solid: true, never with solid: false or when hidden (a zone on 'markers' never collides)."""
    p = props(o.get('properties'))
    return (layer.get('name') == 'collision' or p.get('solid') is True) and p.get('solid') is not False \
        and o.get('visible') is not False


def collision_rects(m):
    """Everything the player can't walk through, in the order tiled.ts collisionRects() gives:
    each object in file order (sprite footprints, rectangles, wall posts), then blocked tiles.
    An object hidden in Tiled (visible: false) has no collider; a blocking rectangle must have a size."""
    sets = tilesets(m)
    out = []
    for l in layers(m):
        if l.get('type') != 'objectgroup':
            continue
        for o in l.get('objects', []):
            if o.get('visible') is False:
                continue
            p = props(o.get('properties'))
            if 'gid' in o:
                hit = find(sets, o['gid'])
                if not hit:
                    raise ValueError(f'object {o.get("id")} uses unknown gid {o["gid"] & GID_MASK}')
                tile = hit[2]
                p = {**props(tile.get('properties')), **p}
                if p.get('solid', True) is False:
                    continue
                w = o.get('width', tile.get('imagewidth'))
                h = o.get('height', tile.get('imageheight'))
                flip = bool(o['gid'] & FLIP_H)
                top = o['y'] - h
                for fx, fy, fw, fh in footprints(tile):
                    out.append({'x': o['x'] + (w - fx - fw if flip else fx), 'y': top + fy, 'w': fw, 'h': fh})
            elif p.get('solid', True) is False or o.get('point') or o.get('ellipse') or 'text' in o:
                continue
            elif 'polyline' in o or 'polygon' in o:
                if not isinstance(p.get('step'), (int, float)) or isinstance(p.get('step'), bool):
                    continue
                pts = [(o['x'] + q['x'], o['y'] + q['y']) for q in o.get('polyline', o.get('polygon'))]
                if 'polygon' in o and len(pts) > 1:
                    pts.append(pts[0])
                d = {**POST_DEFAULTS, **{k: p[k] for k in POST_DEFAULTS if k in p}}
                out += polyline_posts(pts, int(p['step']), d['postW'], d['postH'], d['postDX'], d['postDY'])
            elif rect_collides(l, o):
                w, h = o.get('width', 0), o.get('height', 0)
                if w <= 0 or h <= 0:
                    raise ValueError(f'object {o.get("id")} on layer "{l.get("name")}" is a blocking rectangle of size '
                                     f'{w}x{h}: give it a size, or set solid: false')
                out.append({'x': o['x'], 'y': o['y'], 'w': w, 'h': h})
    # Tiles with walkable: false, joined into runs along each row; layer by layer, top row first.
    for l in layers(m):
        if l.get('type') != 'tilelayer':
            continue
        w, data = l['width'], layer_data(l)
        for row in range(l['height']):
            start = -1
            for col in range(w + 1):
                gid = data[row * w + col] if col < w else 0
                hit = find(sets, gid) if gid else None
                blocked = bool(hit) and props(hit[2].get('properties')).get('walkable', True) is False
                if blocked and start < 0:
                    start = col
                if not blocked and start >= 0:
                    out.append({'x': start * m['tilewidth'], 'y': row * m['tileheight'],
                                'w': (col - start) * m['tilewidth'], 'h': m['tileheight']})
                    start = -1
    return out
