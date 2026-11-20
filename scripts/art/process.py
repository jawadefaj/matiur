"""Raw art -> the final PNGs the game loads (assets/sprites/final/<category>/<key>.png).

Each manifest entry says where its pixels come from (source) and the ordered
steps to apply (post). Paid keys whose PixelLab output has not been generated
yet get a stand-in (the template PNG), so the game looks the same as before;
characters keep their current sheet until their walk frames exist.

Every final it makes is recorded in its entry as processed: {sha256, inputs},
the PNG's hash and the hashes of the files (and manifest recipe) it was made
from. verify uses that to spot a final that is out of date; process uses it to
leave alone a final someone painted by hand (unless --force).

Ported from assets/art-wip/level-2/: half() and walker_sheet() from
build_level2_art.py, load() and flatten_roof() from build_masroor_map.py.
"""
import json
import math
import os
import random
import re
import shutil

import numpy as np
from PIL import Image, ImageDraw

import manifest as M

WANG_ORDER = ('NW', 'NE', 'SW', 'SE')  # wang id = NW*8 + NE*4 + SW*2 + SE*1, a corner is 1 when it is 'upper'


# ---------------------------------------------------------------------------
# Small image helpers.

def rgba(path):
    return Image.open(path).convert('RGBA')


def crop_alpha(im):
    """Crop to the visible pixels (the alpha channel's bounding box)."""
    box = im.getchannel('A').getbbox()
    return im.crop(box) if box else im


def half(img):
    """Halve pixel art: each output pixel takes the most opaque/darkest-weighted pick of its 2x2 block."""
    a = np.asarray(img.convert('RGBA'))
    h, w = a.shape[0] // 2 * 2, a.shape[1] // 2 * 2
    a = a[:h, :w]
    out = np.zeros((h // 2, w // 2, 4), np.uint8)
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            blk = a[y:y + 2, x:x + 2].reshape(-1, 4)
            vis = blk[blk[:, 3] > 0]
            if len(vis) < 2:
                continue
            # Keep outlines: prefer the darkest pixel when any is near-black, else the most common.
            lum = vis[:, :3].astype(int).sum(1)
            if lum.min() < 120:
                out[y // 2, x // 2] = vis[lum.argmin()]
            else:
                cols, counts = np.unique(vis, axis=0, return_counts=True)
                out[y // 2, x // 2] = cols[counts.argmax()]
    return Image.fromarray(out, 'RGBA')


def resize(im, k):
    """Nearest-neighbour scale by k (a number, or [num, den] for an exact ratio like 112/75)."""
    k = k[0] / k[1] if isinstance(k, (list, tuple)) else float(k)
    return im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.NEAREST)


def flatten_roof(house, color, split=0.56):
    """Paint the roof (the upper part above the wall) one colour, keeping outline and shading."""
    a = np.asarray(house).astype(int).copy()
    h = a.shape[0]
    roof = a[: int(h * split)]
    vis = roof[..., 3] > 0
    lum = roof[..., :3].mean(2)
    dark = lum < 60
    shade = np.clip((lum - 60) / 160, 0, 1)[..., None]
    col = np.array(color, float)
    roof[..., :3] = np.where((vis & ~dark)[..., None], (col * (0.72 + 0.28 * shade)).astype(int), roof[..., :3])
    a[: int(h * split)] = roof
    return Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA')


def fit(im, size):
    """Centre the visible pixels on a canvas of `size`; shrink (nearest) only if they don't fit."""
    im = crop_alpha(im)
    w, h = size
    if im.width > w or im.height > h:
        k = min(w / im.width, h / im.height)
        im = im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))), Image.NEAREST)
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    out.paste(im, ((w - im.width) // 2, (h - im.height) // 2), im)
    return out


def apply_post(im, ops, a, man):
    """Run an entry's post steps in order."""
    for op in ops:
        name = op['op']
        if name == 'crop_alpha':
            im = crop_alpha(im)
        elif name == 'half':
            im = half(im)
        elif name == 'resize':
            im = resize(im, op['k'])
        elif name == 'fit':
            im = fit(im, op.get('size', a['size']))
        elif name == 'flatten_roof':
            roofs = man.get('houseRoofs') or {}
            if op['roof'] not in roofs:
                raise SystemExit(f'{a["key"]}: houseRoofs has no colour "{op["roof"]}" (run: art.py suggest-roofs)')
            im = flatten_roof(im, roofs[op['roof']], op.get('split', 0.56))
        else:
            raise SystemExit(f'{a["key"]}: unknown post step "{name}"')
    return im


def save_final(a, im, man, force=False):
    """Write the final PNG and record what it was made from in the entry:
    processed = {sha256 of the PNG, inputs: {path: sha256}} (verify compares both).

    Returns 'unchanged' (the file already holds exactly these pixels: not rewritten, keeps git
    quiet), 'written', or 'kept': the file is not what process last wrote (its sha256 differs
    from the record, or there is no record), so someone may have painted it by hand. It is
    then left alone unless force.
    """
    path = M.final_path(a)
    im = im.convert('RGBA')
    done = 'written'
    if os.path.exists(path):
        with Image.open(path) as old:
            same = old.mode == 'RGBA' and old.size == im.size and np.array_equal(np.asarray(old), np.asarray(im))
        if same:
            done = 'unchanged'
        elif not force and M.sha256(path) != (a.get('processed') or {}).get('sha256'):
            return 'kept'
    if done == 'written':
        os.makedirs(os.path.dirname(path), exist_ok=True)
        im.save(path, optimize=True)
    a['processed'] = {'sha256': M.sha256(path), 'inputs': inputs(a, man)}
    return done


def kept_message(a):
    """What process says about a final it did not overwrite."""
    why = 'it was edited by hand' if a.get('processed') else 'it has no processed record (made by hand?)'
    return f'KEPT {M.final_path(a)}: {why}; art.py process {a["key"]} --force replaces it'


def check_size(a, im):
    w, h = a['size']
    rule = a.get('sizeRule', 'exact')
    ok = im.size == (w, h) if rule == 'exact' else im.width <= w and im.height <= h
    if not ok:
        raise SystemExit(f'{a["key"]}: made {im.width}x{im.height}, manifest says {rule} {w}x{h}')


# ---------------------------------------------------------------------------
# Wang tilesets (PixelLab top-down tilesets: 16 tiles, one per corner pattern).

def wang_id(corners, upper='upper'):
    return sum(8 >> i for i, c in enumerate(WANG_ORDER) if corners[c] == upper)


def load_wang(folder):
    """{wang id: RGBA image} from a raw tileset folder (metadata.json + tile_NN.png, NN = list index)."""
    meta_path = M.versioned(f'{folder}/metadata.json')
    if not meta_path:
        return None
    meta = json.load(open(meta_path, encoding='utf-8'))
    tiles = {}
    for i, t in enumerate(meta['tiles']):
        path = M.versioned(f'{folder}/tile_{i:02d}.png')
        if path:
            tiles[wang_id(t['corners'])] = rgba(path)
    if sorted(tiles) != list(range(16)):
        raise SystemExit(f'{folder}: expected the 16 corner patterns, found {sorted(tiles)}')
    return tiles


def wang_texture(tiles, grid, seed, upper_share=0.4):
    """A seamless texture: tiles on a corner grid that wraps around, so the edges match."""
    gw, gh = grid
    rnd = random.Random(seed)
    v = [[1 if rnd.random() < upper_share else 0 for _ in range(gw)] for _ in range(gh)]
    ts = tiles[0].width
    out = Image.new('RGBA', (gw * ts, gh * ts))
    for y in range(gh):
        for x in range(gw):
            w = v[y][x] * 8 + v[y][(x + 1) % gw] * 4 + v[(y + 1) % gh][x] * 2 + v[(y + 1) % gh][(x + 1) % gw]
            out.paste(tiles[w], (x * ts, y * ts))
    return out


def upper_masks(tiles):
    """Per tile, which pixels are the upper terrain: nearer to the pure upper tile's mean colour.

    A 3x3 majority vote removes single-pixel specks (a dark pebble in the sand is still sand).
    The two pure tiles are all lower and all upper by definition.
    """
    lo = np.asarray(tiles[0])[..., :3].reshape(-1, 3).mean(0)
    hi = np.asarray(tiles[15])[..., :3].reshape(-1, 3).mean(0)
    out = {}
    for w, im in tiles.items():
        p = np.asarray(im)[..., :3].astype(float)
        m = (((p - hi) ** 2).sum(2) < ((p - lo) ** 2).sum(2)).astype(int)
        pad = np.pad(m, 1, mode='edge')
        votes = sum(pad[dy:dy + m.shape[0], dx:dx + m.shape[1]] for dy in range(3) for dx in range(3))
        out[w] = votes >= 5
    out[0] = np.zeros_like(out[0])
    out[15] = np.ones_like(out[15])
    return out


def concrete_texture(sand, recipe):
    """Concrete = the sand tile greyed, with subtle slab joints on the tile's top row and left column."""
    s = np.asarray(sand)[..., :3].astype(float)
    conc = s.mean(2, keepdims=True) * recipe.get('gray', 0.55) + np.array(recipe.get('add', [108, 104, 96]), float)
    conc[0, :] *= recipe.get('joint', 0.88)
    conc[:, 0] *= recipe.get('joint', 0.88)
    return conc


def atlas(images, tile, margin, spacing, columns, rows):
    """Tiles laid out with margin and spacing; each tile's edge pixels are extruded 1 px around it."""
    w = margin * 2 + columns * tile + (columns - 1) * spacing
    h = margin * 2 + rows * tile + (rows - 1) * spacing
    out = np.zeros((h, w, 4), np.uint8)
    for i, im in enumerate(images):
        if im is None:
            continue
        x = margin + (i % columns) * (tile + spacing)
        y = margin + (i // columns) * (tile + spacing)
        a = np.asarray(im.convert('RGBA'))
        ext = np.pad(a, ((1, 1), (1, 1), (0, 0)), mode='edge')  # extrude by one pixel
        out[y - 1:y + tile + 1, x - 1:x + tile + 1] = ext
    return Image.fromarray(out, 'RGBA')


def tint(rgb, mask, op, pure_mean):
    """Recolour the masked pixels: (p - mean) * contrast + target mean (the legacy blue-grey asphalt)."""
    out = rgb.copy()
    out[mask] = (rgb[mask] - pure_mean) * op.get('contrast', 0.6) + np.array(op['mean'], float)
    return out


def ground_atlas(a, man, report):
    """walk_tiles_ground: three Wang sets in one atlas, local id = set base + wang id."""
    t = a['tile']
    src = a['source']
    sets = {s['name']: s for s in src['sets']}
    loaded, status = {}, {}
    for s in src['sets']:
        tiles = load_wang(f'{M.raw_dir(a)}/{s["raw"]}')
        if tiles:
            loaded[s['name']] = tiles
            status[s['name']] = 'pixellab'
    base = src.get('standInFrom', 'sand_asphalt')
    if base not in loaded:
        raise SystemExit(f'{a["key"]}: no raw tiles for {base} (run: art.py fetch)')
    sa = loaded[base]
    sa_mask = upper_masks(sa)
    conc = concrete_texture(sa[0], src.get('concrete', {}))
    # Stand-ins for the sets not generated yet: the sand/asphalt shapes with concrete composited in.
    for s in src['sets']:
        if s['name'] in loaded:
            continue
        tiles = {}
        for w, im in sa.items():
            p = np.asarray(im)[..., :3].astype(float)
            m = sa_mask[w]
            if s['lower'] == 'sand' and s['upper'] == 'concrete':
                p = np.where(m[..., None], conc, p)
            elif s['lower'] == 'concrete' and s['upper'] == 'asphalt':
                p = np.where(m[..., None], p, conc)
            else:
                raise SystemExit(f'{a["key"]}: no stand-in recipe for {s["lower"]}/{s["upper"]}')
            tiles[w] = Image.fromarray(np.dstack([p.clip(0, 255).astype(np.uint8), np.full(m.shape, 255, np.uint8)]), 'RGBA')
        loaded[s['name']] = tiles
        status[s['name']] = 'stand-in'
    # Post steps on terrain pixels (the legacy map's blue-grey asphalt).
    images = [None] * (t['columns'] * t['rows'])
    for s in src['sets']:
        tiles = loaded[s['name']]
        masks = upper_masks(tiles) if status[s['name']] == 'pixellab' else sa_mask
        for w, im in tiles.items():
            rgb = np.asarray(im)[..., :3].astype(float)
            for op in a.get('post', []):
                if op['op'] != 'tint_terrain':
                    continue
                pure = 15 if s['upper'] == op['terrain'] else 0 if s['lower'] == op['terrain'] else None
                if pure is None:
                    continue
                pure_mean = np.asarray(tiles[pure])[..., :3].reshape(-1, 3).mean(0)
                mask = masks[w] if pure == 15 else ~masks[w]
                rgb = tint(rgb, mask, op, pure_mean)
            alpha = np.asarray(im)[..., 3]
            images[s['base'] + w] = Image.fromarray(np.dstack([rgb.clip(0, 255).astype(np.uint8), alpha]), 'RGBA')
    # The corner table build-map reads: one row per atlas tile.
    table = []
    for s in src['sets']:
        for w in range(16):
            corners = [s['upper'] if (w >> (3 - i)) & 1 else s['lower'] for i in range(4)]
            table.append({'id': s['base'] + w, 'set': s['name'], 'wang': w, 'corners': corners})
    t['tiles'] = table
    for name, st in status.items():
        report.append((a['key'], f'set {name}: {st}' + (', pending generation' if st == 'stand-in' else '')))
    return atlas(images, t['size'], t['margin'], t['spacing'], t['columns'], t['rows']), any(v == 'stand-in' for v in status.values())


def paint_atlas(a):
    """walk_tiles_paint: one 16 px tile per runway/taxiway paint pattern the Masroor map uses."""
    import masroor_ground as G
    t = a['tile']
    cols = a['source']['colors']
    patterns = G.paint_patterns()
    cell = t['cell']
    images = []
    for p in patterns:
        im = np.zeros((t['size'], t['size'], 4), np.uint8)
        for i, ch in enumerate(p):
            if ch != '.':
                y, x = divmod(i, t['size'] // cell)
                im[y * cell:(y + 1) * cell, x * cell:(x + 1) * cell] = (*cols[ch], 255)
        images.append(Image.fromarray(im, 'RGBA'))
    t['patterns'] = patterns
    t['rows'] = math.ceil(len(patterns) / t['columns'])
    return atlas(images, t['size'], t['margin'], t['spacing'], t['columns'], t['rows'])


# ---------------------------------------------------------------------------
# Procedural art (drawn here, no PixelLab).

def procedural(a):
    recipe = a['source']['recipe']
    if recipe == 'shelter':
        # Small concrete blast shelter: grey block, dark rim, dark opening (legacy drawing).
        d = np.zeros((16, 22, 4), np.uint8)
        d[:] = (92, 88, 82, 255)
        d[0, :] = d[-1, :] = (40, 36, 34, 255)
        d[:, 0] = d[:, -1] = (40, 36, 34, 255)
        d[6:, 7:15] = (34, 30, 30, 255)
        return Image.fromarray(d, 'RGBA')
    if recipe == 'wall':
        # One 6 x 8 piece of the perimeter wall: dark top line over light concrete (legacy look).
        d = np.zeros((8, 6, 4), np.uint8)
        d[:] = (176, 168, 150, 255)
        d[:2] = (70, 62, 56, 255)
        return Image.fromarray(d, 'RGBA')
    if recipe == 'paint':
        return paint_atlas(a)
    raise SystemExit(f'{a["key"]}: unknown procedural recipe "{recipe}"')


# ---------------------------------------------------------------------------
# Characters: walk frames -> a walker sheet (3 cols stand/stepL/stepR x 4 rows down/left/right/up).

FRAME = re.compile(r'^frame_\d{3}\.png$')  # frame_000.png, frame_001.png...


def frame_files(folder):
    """The frames in one walk folder, in order (only frame_NNN.png: a folder holds one frame set)."""
    return sorted(f'{folder}/{n}' for n in os.listdir(folder) if FRAME.match(n)) if os.path.isdir(folder) else []


def frame_hashes(folder):
    """{frame file name: sha256} of one walk folder; two folders hold the same frames when these are equal."""
    return {os.path.basename(p): M.sha256(p) for p in frame_files(folder)}


def walk_files(a, direction):
    """The frames of the newest walk folder for one direction (<direction>/, <direction>.v2/...), or []."""
    folders = M.versions(f'{M.raw_dir(a)}/{a["pick"].get("folder", "animations/walk")}/{direction}')
    return frame_files(folders[-1]) if folders else []


def walk_frames(a, direction):
    """The newest raw walk frames for one direction, all from one folder, or None."""
    return [rgba(f) for f in walk_files(a, direction)] or None


def feet(im, band):
    """(spread, stagger) of the feet: the visible width of the bottom band (rows y0..y1), and how
    much lower the foot on the image's right reaches than the foot on its left (front and back views)."""
    a = np.asarray(im)[band[0]:band[1], :, 3] > 0
    cols = np.nonzero(a.any(0))[0]
    if not len(cols):
        return 0, 0
    mid = (cols.min() + cols.max() + 1) // 2
    low = [np.nonzero(half_.any(1))[0] for half_ in (a[:, :mid], a[:, mid:])]
    stagger = (low[1].max() - low[0].max()) if len(low[0]) and len(low[1]) else 0
    return int(cols.max() - cols.min() + 1), int(stagger)


def pick_steps(frames, side_view):
    """stand = frame 0; stepL/stepR = the two frames with the feet furthest apart, half a cycle apart.

    The feet are the bottom sixth of the figure (the bottom third also holds the hands in a
    front view). Side views: the widest spread, then the widest about half a cycle away.
    Front/back views: the foot on one side lowest, then the foot on the other side lowest.
    """
    n = len(frames)
    if n < 3:
        raise SystemExit(f'need at least 3 walk frames, got {n}')
    boxes = [f.getchannel('A').getbbox() for f in frames]
    y0 = min(b[1] for b in boxes if b)
    y1 = max(b[3] for b in boxes if b)
    band = (y1 - max(3, (y1 - y0) // 6), y1)
    stats = [feet(f, band) for f in frames]
    cand = range(1, n)
    if not side_view:
        a = max(cand, key=lambda i: stats[i][1])
        b = min(cand, key=lambda i: stats[i][1])
        if stats[a][1] > 0 > stats[b][1]:
            return 0, a, b
    a = max(cand, key=lambda i: stats[i][0])
    far = [i for i in cand if min(abs(i - a), n - abs(i - a)) >= max(1, n // 2 - 1)]
    b = max(far, key=lambda i: stats[i][0]) if far else (a % (n - 1)) + 1
    return 0, min(a, b), max(a, b)


def walker_sheet(a):
    """(sheet, None, picks), or (None, missing direction, None) when frames are not generated yet."""
    rows = a['pick']['rows']
    picked, picks = {}, {}
    for row, direction in rows.items():
        frames = walk_frames(a, direction)
        if not frames:
            return None, direction, None
        idx = pick_steps(frames, direction in ('east', 'west'))
        three = [frames[i] for i in idx]
        # Crop the three with one shared box so the feet stay on the same line.
        box = three[0].getchannel('A').getbbox()
        for f in three[1:]:
            b = f.getchannel('A').getbbox()
            box = (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
        picked[row] = [half(f.crop(box)) for f in three]
        picks[direction] = list(idx)
    fw = max(im.width for ims in picked.values() for im in ims) + 2
    fh = max(im.height for ims in picked.values() for im in ims) + 2
    sheet = Image.new('RGBA', (fw * 3, fh * 4), (0, 0, 0, 0))
    for r, row in enumerate(['down', 'left', 'right', 'up']):
        for c, im in enumerate(picked[row]):
            sheet.paste(im, (c * fw + (fw - im.width) // 2, r * fh + fh - im.height - 1), im)
    return sheet, None, picks


# ---------------------------------------------------------------------------
# One entry.

def template_path(a):
    return (a.get('standIn') or {}).get('from') or f'{M.TEMPLATES}/{a["source"].get("template", a["key"])}.png'


def template_image(a):
    return rgba(template_path(a))


def raw_file(a):
    src = a['source']
    name = src.get('raw', f'{a["key"]}.png')
    return M.versioned(f'{M.raw_dir(a)}/{name}')


# ---------------------------------------------------------------------------
# What a final is made from: process records it, verify checks it is still the same.

# Manifest fields that only steer generation or explain things: they don't change a final's pixels.
NOT_PIXELS = {'request', 'endpoint', 'animation', 'characterId', 'zipName', 'have', 'note'}


def wang_files(folder):
    """The raw files load_wang reads: the newest metadata.json and the newest tile_NN.png of each tile."""
    meta = M.versioned(f'{folder}/metadata.json')
    if not meta:
        return []
    n = len(json.load(open(meta, encoding='utf-8'))['tiles'])
    return [meta] + [p for p in (M.versioned(f'{folder}/tile_{i:02d}.png') for i in range(n)) if p]


def input_files(a):
    """The files a key's final is made from: exactly the versions process reads now (raw files,
    walk frames, template or source map), or None while process does not make it (a character
    whose walk is not generated yet keeps its current sheet)."""
    src = a['source']
    kind = src['kind']
    if kind == 'template':
        return [template_path(a)]
    if kind in ('local', 'derived'):
        return [p for p in [raw_file(a)] if p]
    if kind == 'pixflux':
        return [raw_file(a) or template_path(a)]
    if kind == 'tileset' and 'sets' in src:
        return [p for s in src['sets'] for p in wang_files(f'{M.raw_dir(a)}/{s["raw"]}')]
    if kind == 'tileset':
        return wang_files(M.raw_dir(a)) or [template_path(a)]
    if kind == 'procedural':
        import masroor_layout as L
        return [L.MAP] if src['recipe'] == 'paint' else []  # the paint patterns are read off the original map
    if kind == 'pixellab-character':
        frames = [walk_files(a, d) for d in a['pick']['rows'].values()]
        return None if [] in frames else [p for f in frames for p in f]
    return []


def recipe(a, man):
    """The parts of a manifest entry that shape the final's pixels: source (without the
    generation request), post steps, size, the walk pick, atlas layout and roof colours."""
    def strip(v):
        if isinstance(v, dict):
            return {k: strip(x) for k, x in v.items() if k not in NOT_PIXELS}
        return [strip(x) for x in v] if isinstance(v, list) else v
    pick = {k: v for k, v in (a.get('pick') or {}).items() if k in ('folder', 'rows')}
    tile = {k: v for k, v in (a.get('tile') or {}).items() if k in ('size', 'margin', 'spacing', 'columns', 'rows', 'cell')}
    roofs = {op['roof']: (man.get('houseRoofs') or {}).get(op['roof']) for op in a.get('post', []) if op['op'] == 'flatten_roof'}
    return strip({'source': a['source'], 'post': a.get('post', []), 'size': a['size'], 'sizeRule': a.get('sizeRule', 'exact'),
                  'pick': pick, 'tile': tile, 'roofs': roofs})


def inputs(a, man):
    """{path: sha256} of everything a final is made from, or None (see input_files). The entry's
    recipe counts as one input, 'assets/sprites/manifest.json#<key>', so an edited post step or
    roof colour also makes the final out of date."""
    files = input_files(a)
    if files is None:
        return None
    out = {p.replace('\\', '/'): M.sha256(p) for p in files}
    out[f'{M.MANIFEST}#{a["key"]}'] = M.sha256(json.dumps(recipe(a, man), sort_keys=True).encode())
    return out


def move_legacy_final(a):
    """One-time move: final/<key>.png (old flat layout) -> final/<category>/<key>.png."""
    old = f'{M.FINAL}/{a["key"]}.png'
    new = M.final_path(a)
    if os.path.exists(old) and not os.path.exists(new):
        os.makedirs(os.path.dirname(new), exist_ok=True)
        shutil.move(old, new)
        return f'moved {old} -> {new}'
    return None


def process_entry(a, man, report, force=False):
    """Make one final PNG. Returns a short status for the report."""
    moved = move_legacy_final(a)
    if moved:
        report.append((a['key'], moved))
    kind = a['source']['kind']
    stand_in = False
    extra = ''
    if kind == 'template':
        im = template_image(a)
    elif kind in ('local', 'derived'):
        path = raw_file(a)
        if not path:
            raise SystemExit(f'{a["key"]}: raw file missing in {M.raw_dir(a)} (run: art.py fetch)')
        im = apply_post(rgba(path), a.get('post', []), a, man)
    elif kind == 'pixflux':
        path = raw_file(a)
        if path:
            im = apply_post(rgba(path), a.get('post', []), a, man)
        else:
            im, stand_in = template_image(a), True
    elif kind == 'tileset' and 'sets' in a['source']:
        im, stand_in = ground_atlas(a, man, report)
    elif kind == 'tileset':
        tiles = load_wang(M.raw_dir(a))
        if tiles:
            op = next(o for o in a['post'] if o['op'] == 'wang_texture')
            im = wang_texture(tiles, op['grid'], op['seed'], op.get('upperShare', 0.4))
        else:
            im, stand_in = template_image(a), True
    elif kind == 'procedural':
        im = procedural(a)
    elif kind == 'pixellab-character':
        im, missing, picks = walker_sheet(a)
        if im is None:
            have = os.path.exists(M.final_path(a))
            return f'pending generation (no {missing} walk frames); ' + ('kept the current sheet' if have else 'NO FINAL PNG')
        extra = f' stand/stepL/stepR frames {picks}'
    else:
        raise SystemExit(f'{a["key"]}: unknown source kind "{kind}"')
    check_size(a, im)
    done = save_final(a, im, man, force)
    if done == 'kept':
        return kept_message(a)
    return ('stand-in, pending generation' if stand_in else 'final') + f' ({im.width}x{im.height}, {done}){extra}'


def run(keys=None, force=False):
    man = M.load()
    report = []
    failed = False
    for a in M.entries(man, keys):
        try:
            status = process_entry(a, man, report, force)
        except SystemExit as e:
            status, failed = f'ERROR: {e}', True
        report.append((a['key'], status))
    # Atlas tables (corner table, paint patterns) and the processed records go back into the manifest.
    M.save(man)
    for key, status in report:
        print(f'  {key:22s} {status}')
    contact_sheet(man)
    return 1 if failed else 0


# ---------------------------------------------------------------------------
# Roof colours and the contact sheet.

def suggest_roofs(k=5):
    """K-means the original houses' roof colours into k colours and store them as houseRoofs."""
    import masroor_layout as L
    samples = L.house_roof_samples()
    centres, label = L.kmeans(samples, k)
    order = sorted(range(k), key=lambda i: centres[i].sum())  # '1' = darkest
    man = M.load()
    man['houseRoofs'] = {str(n + 1): [int(round(v)) for v in centres[i]] for n, i in enumerate(order)}
    M.save(man)
    for n, i in enumerate(order):
        print(f'  walk_house_{n + 1}: rgb{tuple(man["houseRoofs"][str(n + 1)])}  {int((label == i).sum())} houses')
    return 0


def contact_sheet(man, out=None):
    """Every final PNG, scaled up, with its key: assets/art-wip/previews/final_contact_sheet.png (gitignored)."""
    out = out or f'{M.PREVIEWS}/final_contact_sheet.png'
    items = []
    for a in man['assets']:
        p = M.final_path(a)
        if os.path.exists(p):
            im = rgba(p)
            k = max(1, min(4, 96 // max(im.width, im.height, 1)))
            items.append((a['key'], im.resize((im.width * k, im.height * k), Image.NEAREST), im.size))
    if not items:
        return
    cw = 300
    cols = 5
    rows_h = []
    for r in range(0, len(items), cols):
        rows_h.append(max(min(it[1].height, 400) for it in items[r:r + cols]) + 28)
    sheet = Image.new('RGBA', (cw * cols, sum(rows_h)), (58, 62, 66, 255))
    draw = ImageDraw.Draw(sheet)
    y = 0
    for r in range(0, len(items), cols):
        for c, (key, im, size) in enumerate(items[r:r + cols]):
            x = c * cw + 6
            im = im.crop((0, 0, min(im.width, cw - 12), min(im.height, 400)))
            # A checker behind each sprite shows its transparency.
            bg = Image.new('RGBA', im.size, (90, 94, 98, 255))
            bd = ImageDraw.Draw(bg)
            for yy in range(0, im.height, 8):
                for xx in range((yy // 8) % 2 * 8, im.width, 16):
                    bd.rectangle((xx, yy, xx + 7, yy + 7), fill=(110, 114, 118, 255))
            bg.alpha_composite(im)
            sheet.paste(bg, (x, y + 20))
            draw.text((x, y + 4), f'{key} {size[0]}x{size[1]}', fill=(235, 235, 225, 255))
        y += rows_h[r // cols]
    os.makedirs(os.path.dirname(out), exist_ok=True)
    sheet.save(out)
    print(f'  contact sheet: {out}')
