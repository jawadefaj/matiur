"""Generate one PixelLab image per kind of thing on the Masroor walk map (pixflux, 1 generation each).

Colours are forced to a palette taken from the uploaded master map, so every
object matches the theme. Results go to pixellab/objects/<name>.png.
Run: python3 assets/art-wip/level-2/gen_pixflux.py [name ...]
"""
import base64, io, os, sys
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from pl import call  # noqa: E402

OUT = f'{HERE}/pixellab/objects'
STYLE = ', pixel art game asset, high top-down view, front facing, warm desert airbase palette'

OBJECTS = {
    'house': ((96, 80), 'small single-storey house, rectangular flat terracotta red roof with dark outline, white front wall with brown door and two small windows'),
    'hospital': ((216, 128), 'long single-storey white military hospital building, flat light grey roof with dark outline, white front wall with a row of blue windows and a brown double door in the middle'),
    'tree': ((80, 96), 'round leafy green tree with short brown trunk'),
    'bush': ((40, 40), 'small round green desert shrub'),
    'watchtower': ((64, 144), 'military perimeter watchtower, tall narrow white concrete tower with a red pointed roof, a blue window under the roof and a small green flag'),
    'fuel_tank': ((128, 128), 'one large round white fuel storage tank seen from above, flat top with a dark square hatch, small red pipes at the base'),
    'control_tower': ((128, 224), 'airfield control tower, tall white column with a blue glass control cab and a red roof on top, small white base building with blue windows'),
    't33': ((120, 120), 'top-down view of a silver Lockheed T-33 jet trainer airplane, nose pointing up, straight wings with tip fuel tanks, yellow bands, green and white roundels'),
    'pond': ((160, 80), 'small oval blue pond with light stone edge seen from above'),
    'track': ((192, 128), 'small oval running track seen from above, red track lane around a green grass field'),
    'revetment': ((128, 128), 'empty square concrete aircraft parking bay seen from above, light concrete floor with low tan sandbag walls on the left, right and top sides, open at the bottom'),
    'facility': ((80, 128), 'small tall grey concrete signals building with a flat roof and a red stripe, one door'),
}


def palette():
    m = Image.open('assets/sprites/original/airport-level-map-clean.jpeg').convert('RGB').crop((600, 430, 1220, 900))
    m = m.quantize(48).convert('RGB')
    buf = io.BytesIO(); m.save(buf, 'PNG')
    return {'type': 'base64', 'base64': base64.b64encode(buf.getvalue()).decode(), 'format': 'png'}


def gen(name, pal):
    (w, h), desc = OBJECTS[name]
    body = {'description': desc + STYLE, 'image_size': {'width': w, 'height': h}, 'no_background': True, 'view': 'high top-down',
            'outline': 'single color black outline', 'shading': 'basic shading', 'detail': 'medium detail', 'color_image': pal, 'seed': 7}
    st, r = call('POST', '/create-image-pixflux', body)
    if st != 200:
        print(name, 'FAILED', st, str(r)[:300]); return
    img = r['image']; b = img['base64'] if isinstance(img, dict) else img
    Image.open(io.BytesIO(base64.b64decode(b))).save(f'{OUT}/{name}.png')
    print(name, 'saved', r.get('usage'), flush=True)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    pal = palette()
    for n in sys.argv[1:] or OBJECTS:
        if os.path.exists(f'{OUT}/{n}.png'):
            print(n, 'exists, skipped'); continue
        gen(n, pal)
    print(call('GET', '/balance')[1])
