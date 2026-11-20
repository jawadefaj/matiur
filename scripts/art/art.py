"""Wings of Freedom art pipeline. Run from the repo root, with the art venv's python:

  python scripts/art/art.py fetch
  python scripts/art/art.py generate [keys] --dry-run           always first: what it would cost
  python scripts/art/art.py generate [keys] --max-generations N  spends at most N generations
  python scripts/art/art.py process [keys] [--force]             --force also replaces hand-edited finals
  python scripts/art/art.py suggest-roofs
  python scripts/art/art.py build-map masroor [--force | --ground-only | --refit-objects]
  python scripts/art/art.py verify [--night-tint]

See scripts/art/README.md. The manifest is assets/sprites/manifest.json.
"""
import argparse
import base64
import copy
import glob
import io
import json
import os
import re
import sys
import uuid
import zipfile

import manifest as M

WIP = 'assets/art-wip/level-2'
SPEC_CACHE = 'assets/art-wip/cache/openapi.json'
SPEC_URL = 'https://api.pixellab.ai/v2/openapi.json'

# What one unit of each endpoint costs (generations). Downloads, imports and GETs are free.
COSTS = {
    '/create-image-pixflux': 1,
    '/create-tileset': 1,
    '/characters/animations': 1,  # per direction; always pass explicit directions
    '/map-objects': 1,
    '/create-1-direction-object': (10, 25),  # blocked unless --allow-expensive
}
EXPENSIVE = {'/create-1-direction-object'}


# ---------------------------------------------------------------------------
# fetch: recover the trial's PixelLab files and download what PixelLab still stores (all free).

# The trial's object prompts (assets/art-wip/level-2/gen_pixflux.py), for the recovered sidecars.
PIXFLUX_STYLE = ', pixel art game asset, high top-down view, front facing, warm desert airbase palette'
PIXFLUX_OBJECTS = {
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
# The trial's spending (assets/art-wip/level-2/README.md). Logged as recovered: it does not count toward the budget.
TRIAL_SPEND = [
    ('walk_matiur_sd', 0.25, 'Matiur rotations (4 directions, from the extracted turnaround poses)'),
    ('walk_guard', 2, 'night guard character, 8 directions'),
    ('walk_tiles_ground', 1, 'sand to asphalt tileset (16 tiles)'),
    ('walk_matiur_sd', 1, 'Matiur south walk, 8 frames (v3 walking)'),
    ('walk_house', 1, 'house map object (rejected: house_rejected_mapobject.png)'),
    ('masroor objects', 12, '12 pixflux map objects (house, hospital, tree, bush, watchtower, fuel tank, control tower, T-33, pond, track, revetment, facility)'),
]
DIRECTIONS = ('south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west')


def recover_plan():
    """(source file, destination folder, sidecar info) for every PixelLab-made file in assets/art-wip/level-2/pixellab/."""
    src = f'{WIP}/pixellab'
    out = []
    for p in sorted(glob.glob(f'{src}/guard_*.png')):
        out.append((p, f'{M.RAW}/characters/walk_guard/recovered', {'endpoint': 'POST /create-character-with-8-directions (trial)', 'ids': {'character_id': '5ae82929-dfb5-45b7-8228-a22d85231035'}}))
    for p in sorted(glob.glob(f'{src}/matiur_*.png')):
        out.append((p, f'{M.RAW}/characters/walk_matiur_sd/recovered', {'endpoint': 'rotations from the extracted poses (trial)', 'ids': {'character_id': '7a74fa03-4535-43b9-a190-49e0cb02b8c9'}}))
    for p in sorted(glob.glob(f'{src}/matiur_walk_south/*.png')):
        out.append((p, f'{M.RAW}/characters/walk_matiur_sd/recovered/matiur_walk_south',
                     {'endpoint': 'POST /characters/animations (trial, v3 walking)', 'ids': {'character_id': '7a74fa03-4535-43b9-a190-49e0cb02b8c9', 'animation_group_id': '6b9fe7e3-67dc-413c-b5c0-a6b82555b2ee'}}))
    for p in sorted(glob.glob(f'{src}/objects/*')):
        name = os.path.basename(p)
        stem = name.split('.')[0]
        obj = 'house' if stem.startswith('house') else stem
        dest = f'{M.RAW}/vehicles/walk_t33' if obj == 't33' else f'{M.RAW}/objects/walk_{obj}'
        if stem == 'house_rejected_mapobject' or name in ('house.json', 'house.meta.json'):
            info = {'endpoint': 'POST /map-objects (trial, rejected)', 'ids': {'background_job_id': '58370d80-3028-4325-9766-941f4d9baffc', 'object_id': '1ca79f21-9bb2-430e-aedf-2fcf83759fa9'},
                    'usage': {'type': 'generations', 'generations': 1.0}}
        elif obj in PIXFLUX_OBJECTS:
            (w, h), desc = PIXFLUX_OBJECTS[obj]
            info = {'endpoint': 'POST /create-image-pixflux (trial, gen_pixflux.py)', 'seed': 7, 'usage': {'type': 'generations', 'generations': 1.0},
                    'request': {'description': desc + PIXFLUX_STYLE, 'image_size': {'width': w, 'height': h}, 'no_background': True, 'view': 'high top-down',
                                'outline': 'single color black outline', 'shading': 'basic shading', 'detail': 'medium detail',
                                'color_image': {'palette': 'masroor (original map region quantized to 48 colours)'}, 'seed': 7}}
            if stem == 'house_pixflux':
                info['note'] = 'same file as house.png'
        else:
            info = {'endpoint': 'unknown (trial)'}
        out.append((p, dest, info))
    for p in sorted(glob.glob(f'{src}/tileset_sand_road/*')):
        meta = json.load(open(f'{src}/tileset_sand_road/metadata.json', encoding='utf-8'))['metadata']
        out.append((p, f'{M.RAW}/tiles/walk_tiles_ground/sand_asphalt',
                    {'endpoint': 'POST /create-tileset (trial)', 'usage': {'type': 'generations', 'generations': 1.0},
                     'request': {'lower_description': meta['terrain_prompts']['lower'], 'upper_description': meta['terrain_prompts']['upper'],
                                 'tile_size': {'width': 16, 'height': 16}, 'view': meta['view'], 'transition_size': meta['transition_size']},
                     'ids': {'terrain_ids': meta['terrain_ids']}, 'created_at': meta['created_at']}))
    return out


def copy_raw(src_bytes, dest, info, label):
    """Write a raw file unless an identical one is there (the file or any of its .vN versions);
    a different one becomes the next version."""
    sha = M.sha256(src_bytes)
    if any(M.sha256(p) == sha for p in M.versions(dest)):
        return False
    if os.path.exists(dest):
        dest = M.next_version(dest)
        print(f'  {label}: changed upstream, saved as {dest}')
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, 'wb') as f:
        f.write(src_bytes)
    if not dest.endswith('.json'):
        M.write_sidecar(dest, info)
    return True


def cmd_fetch(args):
    from pixellab import call, download, balance
    man = M.load()
    n = 0
    # 1. Recovered trial files (copied, never moved: art-wip keeps its own copy).
    for p, dest_dir, info in recover_plan():
        info = {'recovered': True, 'from': p.replace('\\', '/'), **info}
        n += copy_raw(open(p, 'rb').read(), f'{dest_dir}/{os.path.basename(p)}', info, os.path.basename(p))
    print(f'fetch: recovered {n} new files from {WIP}/pixellab')
    ledger = M.read_ledger()
    if not any(l.get('recovered') for l in ledger):
        for key, gens, note in TRIAL_SPEND:
            M.append_ledger({'kind': 'generation', 'recovered': True, 'key': key, 'generations': gens, 'note': f'trial account: {note}'})
        print('fetch: logged the trial spending in the ledger as recovered (not counted in the budget)')

    # 2. Characters: rotations from rotation_urls, existing animation frames from the ZIP export.
    for a in man['assets']:
        if a['source']['kind'] != 'pixellab-character':
            continue
        cid = a['source']['characterId']
        st, ch = call('GET', f'/characters/{cid}')
        if st != 200:
            print(f'  {a["key"]}: GET /characters/{cid} -> {st} {str(ch)[:200]}')
            continue
        folder = M.raw_dir(a)
        os.makedirs(folder, exist_ok=True)
        slim = {k: v for k, v in ch.items() if k != 'skeletons'}
        with open(f'{folder}/character.json', 'w', encoding='utf-8', newline='\n') as f:
            json.dump(slim, f, indent=1)
            f.write('\n')
        got = 0
        for d, url in (ch.get('rotation_urls') or {}).items():
            if not url or d not in DIRECTIONS:
                continue
            raw, _ = download(url)
            got += copy_raw(raw, f'{folder}/rotations/{d}.png',
                            {'endpoint': f'GET /characters/{cid} rotation_urls', 'url': url.split('?')[0], 'generations': 0,
                             'ids': {'character_id': cid}, 'created_at': ch.get('created_at')}, f'{a["key"]} {d}')
        groups = [(g.get('animation_type'), g.get('animation_group_id'), [x['direction'] for x in g.get('directions', [])]) for g in ch.get('animations', [])]
        print(f'  {a["key"]}: {got} new rotations; animations on PixelLab: {groups or "none"}')
        if ch.get('animations'):
            got = fetch_zip_frames(a, cid, ch)
            print(f'  {a["key"]}: {got} new animation frames from the ZIP export')

    # 3. Balance (free), logged so the ledger shows what the account had.
    b = balance()
    M.append_ledger({'kind': 'balance', 'generations': 0, 'subscription': b.get('subscription'), 'credits': b.get('credits')})
    sub = b.get('subscription') or {}
    print(f'fetch: balance {sub.get("generations")} of {sub.get("total")} subscription generations ({sub.get("plan")})')
    return 0


def fetch_zip_frames(a, cid, ch):
    """Save the walk frames from GET /characters/{id}/zip, one folder per direction:
    animations/walk/<direction>/. A direction whose exact frames (same names, same sha256) already
    fill one of its folders (<direction>/, <direction>.v2/...) is skipped; other frames go to a new
    <direction>.vN/ folder, so a folder never mixes two frame sets (process reads the newest folder).

    The ZIP is untrusted data: only members named <state>/animations/<type>/<direction>/frame_NNN.png
    are read, and they are written under our own names.
    """
    import process as P
    from pixellab import download
    raw, _ = download(f'/characters/{cid}/zip')
    want = a['source']['animation'].get('zipName', 'walking')
    pat = re.compile(r'^[^/]+/animations/([A-Za-z0-9_ :-]+)/([a-z-]+)/frame_(\d{3})\.png$')
    group = next((g for g in ch.get('animations', []) if g.get('animation_type', '').split(':')[-1] == want), {})
    base = f'{M.raw_dir(a)}/{a["pick"].get("folder", "animations/walk")}'
    sets = {}  # direction -> {frame file name: (PNG bytes, ZIP member name)}
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        for name in z.namelist():
            m = pat.match(name)
            if not m or m.group(1) != want or m.group(2) not in DIRECTIONS:
                continue
            data = z.read(name)
            if not data.startswith(b'\x89PNG'):
                continue
            sets.setdefault(m.group(2), {})[f'frame_{m.group(3)}.png'] = (data, name)
        meta = next((n for n in z.namelist() if n == 'metadata.json'), None)
        if meta:
            with open(f'{M.raw_dir(a)}/zip_metadata.json', 'wb') as f:
                f.write(z.read(meta))
    got = 0
    for d, frames in sorted(sets.items()):
        hashes = {f: M.sha256(data) for f, (data, _) in frames.items()}
        have = M.versions(f'{base}/{d}')
        if any(P.frame_hashes(folder) == hashes for folder in have):
            continue
        folder = M.next_version(f'{base}/{d}')
        if have:
            print(f'  {a["key"]} {d}: the ZIP has other frames than {have[-1]}/, saved in {folder}/')
        os.makedirs(folder)
        for f, (data, name) in sorted(frames.items()):
            path = f'{folder}/{f}'
            with open(path, 'wb') as out:
                out.write(data)
            M.write_sidecar(path, {'endpoint': f'GET /characters/{cid}/zip', 'zip_member': name, 'generations': 0,
                                   'ids': {'character_id': cid, 'animation_group_id': group.get('animation_group_id')},
                                   'animation_type': group.get('animation_type')})
            got += 1
    return got


# ---------------------------------------------------------------------------
# generate: the paid step. Dry run first; a real run is capped three ways.

class Job:
    def __init__(self, a, endpoint, body, units, have, label, extra=None):
        self.a, self.endpoint, self.body, self.units, self.have, self.label = a, endpoint, body, units, have, label
        self.extra = extra or {}

    @property
    def cost(self):
        c = COSTS.get(self.endpoint, 1)
        return (c[1] if isinstance(c, tuple) else c) * self.units

    @property
    def cost_text(self):
        c = COSTS.get(self.endpoint, 1)
        return f'{c[0] * self.units}-{c[1] * self.units}' if isinstance(c, tuple) else f'{c * self.units:g}'


def plan_jobs(man, keys, reroll=False):
    import process as P
    jobs = []
    for a in M.entries(man, keys):
        src = a['source']
        kind = src['kind']
        if kind == 'pixflux':
            have = P.raw_file(a)
            jobs.append(Job(a, src['endpoint'], src['request'], 1, have, a['key']))
        elif kind == 'pixellab-character':
            body = copy.deepcopy(src['animation']['request'])
            dirs = body['directions']
            missing = [d for d in dirs if not P.walk_frames(a, d)]
            todo = dirs if reroll else missing
            if reroll and set(todo) - set(missing):
                body.pop('animation_group_id', None)  # a direction a group already has is a 409: re-rolls make a new group
            body['directions'] = todo or dirs
            jobs.append(Job(a, src['animation']['endpoint'], body, len(body['directions']), not missing and not reroll,
                            f'{a["key"]} walk {"/".join(body["directions"])}'))
        elif kind == 'tileset' and 'sets' in src:
            for s in src['sets']:
                if 'request' not in s:
                    continue
                have = M.versioned(f'{M.raw_dir(a)}/{s["raw"]}/metadata.json')
                jobs.append(Job(a, s['endpoint'], s['request'], 1, have, f'{a["key"]} set {s["name"]}', {'set': s}))
        elif kind == 'tileset':
            have = M.versioned(f'{M.raw_dir(a)}/metadata.json')
            jobs.append(Job(a, src['endpoint'], src['request'], 1, have, a['key']))
    return jobs


def image_ref(ref, man):
    """{"$image": path, "scale": k, "padTo": [w, h]} -> PNG bytes (pad first, then nearest-neighbour scale)."""
    from PIL import Image
    im = Image.open(ref['$image']).convert('RGBA')
    if ref.get('padTo'):
        w, h = ref['padTo']
        canvas = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        canvas.paste(im, ((w - im.width) // 2, (h - im.height) // 2), im)
        im = canvas
    k = ref.get('scale', 1)
    if k != 1:
        im = im.resize((im.width * k, im.height * k), Image.NEAREST)
    buf = io.BytesIO()
    im.save(buf, 'PNG')
    return buf.getvalue(), im.size


def palette_ref(name, man):
    """A forced-palette image from the manifest's palettes: {"from": path(s), "crop": box, "colors": n}."""
    import numpy as np
    from PIL import Image
    p = man['palettes'][name]
    srcs = p['from'] if isinstance(p['from'], list) else [p['from']]
    pixels = []
    for s in srcs:
        im = Image.open(s).convert('RGBA')
        if p.get('crop'):
            im = im.crop(tuple(p['crop']))
        a = np.asarray(im).reshape(-1, 4)
        pixels.append(a[a[:, 3] > 0][:, :3])  # only visible pixels: transparency adds no colour
    px = np.concatenate(pixels)
    q = Image.fromarray(px.reshape(1, -1, 3).astype(np.uint8), 'RGB').quantize(p.get('colors', 32))
    pal = q.getpalette()
    used = sorted(i for _, i in q.getcolors())
    # A swatch: one 8 x 8 block per colour, 8 colours a row.
    rows = -(-len(used) // 8)
    sw = Image.new('RGB', (64, rows * 8), tuple(pal[used[0] * 3:used[0] * 3 + 3]))
    for n, i in enumerate(used):
        x, y = n % 8 * 8, n // 8 * 8
        sw.paste(tuple(pal[i * 3:i * 3 + 3]), (x, y, x + 8, y + 8))
    buf = io.BytesIO()
    sw.save(buf, 'PNG')
    return buf.getvalue()


def terrain_ref(ref, a):
    """{"$ref": "<set>.<lower|upper>"} -> that generated set's terrain id (to reuse the same terrain)."""
    name, side = ref['$ref'].split('.')
    path = M.versioned(f'{M.raw_dir(a)}/{name}/metadata.json')
    if not path:
        raise SystemExit(f'{a["key"]}: set {name} must be generated first (its {side} terrain id is reused)')
    meta = json.load(open(path, encoding='utf-8'))
    ids = (meta.get('metadata') or {}).get('terrain_ids') or {}
    tid = ids.get(side) or ids.get(f'{side}_base_tile_id')
    if not tid:
        pure = [t for t in meta['tiles'] if all(c == side for c in t['corners'].values())]
        tid = pure[0]['id'] if pure else None
    if not tid:
        raise SystemExit(f'{a["key"]}: no {side} terrain id in {path}')
    return tid


def resolve(body, a, man, dry=False):
    """The request body with $image / $palette / $ref filled in, and a copy safe for sidecars (hashes, not base64)."""
    def walk(v):
        if isinstance(v, dict) and '$image' in v:
            data, size = image_ref(v, man)
            return ({'type': 'base64', 'base64': base64.b64encode(data).decode(), 'format': 'png'},
                    {'type': 'base64', 'sha256': M.sha256(data), 'path': v['$image'], 'scale': v.get('scale', 1), 'padTo': v.get('padTo'), 'size': list(size)})
        if isinstance(v, dict) and '$palette' in v:
            data = palette_ref(v['$palette'], man)
            return ({'type': 'base64', 'base64': base64.b64encode(data).decode(), 'format': 'png'},
                    {'type': 'base64', 'sha256': M.sha256(data), 'palette': v['$palette']})
        if isinstance(v, dict) and '$ref' in v:
            if dry and not M.versioned(f'{M.raw_dir(a)}/{v["$ref"].split(".")[0]}/metadata.json'):
                return f'<{v["$ref"]} terrain id>', f'<{v["$ref"]}>'
            tid = terrain_ref(v, a)
            return tid, tid
        if isinstance(v, dict):
            pairs = {k: walk(x) for k, x in v.items()}
            return {k: p[0] for k, p in pairs.items()}, {k: p[1] for k, p in pairs.items()}
        if isinstance(v, list):
            pairs = [walk(x) for x in v]
            return [p[0] for p in pairs], [p[1] for p in pairs]
        return v, v
    return walk(body)


def load_spec(refresh=False):
    """The live OpenAPI spec (a free GET), cached in assets/art-wip/cache/ (gitignored)."""
    from pixellab import download
    if refresh or not os.path.exists(SPEC_CACHE):
        raw, _ = download(SPEC_URL)
        os.makedirs(os.path.dirname(SPEC_CACHE), exist_ok=True)
        with open(SPEC_CACHE, 'wb') as f:
            f.write(raw)
    return json.load(open(SPEC_CACHE, encoding='utf-8'))


def check_body(spec, endpoint, body):
    """Field names, enums and number ranges of a request body against the spec. Returns problems."""
    S = spec['components']['schemas']

    def deref(s):
        while isinstance(s, dict) and '$ref' in s:
            s = S[s['$ref'].split('/')[-1]]
        return s

    def options(s):
        s = deref(s)
        return [deref(x) for x in s['anyOf']] if 'anyOf' in s else [s]

    def check(value, schema, where):
        probs = []
        opts = [o for o in options(schema) if o.get('type') != 'null'] or options(schema)
        if value is None:
            return probs
        o = next((o for o in opts if o.get('properties') and isinstance(value, dict)), opts[0])
        if isinstance(value, dict) and o.get('properties'):
            for k, v in value.items():
                if k not in o['properties']:
                    probs.append(f'{where}.{k}: not a field of this endpoint')
                else:
                    probs += check(v, o['properties'][k], f'{where}.{k}')
            for k in o.get('required', []):
                if k not in value:
                    probs.append(f'{where}.{k}: required')
        elif isinstance(value, list) and o.get('items'):
            for i, v in enumerate(value):
                probs += check(v, o['items'], f'{where}[{i}]')
        else:
            enum = next((x['enum'] for x in opts if 'enum' in x), None)
            if enum and value not in enum:
                probs.append(f'{where}: "{value}" is not one of {enum}')
            num = next((x for x in opts if x.get('type') in ('integer', 'number')), None)
            if num and isinstance(value, (int, float)) and not isinstance(value, bool):
                if 'minimum' in num and value < num['minimum'] or 'maximum' in num and value > num['maximum']:
                    probs.append(f'{where}: {value} outside {num.get("minimum")}..{num.get("maximum")}')
        return probs

    op = spec['paths'].get(endpoint, {}).get('post')
    if not op:
        return [f'{endpoint}: no POST in the spec']
    schema = op['requestBody']['content']['application/json']['schema']
    probs = check(body, schema, 'body')
    if endpoint == '/create-image-pixflux':
        w, h = body['image_size']['width'], body['image_size']['height']
        if w * h < 32 * 32 or w * h > 400 * 400:
            probs.append(f'image_size {w}x{h}: area must be between 32x32 and 400x400')
    return probs


def cmd_generate(args):
    from pixellab import balance
    man = M.load()
    jobs = plan_jobs(man, args.keys, args.reroll)
    todo = [j for j in jobs if args.reroll or not j.have]
    spent = M.ledger_total()
    budget = man['budget']['generations']
    spec = None
    try:
        spec = load_spec(args.refresh_spec)
    except Exception as e:  # the spec check is a help, not a gate, when offline
        print(f'  (could not load the OpenAPI spec: {e})')

    print(f'{"key / unit":44s} {"endpoint":26s} {"cost":>6s}  status')
    total = 0
    problems = 0
    for j in jobs:
        blocked = j.endpoint in EXPENSIVE and not args.allow_expensive
        status = 'have raw (re-roll with --reroll)' if j.have and not args.reroll else 'BLOCKED (--allow-expensive)' if blocked else 'to generate'
        print(f'{j.label:44s} {j.endpoint:26s} {j.cost_text:>6s}  {status}')
        if j in todo and not blocked:
            total += j.cost
            if spec:
                body, _ = resolve(j.body, j.a, man, dry=True)
                for p in check_body(spec, j.endpoint, body):
                    print(f'      SPEC: {p}')
                    problems += 1
    print(f'total: {total:g} generations for {len([j for j in todo])} jobs; ledger {spent:g} of {budget} spent, '
          f'{budget - spent:g} left in the budget')
    for l in M.unsettled():
        print(f'  ledger: provisional line {l.get("id")} ({l.get("unit")}) is unsettled and counts {l.get("generations")} '
              f'generations: check it on pixellab.ai and settle it (see scripts/art/README.md)')
    if args.dry_run:
        try:
            sub = balance().get('subscription') or {}
            print(f'balance: {sub.get("generations")} of {sub.get("total")} subscription generations')
        except Exception as e:
            print(f'balance: could not read ({e})')
        print('dry run: nothing was generated.' + (f' {problems} spec problems to fix first.' if problems else ''))
        return 1 if problems else 0

    # A real run: three caps, all checked before anything is spent.
    if problems:
        raise SystemExit('fix the spec problems above first')
    if not args.max_generations or args.max_generations <= 0:
        raise SystemExit('a real run needs --max-generations N (and run --dry-run first)')
    if total > args.max_generations:
        raise SystemExit(f'this would cost {total:g} generations, more than --max-generations {args.max_generations}')
    if spent + total > budget:
        raise SystemExit(f'this would take the ledger to {spent + total:g}, over the budget of {budget}')
    bal = balance()
    have = float((bal.get('subscription') or {}).get('generations') or 0)
    if have < total:
        raise SystemExit(f'the account has {have:g} generations, this needs {total:g}')
    from pixellab import PixelLabError
    done, failed = 0.0, False
    for j in todo:
        if j.endpoint in EXPENSIVE and not args.allow_expensive:
            continue
        # The ledger total includes unsettled provisional lines, so a failed job still counts here.
        if done + j.cost > args.max_generations or M.ledger_total() + j.cost > budget:
            print(f'stopping before {j.label}: a cap would be passed')
            break
        print(f'generating {j.label} ...', flush=True)
        try:
            used = RUNNERS[j.endpoint](j, man)
        except PixelLabError as e:
            print(f'stopped at {j.label}: {e}')
            failed = True
            break
        done += used
        print(f'  done: {used:g} generations')
    print(f'generated: {done:g} generations; ledger now {M.ledger_total():g} of {budget}. Next: art.py process')
    compare_balance(have, spent)
    return 1 if failed else 0


def compare_balance(before, ledger_before):
    """After a real run: what the account says was used, next to what the ledger logged."""
    from pixellab import balance
    try:
        after = float((balance().get('subscription') or {}).get('generations') or 0)
    except Exception as e:
        print(f'balance: could not read it after the run ({e})')
        return
    used, logged = before - after, M.ledger_total() - ledger_before
    print(f'balance: {before:g} before, {after:g} after, so the account used {used:g}; the ledger grew by {logged:g}')
    if abs(used - logged) > 1e-6:
        print(f'  they differ by {used - logged:g}: check the usage on pixellab.ai (the balance can lag a little) '
              f'and settle the ledger by hand if a line is wrong')


def usage_generations(usage, fallback):
    if isinstance(usage, dict) and usage.get('type') == 'generations' and usage.get('generations') is not None:
        return float(usage['generations'])
    return float(fallback)


def log(j, used, usage, ids, files, settles=None):
    """The real cost of a finished job; settles = the id of its provisional line, which then stops counting."""
    line = {'kind': 'generation', 'key': j.a['key'], 'unit': j.label, 'endpoint': j.endpoint, 'generations': used,
            'estimated': j.cost, 'usage': usage, 'ids': ids, 'raw': files}
    M.append_ledger({**line, 'settles': settles} if settles else line)


# The ledger around a paid call. pixellab.call sends a POST once (again only after a 429, when
# nothing was accepted), and the estimated cost goes in the ledger the moment PixelLab accepts
# a job, as a 'provisional' line. The real 'generation' line settles it when the job is done.
# A job that fails or times out after that keeps its provisional line, which keeps counting
# (M.ledger_total), so the budget never shows less than may have been spent.

def provisional(j, ids, note='accepted, job running'):
    """Log a paid job's estimated cost now. Returns the line's id (what the real line settles)."""
    pid = uuid.uuid4().hex[:12]
    M.append_ledger({'kind': 'provisional', 'id': pid, 'key': j.a['key'], 'unit': j.label, 'endpoint': j.endpoint,
                     'generations': j.cost, 'ids': ids, 'note': note})
    return pid


def left_open(j, pid, ids, why, hint=''):
    """A paid job went wrong after PixelLab may have charged it: say what to check."""
    print(f'  {j.label}: {why}')
    print(f'  The ledger keeps counting provisional line {pid} ({j.cost:g} generations).\n'
          f'  Check on pixellab.ai what was made and charged (your usage history; ids: {ids or "none returned"}).{hint}\n'
          f'  Then settle the line in {M.LEDGER}: append a generation line with the real cost and "settles": "{pid}",\n'
          f'  or set "settled": true on it if nothing was charged.')


def paid_post(j, body, timeout=120):
    """Send a paid POST once. Returns (status, answer) when PixelLab accepted it. A clear refusal
    (4xx) cost nothing; no answer (network error, timeout) or a 5xx may have been charged, so that
    is logged as a provisional line before giving up."""
    from pixellab import call, PixelLabError
    try:
        st, r = call('POST', j.endpoint, body, timeout=timeout)
    except PixelLabError as e:
        left_open(j, provisional(j, {}, 'no answer to the POST'), {}, f'no answer from PixelLab ({e})')
        raise
    if st >= 500:
        left_open(j, provisional(j, {}, f'HTTP {st} to the POST'), {}, f'PixelLab answered {st}: {str(r)[:300]}')
        raise PixelLabError(f'{j.endpoint}: {st}')
    if st >= 300 or not isinstance(r, dict):
        raise PixelLabError(f'{j.endpoint}: refused, {st} {str(r)[:400]}')
    return st, r


def run_pixflux(j, man):
    body, safe = resolve(j.body, j.a, man)
    st, r = paid_post(j, body, timeout=300)
    # The answer is the finished image (there is no job): its real cost goes in the ledger before anything else.
    used = usage_generations(r.get('usage'), j.cost)
    path = M.next_version(f'{M.raw_dir(j.a)}/{j.a["key"]}.png')
    log(j, used, r.get('usage'), {}, [path])
    img = r['image']['base64'] if isinstance(r['image'], dict) else r['image']
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as f:
        f.write(base64.b64decode(img))
    M.write_sidecar(path, {'key': j.a['key'], 'endpoint': f'POST {j.endpoint}', 'request': safe, 'seed': body.get('seed'),
                           'usage': r.get('usage'), 'generations': used, 'created_at': M.now(), 'recovered': False})
    return used


def run_tileset(j, man):
    from pixellab import call, wait_job, PixelLabError
    body, safe = resolve(j.body, j.a, man)
    # A terrain reused through <side>_base_tile_id keeps the walkability its own
    # tileset gave it: PixelLab refuses the request (422) if we set it again.
    for side in ('lower', 'upper'):
        if body.get(f'{side}_base_tile_id'):
            body.pop(f'{side}_walkable', None)
            safe.pop(f'{side}_walkable', None)
    st, r = paid_post(j, body)
    ids = {'tileset_id': r.get('tileset_id'), 'background_job_id': r.get('background_job_id')}
    pid = provisional(j, ids)
    try:
        if not ids['tileset_id'] or not ids['background_job_id']:
            raise PixelLabError(f'{j.endpoint}: no tileset_id/background_job_id in the answer: {str(r)[:300]}')
        job = wait_job(r['background_job_id'], timeout=1200)
        if job.get('status') != 'completed':
            raise PixelLabError(f'tileset job {r["background_job_id"]}: {job.get("status")} {str(job.get("last_response"))[:300]}')
        st, ts = call('GET', f'/tilesets/{r["tileset_id"]}')
        if st != 200:
            raise PixelLabError(f'GET /tilesets/{r["tileset_id"]}: {st} {str(ts)[:300]}')
        s = j.extra.get('set')
        folder = f'{M.raw_dir(j.a)}/{s["raw"]}' if s else M.raw_dir(j.a)
        os.makedirs(folder, exist_ok=True)
        usage = job.get('usage') or r.get('usage')
        used = usage_generations(usage, j.cost)
        info = {'key': j.a['key'], 'set': s and s['name'], 'endpoint': f'POST {j.endpoint}', 'request': safe, 'seed': body.get('seed'),
                'ids': ids, 'usage': usage, 'created_at': (ts.get('metadata') or {}).get('created_at') or M.now(), 'recovered': False}
        files = []
        for i, t in enumerate(ts['tileset']['tiles']):
            path = M.next_version(f'{folder}/tile_{i:02d}.png')
            with open(path, 'wb') as f:
                f.write(base64.b64decode(t['image']['base64']))
            M.write_sidecar(path, {**info, 'tile': {k: v for k, v in t.items() if k != 'image'}})
            files.append(path)
        meta = {'usage': usage, 'tileset_id': r['tileset_id'], 'metadata': ts.get('metadata'),
                'tiles': [{k: v for k, v in t.items() if k != 'image'} for t in ts['tileset']['tiles']]}
        mpath = M.next_version(f'{folder}/metadata.json')
        with open(mpath, 'w', encoding='utf-8', newline='\n') as f:
            json.dump(meta, f, indent=1)
            f.write('\n')
    except Exception as e:
        left_open(j, pid, ids, f'{type(e).__name__}: {e}',
                  ' A finished tileset can be read for free with GET /tilesets/<tileset_id>.')
        raise
    log(j, used, usage, ids, files + [mpath], settles=pid)
    return used


def run_character_animation(j, man):
    from pixellab import call, wait_job, download, PixelLabError
    body, safe = resolve(j.body, j.a, man)
    cid = body['character_id']
    st, r = paid_post(j, body)
    group_id = r.get('animation_group_id')
    ids = {'character_id': cid, 'animation_group_id': group_id, 'background_job_ids': r.get('background_job_ids')}
    pid = provisional(j, ids)
    try:
        if not r.get('background_job_ids'):
            raise PixelLabError(f'{j.endpoint}: no background_job_ids in the answer: {str(r)[:300]}')
        used, usages, bad = 0.0, [], []
        for jid in r['background_job_ids']:
            job = wait_job(jid, timeout=1800)
            usages.append(job.get('usage'))
            used += usage_generations(job.get('usage'), COSTS[j.endpoint])
            if job.get('status') != 'completed':
                bad.append(f'job {jid}: {job.get("status")} {str(job.get("last_response"))[:200]}')
        if bad:
            raise PixelLabError('; '.join(bad))
        st, ch = call('GET', f'/characters/{cid}')
        if st != 200:
            raise PixelLabError(f'GET /characters/{cid}: {st}')
        group = next((g for g in ch.get('animations', []) if g.get('animation_group_id') == group_id), None)
        if not group:
            raise PixelLabError(f'animation group {group_id} not found on character {cid}')
        files = []
        base = f'{M.raw_dir(j.a)}/{j.a["pick"].get("folder", "animations/walk")}'
        for d in group.get('directions', []):
            if d['direction'] not in body['directions']:
                continue
            folder = M.next_version(f'{base}/{d["direction"]}')  # never overwrite: a re-roll goes to <direction>.v2/
            os.makedirs(folder)
            for i, url in enumerate(d.get('frames', [])):
                raw, _ = download(url)
                path = f'{folder}/frame_{i:03d}.png'
                with open(path, 'wb') as f:
                    f.write(raw)
                M.write_sidecar(path, {'key': j.a['key'], 'endpoint': f'POST {j.endpoint}', 'request': safe, 'seed': body.get('seed'),
                                       'ids': ids, 'usage': usages, 'url': url.split('?')[0], 'animation_type': group.get('animation_type'),
                                       'created_at': M.now(), 'recovered': False})
                files.append(path)
    except Exception as e:
        left_open(j, pid, ids, f'{type(e).__name__}: {e}',
                  ' Frames that were made can be downloaded for free with art.py fetch.')
        raise
    log(j, used, usages, ids, files, settles=pid)
    return used


def run_unsupported(j, man):
    raise SystemExit(f'{j.endpoint}: no runner written for this endpoint yet')


RUNNERS = {
    '/create-image-pixflux': run_pixflux,
    '/create-tileset': run_tileset,
    '/characters/animations': run_character_animation,
    '/map-objects': run_unsupported,
    '/create-1-direction-object': run_unsupported,
}


# ---------------------------------------------------------------------------
# The other commands.

def cmd_process(args):
    import process
    return process.run(args.keys, force=args.force)


def cmd_suggest_roofs(args):
    import process
    return process.suggest_roofs(args.k)


def cmd_verify(args):
    import verify
    if args.night_tint:
        return verify.night_tint()
    return verify.run()


def cmd_build_map(args):
    try:
        import build_map
    except ModuleNotFoundError as e:
        if e.name != 'build_map':
            raise
        print('build-map: scripts/art/build_map.py is not written yet')
        return 1
    return build_map.main(args.level, force=args.force, ground_only=args.ground_only, refit_objects=args.refit_objects)


def main(argv=None):
    M.chdir_root()
    ap = argparse.ArgumentParser(prog='art.py', description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    sub.add_parser('fetch', help='recover trial files, download character rotations and frames (free)').set_defaults(fn=cmd_fetch)
    g = sub.add_parser('generate', help='spend PixelLab generations (always --dry-run first)')
    g.add_argument('keys', nargs='*')
    g.add_argument('--dry-run', action='store_true', help='print the jobs and their cost; spend nothing')
    g.add_argument('--max-generations', type=float, default=0, help='a real run spends at most this many')
    g.add_argument('--reroll', action='store_true', help='generate again even if the raw exists (saved as .v2, .v3...)')
    g.add_argument('--allow-expensive', action='store_true', help='allow endpoints that cost 10-25 generations a call')
    g.add_argument('--refresh-spec', action='store_true', help='download the OpenAPI spec again')
    g.set_defaults(fn=cmd_generate)
    p = sub.add_parser('process', help='raw -> final PNGs')
    p.add_argument('keys', nargs='*')
    p.add_argument('--force', action='store_true', help='also replace finals that were edited by hand')
    p.set_defaults(fn=cmd_process)
    r = sub.add_parser('suggest-roofs', help='k-means the house roof colours into houseRoofs')
    r.add_argument('-k', type=int, default=5)
    r.set_defaults(fn=cmd_suggest_roofs)
    b = sub.add_parser('build-map', help='compose a level map (Tiled JSON) from the final PNGs')
    b.add_argument('level', choices=['masroor'])
    grp = b.add_mutually_exclusive_group()
    grp.add_argument('--force', action='store_true')
    grp.add_argument('--ground-only', action='store_true')
    grp.add_argument('--refit-objects', action='store_true')
    b.set_defaults(fn=cmd_build_map)
    v = sub.add_parser('verify', help='check final/ against the manifest')
    v.add_argument('--night-tint', action='store_true', help='fit night = a * day + b from the legacy day/night maps')
    v.set_defaults(fn=cmd_verify)
    args = ap.parse_args(argv)
    return args.fn(args) or 0


if __name__ == '__main__':
    sys.exit(main())
