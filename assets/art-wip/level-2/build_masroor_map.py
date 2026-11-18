"""Rebuild the Masroor walk map at full resolution (1 image px = 1 world px).

The layout comes from the uploaded master map (walk region x 600-1220, y 430-900,
drawn at 4x): ground types are read from its colours, and every object is placed
where it stands on the original (positions logged by hand in LAYOUT below, in
walk-region px). The art is one PixelLab generation per kind of thing
(pixellab/objects/), plus the sand-to-asphalt tileset. Houses are one image with
the roof recoloured to match each original house.

Writes:
  assets/sprites/walk_masroor_day.png, walk_masroor_night.png   (2480 x 1880)
  src/mechanics/walk/levels/masroorLayout.json                  (colliders, world px)
  processed/masroor_map_*.png, previews/masroor_map_preview.png

Run from the repo root: python3 assets/art-wip/level-2/build_masroor_map.py
"""
import json, os
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OBJ = f'{HERE}/pixellab/objects'
TILES = f'{HERE}/pixellab/tileset_sand_road'
S = 4  # world px per region px
RW, RH = 620, 470
W, H = RW * S, RH * S

src = Image.open('assets/sprites/original/airport-level-map-clean.jpeg').convert('RGB').crop((600, 430, 1220, 900))
A = np.asarray(src).astype(int)

# ---------------------------------------------------------------------------
# Layout, in walk-region px. Boxes are (x0, y0, x1, y1) of the thing on the original map.

houses = []
for y0, xs in [(272, [339, 372, 429, 453, 485, 510, 542]), (290, [372, 397, 510, 542]), (320, [339, 372, 397, 453]),
               (338, [339, 372, 397, 428, 453, 485]), (412, [339, 372, 397, 428, 453, 485]), (430, [372, 397])]:
    houses += [(x, y0, x + 22, y0 + 17) for x in xs]
houses += [(370, 232, 398, 248), (510, 223, 537, 240), (332, 440, 360, 455),
           (40, 247, 70, 265), (127, 332, 155, 350), (162, 355, 195, 372), (57, 363, 82, 380), (57, 387, 85, 403),
           (92, 382, 120, 402), (168, 385, 193, 403), (92, 410, 116, 427), (215, 313, 240, 330), (247, 317, 275, 333),
           (277, 313, 305, 330), (217, 398, 247, 417), (277, 402, 302, 418), (227, 428, 255, 445), (0, 425, 22, 442),
           (32, 460, 52, 470), (55, 460, 77, 470),
           (188, 3, 217, 18), (220, 7, 248, 23), (355, 18, 388, 35), (425, 33, 448, 50), (312, 88, 340, 105),
           (510, 57, 533, 73), (480, 77, 502, 93), (565, 15, 597, 32)]

LAYOUT = {
    'house': houses,
    'hospital': [(248, 360, 298, 388)],
    'control_tower': [(4, 190, 44, 258)],
    'fuel_tank': [(57, 298, 85, 340), (85, 298, 113, 340)],
    'watchtower': [(573, 337, 588, 370), (520, 402, 540, 437), (453, 443, 467, 470)],
    'facility': [(600, 208, 615, 238)],
    'pond': [(368, 387, 405, 398)],
    'track': [(120, 402, 163, 430)],
}
REVETMENTS = [(x, y, x + 29, y + 30) for y in (115, 149) for x in (402, 432, 462)]
JETS = [(167, 222), (200, 214), (232, 208), (147, 248), (187, 245), (232, 243)] + [((a + c) / 2, (b + d) / 2) for a, b, c, d in REVETMENTS]
TREES = [(550, 245), (590, 278), (558, 345), (333, 463), (350, 460), (597, 463), (232, 332), (280, 333), (10, 3), (7, 110),
         (45, 113), (62, 160), (263, 198), (412, 7), (578, 37), (595, 47), (563, 57), (553, 70), (578, 70), (510, 77),
         (527, 88), (580, 90), (598, 95), (583, 105), (523, 133), (535, 153), (587, 165), (327, 162)]
BUSHES = [(415, 280), (583, 318), (595, 445), (342, 437), (152, 282), (125, 330), (203, 328), (50, 375), (215, 437),
          (232, 450), (12, 420), (17, 445), (33, 13), (28, 117), (68, 118), (95, 142), (15, 145), (40, 165), (43, 183),
          (55, 183), (82, 185), (118, 193), (127, 190), (235, 180), (310, 162), (317, 198), (372, 120), (373, 142),
          (335, 147), (347, 167), (363, 165), (480, 103), (318, 197), (523, 183), (545, 187), (513, 192), (520, 197),
          (557, 133), (605, 140), (542, 140), (553, 208), (570, 203), (572, 223), (530, 123)]
SHELTERS = [(182, 293), (195, 290), (207, 287), (218, 283), (230, 279), (242, 275), (254, 271), (266, 267), (277, 263)]
# The perimeter wall on the east side, as a polyline.
WALL = [(620, 306), (600, 325), (588, 345), (578, 370), (572, 395), (566, 428), (530, 435), (500, 440), (478, 450), (470, 470)]

# ---------------------------------------------------------------------------
# Ground types from the original's colours.

r, g, b = A[..., 0], A[..., 1], A[..., 2]
lum = (r + g + b) / 3
sat = A.max(2) - A.min(2)
asphalt = (b > r + 8) & (b > g + 4) & (lum > 45) & (lum < 175)
near_asph = np.asarray(Image.fromarray((asphalt * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))) > 0
# Bright paint inside the road network: runway dashes, edge lines and taxiway centre lines.
closed = np.asarray(Image.fromarray((asphalt * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))) > 127
paint = closed & ~asphalt & (lum > 165)
white_mark = paint & (sat < 60)
yellow_mark = paint & (sat >= 60) & (r > g) & (g > b)
asphalt = asphalt | paint
concrete = (lum > 185) & (sat < 45) & ~near_asph

# Things drawn on top don't leave their own ground colour behind.
objmask = np.zeros((RH, RW), bool)
for boxes in LAYOUT.values():
    for x0, y0, x1, y1 in boxes:
        objmask[max(0, y0 - 1):y1 + 1, max(0, x0 - 1):x1 + 1] = True
for x, y in JETS:
    objmask[int(y) - 13:int(y) + 13, int(x) - 13:int(x) + 13] = True
for x, y in TREES:
    objmask[y - 9:y + 9, x - 9:x + 9] = True
for x, y in BUSHES:
    objmask[y - 3:y + 4, x - 4:x + 5] = True
def close(m, k=3):
    im = Image.fromarray((m * 255).astype(np.uint8))
    return np.asarray(im.filter(ImageFilter.MaxFilter(k)).filter(ImageFilter.MinFilter(k))) > 127


asphalt = close(asphalt)
concrete = close(concrete)
asphalt &= ~objmask
concrete &= ~objmask
white_mark &= ~objmask
yellow_mark &= ~objmask
# The old solar panels (an anachronism, GDD §6.10) become plain sand.
asphalt[365:399, 115:159] = False
concrete[365:399, 115:159] = False


def up(mask, smooth=True):
    """Region mask -> world mask, with smoothed diagonals."""
    im = Image.fromarray((mask * 255).astype(np.uint8))
    if not smooth:
        return np.asarray(im.resize((W, H), Image.NEAREST)) > 127
    return np.asarray(im.resize((W, H), Image.BILINEAR).filter(ImageFilter.GaussianBlur(1.2))) > 127


ASPH = up(asphalt)
CONC = up(concrete) & ~ASPH
WHITE = up(white_mark, smooth=False) & ASPH
YELLOW = up(yellow_mark, smooth=False) & ASPH

# ---------------------------------------------------------------------------
# Textures: the tileset's pure sand and pure asphalt tiles, tiled; concrete is the sand tile greyed, with slab joints.

meta = json.load(open(f'{TILES}/metadata.json'))


def pure(kind):
    for i, t in enumerate(meta['tiles']):
        if all(v == kind for v in t['corners'].values()):
            return np.asarray(Image.open(f'{TILES}/tile_{i:02d}.png').convert('RGB')).astype(int)
    raise SystemExit(f'no pure {kind} tile')


sand_t, asph_t = pure('lower'), pure('upper')
# Asphalt in the original's blue-grey, keeping the tile's grain.
asph_t = (asph_t - asph_t.mean((0, 1))) * 0.6 + np.array([104, 106, 132])


def tile(t):
    th, tw = t.shape[:2]
    return np.tile(t, (H // th + 1, W // tw + 1, 1))[:H, :W]


sand = tile(sand_t)
asph = tile(asph_t)
gray = sand.mean(2, keepdims=True)
conc = np.clip(gray * 0.55 + np.array([108, 104, 96]), 0, 255)
yy, xx = np.mgrid[0:H, 0:W]
conc[(xx % 64 == 0) | (yy % 64 == 0)] *= 0.86

out = sand.astype(float)
out[CONC] = conc[CONC]
out[ASPH] = asph[ASPH]
# Dark kerbs where asphalt or concrete meets sand.
for m, col in ((ASPH, (66, 66, 88)), (CONC, (140, 132, 116))):
    edge = m & ~(np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))) > 0)
    out[edge] = col
out[WHITE] = (232, 232, 226)
out[YELLOW] = (232, 196, 70)

# ---------------------------------------------------------------------------
# Objects.

canvas = Image.fromarray(out.clip(0, 255).astype(np.uint8)).convert('RGBA')
shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
solids = []  # world-px rects


def load(name):
    im = Image.open(f'{OBJ}/{name}.png').convert('RGBA')
    return im.crop(im.getbbox())


def flatten_roof(house, color):
    """Paint the roof (the upper part above the wall) one colour, keeping outline and shading."""
    a = np.asarray(house).astype(int).copy()
    h = a.shape[0]
    roof = a[: int(h * 0.56)]
    vis = roof[..., 3] > 0
    l = roof[..., :3].mean(2)
    dark = l < 60
    shade = np.clip((l - 60) / 160, 0, 1)[..., None]
    col = np.array(color, float)
    roof[..., :3] = np.where((vis & ~dark)[..., None], (col * (0.72 + 0.28 * shade)).astype(int), roof[..., :3])
    a[: int(h * 0.56)] = roof
    return Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA')


def put(im, cx, bottom, solid=None):
    """Place im with its bottom centre at (cx, bottom) world px; solid=(fx0, fy0, fx1, fy1) fractions of its box."""
    x = int(round(cx - im.width / 2))
    y = int(round(bottom - im.height))
    sil = Image.new('RGBA', im.size, (20, 14, 30, 90))
    sil.putalpha(im.split()[3].point(lambda v: 90 if v > 0 else 0))
    shadow.paste(sil, (x + 6, y + 5), sil)
    canvas_objs.append((im, x, y))
    if solid:
        fx0, fy0, fx1, fy1 = solid
        solids.append({'x': x + int(im.width * fx0), 'y': y + int(im.height * fy0),
                       'w': max(4, int(im.width * (fx1 - fx0))), 'h': max(4, int(im.height * (fy1 - fy0)))})


canvas_objs = []
house = load('house')
for x0, y0, x1, y1 in LAYOUT['house']:
    roof = A[y0 + 2:y0 + 6, x0 + 4:x1 - 4].reshape(-1, 3).mean(0)
    put(flatten_roof(house, roof), (x0 + x1) / 2 * S, y1 * S, (0.04, 0.2, 0.96, 1.0))
for name, solid in [('hospital', (0.02, 0.2, 0.98, 1.0)), ('control_tower', (0.15, 0.55, 0.85, 1.0)),
                    ('fuel_tank', (0.05, 0.15, 0.95, 1.0)), ('watchtower', (0.2, 0.55, 0.8, 1.0)),
                    ('facility', (0.05, 0.3, 0.95, 1.0)), ('pond', (0.05, 0.1, 0.95, 0.9)), ('track', None)]:
    im = load(name)
    for x0, y0, x1, y1 in LAYOUT[name]:
        bw = (x1 - x0) * S
        if name in ('track', 'pond', 'hospital', 'fuel_tank'):
            # Fit the footprint of the original.
            k = bw / im.width
            im2 = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.NEAREST) if abs(k - 1) > 0.15 else im
        else:
            im2 = im
        put(im2, (x0 + x1) / 2 * S, y1 * S, solid)
rev = load('revetment')
for x0, y0, x1, y1 in REVETMENTS:
    put(rev.resize(((x1 - x0) * S, (y1 - y0) * S), Image.NEAREST) if abs(rev.width - (x1 - x0) * S) > 16 else rev, (x0 + x1) / 2 * S, y1 * S)
jet = load('t33')
for x, y in JETS:
    put(jet, x * S, y * S + jet.height / 2, (0.38, 0.15, 0.62, 0.85))
tree = load('tree')
for x, y in TREES:
    put(tree, x * S, y * S + tree.height / 2, (0.4, 0.78, 0.6, 1.0))
bush = load('bush')
for x, y in BUSHES:
    put(bush, x * S, y * S + bush.height / 2)
# Apron shelters: small concrete blast shelters, drawn here.
for x, y in SHELTERS:
    sx, sy = x * S, y * S
    sh = Image.new('RGBA', (22, 16), (92, 88, 82, 255))
    d = np.asarray(sh).copy(); d[0, :] = d[-1, :] = d[:, 0] = d[:, -1] = (40, 36, 34, 255); d[6:, 7:15] = (34, 30, 30, 255)
    put(Image.fromarray(d, 'RGBA'), sx, sy + 8)

# The perimeter wall: a 6 px concrete wall with a dark top line, and its collider.
wall = Image.new('RGBA', (W, H), (0, 0, 0, 0))
wa = np.zeros((H, W), bool)
for (ax, ay), (bx, by) in zip(WALL, WALL[1:]):
    n = int(max(abs(bx - ax), abs(by - ay)) * S)
    for i in range(n + 1):
        px = int((ax + (bx - ax) * i / n) * S)
        py = int((ay + (by - ay) * i / n) * S)
        wa[max(0, py - 6):py + 2, max(0, px - 3):px + 3] = True
        if i % 4 == 0:
            solids.append({'x': px - 4, 'y': py - 6, 'w': 8, 'h': 8})
wpx = np.zeros((H, W, 4), np.uint8)
wpx[wa] = (176, 168, 150, 255)
top = wa & ~np.roll(wa, 2, axis=0)
wpx[top] = (70, 62, 56, 255)
wall = Image.fromarray(wpx, 'RGBA')

canvas.alpha_composite(shadow)
for im, x, y in sorted(canvas_objs, key=lambda o: o[2] + o[0].height):
    canvas.paste(im, (x, y), im)
canvas.alpha_composite(wall)

day = canvas.convert('RGB')
a = np.asarray(day).astype(float) / 255
l = a.mean(2, keepdims=True)
night = Image.fromarray((np.clip(a * 0.30 + l * np.array([0.10, 0.14, 0.26]), 0, 1) * 255).astype(np.uint8))

os.makedirs(f'{HERE}/processed', exist_ok=True)
for img, name in ((day, 'day'), (night, 'night')):
    q = img.quantize(255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    q.save(f'assets/sprites/walk_masroor_{name}.png', optimize=True)
    img.save(f'{HERE}/processed/masroor_map_{name}.png')
    print('saved', name, os.path.getsize(f'assets/sprites/walk_masroor_{name}.png'))
day.resize((W // 4, H // 4), Image.LANCZOS).save(f'{HERE}/previews/masroor_map_preview.png')

json.dump({'width': W, 'height': H, 'solids': solids}, open('src/mechanics/walk/levels/masroorLayout.json', 'w'))
print('solids', len(solids))
