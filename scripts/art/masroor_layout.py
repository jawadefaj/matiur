"""Where everything stands on the Level 2 Masroor walk map.

Ported from assets/art-wip/level-2/build_masroor_map.py. The walk map is the
master map's region x 600-1220, y 430-900 (assets/sprites/original/
airport-level-map-clean.jpeg), drawn at S = 4 world px per region px, so the
world is 2480 x 1880 px. Every position here is in REGION px, logged by hand
off the original, so it can be checked against the JPEG.

How the legacy builder anchored things (build-map keeps the same rules):
  boxes (x0, y0, x1, y1)  -> the sprite's bottom centre at ((x0 + x1) / 2 * S, y1 * S)
  points (x, y)           -> the sprite's centre at (x * S, y * S),
                             so its bottom is at y * S + height / 2
  SHELTERS (x, y)         -> bottom centre at (x * S, y * S + 8)
  WALL                    -> a polyline, in region px
"""
import numpy as np
from PIL import Image

MAP = 'assets/sprites/original/airport-level-map-clean.jpeg'
REGION = (600, 430, 1220, 900)  # x0, y0, x1, y1 on the master map
S = 4  # world px per region px
RW, RH = REGION[2] - REGION[0], REGION[3] - REGION[1]  # 620 x 470
W, H = RW * S, RH * S  # 2480 x 1880

# Houses: rows of identical small houses, then the odd ones out.
HOUSES = []
for _y0, _xs in [(272, [339, 372, 429, 453, 485, 510, 542]), (290, [372, 397, 510, 542]), (320, [339, 372, 397, 453]),
                 (338, [339, 372, 397, 428, 453, 485]), (412, [339, 372, 397, 428, 453, 485]), (430, [372, 397])]:
    HOUSES += [(x, _y0, x + 22, _y0 + 17) for x in _xs]
HOUSES += [(370, 232, 398, 248), (510, 223, 537, 240), (332, 440, 360, 455),
           (40, 247, 70, 265), (127, 332, 155, 350), (162, 355, 195, 372), (57, 363, 82, 380), (57, 387, 85, 403),
           (92, 382, 120, 402), (168, 385, 193, 403), (92, 410, 116, 427), (215, 313, 240, 330), (247, 317, 275, 333),
           (277, 313, 305, 330), (217, 398, 247, 417), (277, 402, 302, 418), (227, 428, 255, 445), (0, 425, 22, 442),
           (32, 460, 52, 470), (55, 460, 77, 470),
           (188, 3, 217, 18), (220, 7, 248, 23), (355, 18, 388, 35), (425, 33, 448, 50), (312, 88, 340, 105),
           (510, 57, 533, 73), (480, 77, 502, 93), (565, 15, 597, 32)]

# Buildings and flat things, as boxes on the original. Keys are the legacy
# object names; the manifest keys are walk_<name> (walk_house_1..5 for houses).
LAYOUT = {
    'house': HOUSES,
    'hospital': [(248, 360, 298, 388)],
    'control_tower': [(4, 190, 44, 258)],
    'fuel_tank': [(57, 298, 85, 340), (85, 298, 113, 340)],
    'watchtower': [(573, 337, 588, 370), (520, 402, 540, 437), (453, 443, 467, 470)],
    'facility': [(600, 208, 615, 238)],
    'pond': [(368, 387, 405, 398)],
    'track': [(120, 402, 163, 430)],
}
REVETMENTS = [(x, y, x + 29, y + 30) for y in (115, 149) for x in (402, 432, 462)]
# Parked T-33s: six on the apron, one in each revetment. Points (centres).
JETS = [(167, 222), (200, 214), (232, 208), (147, 248), (187, 245), (232, 243)] + \
       [((a + c) / 2, (b + d) / 2) for a, b, c, d in REVETMENTS]
TREES = [(550, 245), (590, 278), (558, 345), (333, 463), (350, 460), (597, 463), (232, 332), (280, 333), (10, 3), (7, 110),
         (45, 113), (62, 160), (263, 198), (412, 7), (578, 37), (595, 47), (563, 57), (553, 70), (578, 70), (510, 77),
         (527, 88), (580, 90), (598, 95), (583, 105), (523, 133), (535, 153), (587, 165), (327, 162)]
BUSHES = [(415, 280), (583, 318), (595, 445), (342, 437), (152, 282), (125, 330), (203, 328), (50, 375), (215, 437),
          (232, 450), (12, 420), (17, 445), (33, 13), (28, 117), (68, 118), (95, 142), (15, 145), (40, 165), (43, 183),
          (55, 183), (82, 185), (118, 193), (127, 190), (235, 180), (310, 162), (317, 198), (372, 120), (373, 142),
          (335, 147), (347, 167), (363, 165), (480, 103), (318, 197), (523, 183), (545, 187), (513, 192), (520, 197),
          (557, 133), (605, 140), (542, 140), (553, 208), (570, 203), (572, 223), (530, 123)]
# Small concrete blast shelters along the apron edge.
SHELTERS = [(182, 293), (195, 290), (207, 287), (218, 283), (230, 279), (242, 275), (254, 271), (266, 267), (277, 263)]
# The perimeter wall on the east side, as a polyline.
WALL = [(620, 306), (600, 325), (588, 345), (578, 370), (572, 395), (566, 428), (530, 435), (500, 440), (478, 450), (470, 470)]
# The solar panels on the original are an anachronism (GDD §6.10): plain sand there.
SOLAR = (115, 365, 159, 399)  # x0, y0, x1, y1


def load_region():
    """The walk region of the master map, as an int array (RH, RW, 3)."""
    im = Image.open(MAP).convert('RGB').crop(REGION)
    return np.asarray(im).astype(int)


def house_roof_samples(A=None):
    """The roof colour of every house on the original, in HOUSES order (legacy sampling)."""
    A = load_region() if A is None else A
    return np.array([A[y0 + 2:y0 + 6, x0 + 4:x1 - 4].reshape(-1, 3).mean(0) for x0, y0, x1, y1 in HOUSES])


def kmeans(points, k, iters=60):
    """Plain k-means, started from luminance quantiles so it gives the same answer every run."""
    pts = np.asarray(points, float)
    order = np.argsort(pts.sum(1))
    centres = pts[order[[int((i + 0.5) * len(pts) / k) for i in range(k)]]].copy()
    for _ in range(iters):
        label = ((pts[:, None, :] - centres[None]) ** 2).sum(2).argmin(1)
        new = np.array([pts[label == i].mean(0) if (label == i).any() else centres[i] for i in range(k)])
        if np.allclose(new, centres):
            break
        centres = new
    return centres, label


def nearest_roof(color, roofs):
    """The houseRoofs key ('1'..'5') whose colour is nearest to `color`."""
    return min(roofs, key=lambda k: sum((float(a) - float(b)) ** 2 for a, b in zip(color, roofs[k])))


def house_variants(roofs, A=None):
    """For each house in HOUSES order, its texture key walk_house_<n> (nearest roof colour)."""
    return [f'walk_house_{nearest_roof(c, roofs)}' for c in house_roof_samples(A)]


# ---------------------------------------------------------------------------
# Placing the sprites: the legacy put() geometry, in the legacy drawing order.

# Legacy object name -> texture key. Houses pick walk_house_<n> by roof colour (house_variants).
KEYS = {'hospital': 'walk_hospital', 'control_tower': 'walk_control_tower', 'fuel_tank': 'walk_fuel_tank',
        'watchtower': 'walk_watchtower', 'facility': 'walk_facility', 'pond': 'walk_pond', 'track': 'walk_track',
        'revetment': 'walk_revetment', 'jet': 'walk_t33', 'tree': 'walk_tree', 'bush': 'walk_bush',
        'shelter': 'walk_shelter'}
# The kinds placed by box, in the order the legacy builder drew them (after the houses).
BOX_KINDS = ('hospital', 'control_tower', 'fuel_tank', 'watchtower', 'facility', 'pond', 'track')


def put(w, h, cx, bottom):
    """Top-left corner (world px) of a w x h sprite whose bottom centre is at (cx, bottom).

    Exactly the legacy put(): Python round() (a half goes to the even number), then int.
    """
    return int(round(cx - w / 2)), int(round(bottom - h))


def placements(sizes, house_keys):
    """Every sprite on the map, in the legacy drawing order (also the collider order of masroorLayout.legacy.json):
    57 houses, hospital, control tower, 2 fuel tanks, 3 watchtowers, facility, pond, track,
    6 revetments, 12 jets, 28 trees, 44 bushes, 9 shelters.

    sizes: texture key -> (w, h) of its final PNG. house_keys: the walk_house_<n> of each HOUSES entry.
    Returns [{name, key, left, top, w, h}] in world px; the bottom edge is top + h.
    """
    out = []

    def add(name, key, cx, bottom):
        w, h = sizes[key]
        left, top = put(w, h, cx, bottom)
        out.append({'name': name, 'key': key, 'left': left, 'top': top, 'w': w, 'h': h})

    for (x0, y0, x1, y1), key in zip(HOUSES, house_keys, strict=True):
        add('house', key, (x0 + x1) / 2 * S, y1 * S)
    for name in BOX_KINDS:
        for x0, y0, x1, y1 in LAYOUT[name]:
            add(name, KEYS[name], (x0 + x1) / 2 * S, y1 * S)
    for x0, y0, x1, y1 in REVETMENTS:
        add('revetment', KEYS['revetment'], (x0 + x1) / 2 * S, y1 * S)
    # Points are centres: the bottom is half the sprite's height below.
    for name, points in (('jet', JETS), ('tree', TREES), ('bush', BUSHES)):
        h = sizes[KEYS[name]][1]
        for x, y in points:
            add(name, KEYS[name], x * S, y * S + h / 2)
    for x, y in SHELTERS:
        add('shelter', KEYS['shelter'], x * S, y * S + 8)
    return out


def legacy_size(name, box, size):
    """The size the legacy builder drew a cropped image at: it scaled a few to fit their box on the original.

    track, pond, hospital, fuel tank: scaled (nearest) to the box width when that is more than 15% off.
    revetment: stretched to the box when its width is more than 16 px off. Everything else as is.
    The final PNGs already have these scales baked in (manifest post 'resize'); build-map checks they agree.
    """
    w, h = size
    x0, y0, x1, y1 = box
    bw = (x1 - x0) * S
    if name in ('track', 'pond', 'hospital', 'fuel_tank'):
        k = bw / w
        if abs(k - 1) > 0.15:
            return max(1, round(w * k)), max(1, round(h * k))
    if name == 'revetment' and abs(w - bw) > 16:
        return bw, (y1 - y0) * S
    return w, h


# ---------------------------------------------------------------------------
# Gameplay points, read from the level's code so the map's markers never drift from it.

LEVEL_TS = 'src/mechanics/walk/levels/Masroor.ts'
NEEDED_MARKERS = ('HOME', 'OFFICE', 'HOSPITAL', 'RAMP_START')
_M_CALL = r'm\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)'


def _world(x, y):
    """Master-map px -> world px, like m() in Masroor.ts. Whole numbers come back as ints."""
    wx, wy = (float(x) - REGION[0]) * S, (float(y) - REGION[1]) * S
    return (int(wx) if wx.is_integer() else wx), (int(wy) if wy.is_integer() else wy)


def markers(path=LEVEL_TS):
    """The named points of Masroor.ts in world px, in file order: [(name, x, y)].

    It reads the top-level constants built with m(x, y) (master-map px):
      const HOME = m(1064, 788)                          -> HOME
      const BLUEBIRD_ROUTE: Point[] = [m(..), m(..)]     -> BLUEBIRD_ROUTE_0, BLUEBIRD_ROUTE_1, ...
      const WATCHTOWER: GuardDef = { ... ...m(1180, 775) -> WATCHTOWER (where that guard stands)
      const INTERCEPT = BLUEBIRD_ROUTE[BLUEBIRD_ROUTE.length - 1]  -> INTERCEPT
    """
    import re
    with open(path, encoding='utf-8') as f:
        text = f.read()
    out, lists = [], {}
    for d in re.finditer(r'^(?:export\s+)?const\s+(\w+)\s*(?::\s*([\w\[\]]+))?\s*=\s*', text, re.M):
        name, rest = d.group(1), text[d.end():]
        if (one := re.match(_M_CALL, rest)):
            out.append((name, *_world(*one.groups())))
        elif rest.startswith('[') and d.group(2) == 'Point[]':
            pts = [_world(*p) for p in re.findall(_M_CALL, rest[:rest.index('];')])]
            lists[name] = pts
            out += [(f'{name}_{i}', x, y) for i, (x, y) in enumerate(pts)]
        elif rest.startswith('{') and d.group(2) == 'GuardDef':
            body = rest[:rest.index('\n};')]
            if (at := re.search(r'\.\.\.' + _M_CALL, body)):
                out.append((name, *_world(*at.groups())))
        elif (last := re.match(r'(\w+)\[\1\.length - 1\]', rest)) and last.group(1) in lists:
            out.append((name, *lists[last.group(1)][-1]))
    missing = [n for n in NEEDED_MARKERS if n not in {o[0] for o in out}]
    if missing:
        raise SystemExit(f'{path}: could not find the points {", ".join(missing)} (const NAME = m(x, y))')
    return out
