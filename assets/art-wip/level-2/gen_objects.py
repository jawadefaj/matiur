"""Generate one PixelLab map object per kind of thing on the Masroor walk map.

Each object starts from the matching crop of the uploaded master map, scaled 4x,
so it keeps the theme's design. Results go to pixellab/objects/<name>.png.
Run: python3 assets/art-wip/level-2/gen_objects.py [name ...]
"""
import base64, io, json, os, sys, time
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from pl import call, b64  # noqa: E402

MAP = 'assets/sprites/original/airport-level-map-clean.jpeg'
OUT = f'{HERE}/pixellab/objects'
REGION = (600, 430)

# name: (crop in walk-region px (x0, y0, x1, y1), output size (w, h), description)
OBJECTS = {
    'house': ((338, 271, 362, 291), (96, 80), 'small one-storey 1970s officers quarters house, flat colored roof, white walls, brown door and two windows, top-down 3/4 view'),
    'hospital': ((246, 358, 300, 390), (216, 128), 'long one-storey white military base hospital building, flat light roof, row of blue windows, brown door in the middle, top-down 3/4 view'),
    'tree': ((544, 234, 564, 260), (80, 104), 'round leafy green desert tree with brown trunk and shadow, top-down 3/4 view'),
    'bush': ((411, 275, 421, 285), (40, 40), 'small round green desert shrub, top-down 3/4 view'),
    'watchtower': ((571, 334, 590, 372), (76, 152), 'military perimeter watchtower, concrete tower with red roof and small window, top-down 3/4 view'),
    'fuel_tank': ((56, 296, 86, 342), (120, 184), 'large round white fuel storage tank with dark hatch on top, top-down 3/4 view'),
    'control_tower': ((4, 190, 44, 258), (152, 256), 'airfield control tower, tall white column with blue glass cab and red roof, small base building, top-down 3/4 view'),
    't33': None,
    'pond': ((366, 385, 407, 400), (164, 60), 'small blue pond with light stone edge, top-down view'),
    'track': ((118, 400, 165, 432), (188, 128), 'small oval running track, red track around green grass field, top-down view'),
    'revetment': ((400, 113, 432, 145), (128, 128), 'empty concrete aircraft revetment bay, square concrete pad with low sand-colored walls on three sides, top-down view'),
    'facility': ((598, 205, 618, 240), (80, 140), 'small grey concrete radar and signals building, tall narrow, top-down 3/4 view'),
}


def crop_init(box, size):
    m = Image.open(MAP).convert('RGB').crop(tuple(REGION[i % 2] + v for i, v in enumerate(box)))
    m = m.resize(size, Image.LANCZOS)
    buf = io.BytesIO(); m.save(buf, 'PNG')
    return {'type': 'base64', 'base64': base64.b64encode(buf.getvalue()).decode(), 'format': 'png'}


def wait(job):
    while True:
        st, r = call('GET', f'/background-jobs/{job}')
        if isinstance(r, dict) and r.get('status') != 'processing':
            return r
        time.sleep(6)


def gen(name):
    spec = OBJECTS[name]
    if spec is None:  # the T-33 starts from its own sprite sheet, not the map
        src = Image.open(f'{HERE}/processed/t33_cutout.png').convert('RGBA')
        bg = Image.new('RGBA', src.size, (0, 0, 0, 0)); bg.alpha_composite(src)
        size = (112, 104)
        m = bg.resize(size, Image.LANCZOS)
        buf = io.BytesIO(); m.save(buf, 'PNG')
        init = {'type': 'base64', 'base64': base64.b64encode(buf.getvalue()).decode(), 'format': 'png'}
        desc = 'Lockheed T-33 jet trainer seen from directly above, nose pointing up, silver with yellow bands, green Pakistan roundels, tip tanks'
        view = 'high top-down'
    else:
        box, size, desc = spec
        init = crop_init(box, size)
        view = 'high top-down'
    body = {'description': desc, 'image_size': {'width': size[0], 'height': size[1]}, 'view': view,
            'init_image': init, 'init_image_strength': 450, 'outline': 'single color outline', 'shading': 'medium shading', 'detail': 'medium detail'}
    st, r = call('POST', '/map-objects', body)
    if st >= 300:
        print(name, 'FAILED', st, r); return False
    job = r.get('background_job_id') or r.get('job_id')
    res = wait(job)
    json.dump({k: v for k, v in res.items() if k != 'last_response'}, open(f'{OUT}/{name}.json', 'w'), indent=1, default=str)
    lr = res.get('last_response') or {}
    img = None
    for k in ('image', 'object_image'):
        v = lr.get(k)
        if isinstance(v, str) and len(v) > 100:
            img = v
        elif isinstance(v, dict) and v.get('base64'):
            img = v['base64']
    if img is None:
        oid = lr.get('object_id') or r.get('object_id')
        st, o = call('GET', f'/map-objects/{oid}')
        json.dump({k: (v if k != 'image' else '...') for k, v in (o or {}).items()}, open(f'{OUT}/{name}.meta.json', 'w'), indent=1, default=str)
        img = (o.get('image') or {}).get('base64') if isinstance(o, dict) else None
    if not img:
        print(name, 'no image', str(res)[:500]); return False
    Image.open(io.BytesIO(base64.b64decode(img))).save(f'{OUT}/{name}.png')
    print(name, 'saved', res.get('usage'))
    return True


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for n in sys.argv[1:] or OBJECTS:
        if os.path.exists(f'{OUT}/{n}.png'):
            print(n, 'exists, skipped'); continue
        gen(n)
    print(call('GET', '/balance')[1])
