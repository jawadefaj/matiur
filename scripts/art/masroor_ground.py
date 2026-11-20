"""Ground types of the Masroor walk map, read from the original map's colours.

Ported from assets/art-wip/level-2/build_masroor_map.py. Masks are at REGION
resolution (620 x 470, one cell = 4 x 4 world px); up() takes a mask to world px.
The tile layers use 16 px tiles, so one tile is 4 x 4 region cells.

    from masroor_ground import ground_masks, ground_layer
    m = ground_masks()        # {'asphalt', 'concrete', 'white', 'yellow'}: bool (470, 620)
    g = ground_layer(m)       # terrain at every tile corner, and the paint of every tile

The ground layer is a corner (Wang) grid: one terrain per tile corner, so the
vertex grid is (tiles + 1) in each direction, 156 x 119 for 155 x 118 tiles.
A tile's atlas picture is chosen from its four corners (manifest corner table).
"""
import numpy as np
from PIL import Image, ImageFilter

import masroor_layout as L

# Runway and taxiway paint colours (legacy map).
WHITE = (232, 232, 226)
YELLOW = (232, 196, 70)
TILE = 16  # world px per ground / paint tile
CELLS = TILE // L.S  # region cells per tile side (4)
TILES_W = -(-L.W // TILE)  # 155 tiles across
TILES_H = -(-L.H // TILE)  # 118 tiles down (1880 / 16 = 117.5: the last row is half outside the world)
# Terrain codes on the vertex grid, in the manifest's tile.terrains order.
TERRAINS = ('sand', 'asphalt', 'concrete')
SAND, ASPHALT, CONCRETE = 0, 1, 2
EMPTY = '.' * CELLS * CELLS  # a paint pattern with no paint


def _close(m, k=3):
    im = Image.fromarray((m * 255).astype(np.uint8))
    return np.asarray(im.filter(ImageFilter.MaxFilter(k)).filter(ImageFilter.MinFilter(k))) > 127


def object_mask():
    """Region cells covered by objects: their own ground colour must not leak into the ground.

    Exactly the legacy cut-outs. Jets, trees and bushes use the legacy slices as they were:
    a window that starts above or left of the map is a NumPy slice with a negative start,
    which is empty, so the two trees at the map's edge cut nothing (as on the legacy map).
    """
    objmask = np.zeros((L.RH, L.RW), bool)
    for boxes in L.LAYOUT.values():
        for x0, y0, x1, y1 in boxes:
            objmask[max(0, y0 - 1):y1 + 1, max(0, x0 - 1):x1 + 1] = True
    for x, y in L.JETS:
        objmask[int(y) - 13:int(y) + 13, int(x) - 13:int(x) + 13] = True
    for x, y in L.TREES:
        objmask[y - 9:y + 9, x - 9:x + 9] = True
    for x, y in L.BUSHES:
        objmask[y - 3:y + 4, x - 4:x + 5] = True
    return objmask


def ground_masks(A=None):
    """Asphalt, concrete and paint masks at region resolution (legacy rules, unchanged)."""
    A = L.load_region() if A is None else A
    r, g, b = A[..., 0], A[..., 1], A[..., 2]
    lum = (r + g + b) / 3
    sat = A.max(2) - A.min(2)
    asphalt = (b > r + 8) & (b > g + 4) & (lum > 45) & (lum < 175)
    near_asph = np.asarray(Image.fromarray((asphalt * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))) > 0
    # Bright paint inside the road network: runway dashes, edge lines and taxiway centre lines.
    closed = np.asarray(Image.fromarray((asphalt * 255).astype(np.uint8))
                        .filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))) > 127
    paint = closed & ~asphalt & (lum > 165)
    white = paint & (sat < 60)
    yellow = paint & (sat >= 60) & (r > g) & (g > b)
    asphalt = asphalt | paint
    concrete = (lum > 185) & (sat < 45) & ~near_asph

    objmask = object_mask()
    asphalt = _close(asphalt) & ~objmask
    concrete = _close(concrete) & ~objmask
    white &= ~objmask
    yellow &= ~objmask
    # The old solar panels (an anachronism, GDD §6.10) become plain sand.
    x0, y0, x1, y1 = L.SOLAR
    asphalt[y0:y1, x0:x1] = False
    concrete[y0:y1, x0:x1] = False
    concrete &= ~asphalt
    return {'asphalt': asphalt, 'concrete': concrete, 'white': white & asphalt, 'yellow': yellow & asphalt & ~white}


def up(mask, smooth=True):
    """Region mask -> world mask (W x H), with smoothed diagonals like the legacy map."""
    im = Image.fromarray((mask * 255).astype(np.uint8))
    if not smooth:
        return np.asarray(im.resize((L.W, L.H), Image.NEAREST)) > 127
    return np.asarray(im.resize((L.W, L.H), Image.BILINEAR).filter(ImageFilter.GaussianBlur(1.2))) > 127


# ---------------------------------------------------------------------------
# The corner grid.

def vertex_terrain(masks):
    """Terrain code at every tile corner: (TILES_H + 1, TILES_W + 1) = (119, 156).

    Corner (i, j) sits on region cell (4i, 4j). It takes the majority terrain of the
    4 x 4 region cells around that point (clipped at the map's edges; the bottom row of
    corners lies below the map, so it reads the last row). Asphalt is grown by one cell
    first, so thin roads survive. Ties: asphalt, then concrete, then sand.
    """
    asphalt = np.asarray(Image.fromarray((masks['asphalt'] * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))) > 127
    concrete = masks['concrete'] & ~asphalt
    sand = ~asphalt & ~concrete
    out = np.zeros((TILES_H + 1, TILES_W + 1), np.int8)
    for j in range(TILES_H + 1):
        y0 = min(max(j * CELLS - 2, 0), L.RH - 1)
        y1 = max(min(j * CELLS + 2, L.RH), y0 + 1)
        for i in range(TILES_W + 1):
            x0 = min(max(i * CELLS - 2, 0), L.RW - 1)
            x1 = max(min(i * CELLS + 2, L.RW), x0 + 1)
            votes = (int(sand[y0:y1, x0:x1].sum()), int(asphalt[y0:y1, x0:x1].sum()), int(concrete[y0:y1, x0:x1].sum()))
            # (count, tie-break): asphalt 2 > concrete 1 > sand 0.
            out[j, i] = max((votes[ASPHALT], 2, ASPHALT), (votes[CONCRETE], 1, CONCRETE), (votes[SAND], 0, SAND))[2]
    return out


def tile_corners(v):
    """The four corner terrains of every tile: (TILES_H, TILES_W, 4) in [NW, NE, SW, SE] order."""
    return np.stack([v[:-1, :-1], v[:-1, 1:], v[1:, :-1], v[1:, 1:]], axis=-1)


# Ways to clear the tiles that have all three terrains, tried in this order. The one that changes
# the fewest corners wins (a tie goes to the earlier one). Asphalt never shrinks, so the roads
# and their paint stay whole.
FIXES = ((SAND, CONCRETE), (CONCRETE, SAND), (CONCRETE, ASPHALT), (SAND, ASPHALT))


def _fix(v, frm, to):
    """Turn the `frm` corners of every three-terrain tile into `to`, again and again until no
    tile has three. Returns (grid, corners changed), or None if it gets stuck."""
    v = v.copy()
    changed = 0
    while True:
        c = tile_corners(v)
        three = (c == SAND).any(-1) & (c == ASPHALT).any(-1) & (c == CONCRETE).any(-1)
        if not three.any():
            return v, changed
        turn = np.zeros(v.shape, bool)
        for k, (dy, dx) in enumerate(((0, 0), (0, 1), (1, 0), (1, 1))):
            turn[dy:dy + TILES_H, dx:dx + TILES_W] |= three & (c[..., k] == frm)
        if not turn.any() or changed > v.size:
            return None
        changed += int(turn.sum())
        v[turn] = to


def two_terrains(v):
    """The atlas only has tiles for pairs of terrains, so no tile may have all three.

    Where sand, asphalt and concrete meet, one of the three borders has to go, and fixing
    one tile moves the meeting point along a border to the next tile, so a fix runs along
    that border until it meets another meeting point or the map's edge. Turning sand into
    concrete runs along the roads' edges (a concrete kerb down most of the runway and
    taxiways); turning concrete into sand only trims the aprons where they touch a road.
    So each fix in FIXES is tried and the cheapest is kept.
    Returns (grid, corners changed, 'from -> to').
    """
    best = None
    for frm, to in FIXES:
        done = _fix(v, frm, to)
        if done and (best is None or done[1] < best[1]):
            best = (*done, f'{TERRAINS[frm]} -> {TERRAINS[to]}')
    if best is None:
        raise SystemExit('ground: no fix clears the tiles with three terrains')
    return best


def tile_lookup(table):
    """Corner terrain names (NW, NE, SW, SE) -> atlas local id, from the manifest corner table.
    Pure tiles appear in two sets; the lowest id wins, so the choice never changes between runs."""
    out = {}
    for t in sorted(table, key=lambda t: t['id']):
        out.setdefault(tuple(t['corners']), t['id'])
    return out


def ground_ids(v, table):
    """Atlas local id of every tile, (TILES_H, TILES_W). Fails if a corner pattern has no tile."""
    lookup = tile_lookup(table)
    c = tile_corners(v)
    ids = np.zeros((TILES_H, TILES_W), np.int32)
    for ty in range(TILES_H):
        for tx in range(TILES_W):
            key = tuple(TERRAINS[k] for k in c[ty, tx])
            if key not in lookup:
                raise SystemExit(f'ground tile ({tx}, {ty}): no atlas tile for corners {key}')
            ids[ty, tx] = lookup[key]
    return ids


# ---------------------------------------------------------------------------
# Paint: one 16 px tile per 4 x 4 region cells of runway and taxiway paint.

def paint_cells(masks=None):
    """Region cells as '.', 'W' (white paint) or 'Y' (yellow paint), padded to whole tiles."""
    masks = ground_masks() if masks is None else masks
    cells = np.full((TILES_H * CELLS, TILES_W * CELLS), '.', dtype='<U1')
    cells[:L.RH, :L.RW][masks['white']] = 'W'
    cells[:L.RH, :L.RW][masks['yellow']] = 'Y'
    return cells


def paint_pattern(cells, tx, ty):
    """The paint in tile (tx, ty) as 16 characters, row by row ('.', 'W', 'Y')."""
    return ''.join(cells[ty * CELLS:(ty + 1) * CELLS, tx * CELLS:(tx + 1) * CELLS].ravel())


def paint_grid(masks, v):
    """Paint pattern of every tile, (TILES_H, TILES_W) strings. Only tiles with asphalt
    at all four corners keep their paint (paint never sits on a sand or concrete edge)."""
    cells = paint_cells(masks)
    on_asphalt = (tile_corners(v) == ASPHALT).all(-1)
    grid = np.full((TILES_H, TILES_W), EMPTY, dtype=f'<U{CELLS * CELLS}')
    for ty, tx in zip(*np.nonzero(on_asphalt)):
        grid[ty, tx] = paint_pattern(cells, tx, ty)
    return grid


def ground_layer(masks=None):
    """Everything build-map needs for the two tile layers.

    Returns {'vertices': terrain per corner (two terrains per tile at most),
             'fix': which three-terrain fix was used, 'promoted': how many corners it changed,
             'paint': pattern per tile, 'patterns': the distinct non-empty patterns, sorted,
             'paint_dropped': paint cells left out because their tile is not all asphalt}.
    """
    masks = ground_masks() if masks is None else masks
    v, promoted, fix = two_terrains(vertex_terrain(masks))
    grid = paint_grid(masks, v)
    painted = int(masks['white'].sum() + masks['yellow'].sum())
    kept = sum(CELLS * CELLS - p.count('.') for p in grid.ravel())
    patterns = sorted(set(grid.ravel()) - {EMPTY})
    return {'vertices': v, 'fix': fix, 'promoted': promoted, 'paint': grid, 'patterns': patterns,
            'paint_dropped': painted - kept}


def paint_patterns(masks=None):
    """Every distinct non-empty paint pattern the map uses, sorted, so atlas order is stable.
    Pattern i is local tile i of walk_tiles_paint (process.paint_atlas and build-map share this)."""
    return ground_layer(masks)['patterns']
