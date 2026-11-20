"""Check that assets/sprites/final/ matches the manifest, and fit the night tint.

verify fails (exit 1) when:
  - a manifest key has no PNG at final/<category>/<key>.png, or it is not RGBA,
    or its size breaks the size rule ('exact': equal, 'max': no bigger);
  - a PNG sits directly in assets/sprites/ (the game only loads final/);
  - two PNGs under final/ share a file name (the key is the file name);
  - a PNG under final/ is not in the manifest (legacy files listed in the
    manifest are reported, not failed);
  - a final is out of date: the files it was made from (raw versions, walk frames,
    template, source map) or its manifest recipe changed since process recorded
    them in the entry's processed field, or a key made from raw files has no such
    record. A final whose own sha256 differs from the record was painted by hand:
    that is reported as hand-edited, not failed;
  - the generation ledger (unsettled provisional lines included) is over the manifest budget;
  - the manifest itself is malformed (unknown category, owner, size rule...);
  - a level map (.tmj, build_map.LEVELS) is missing or broken: tile layer data that
    is compressed, a gid that no tileset holds, an object not drawn at its picture's
    size, an atlas tile without a bool walkable, an empty ground cell, a missing
    gameplay marker, a blocking rectangle of zero size, or, while the map
    property legacy is true, colliders that differ from the old ones in
    tests/mechanics/walk/fixtures/masroorLayout.legacy.json
    (computed the way src/core/tiled.ts does, see tmj.py).
Stand-ins (paid keys not generated yet) are reported, not failed.
"""
import collections
import glob
import os

import numpy as np
from PIL import Image

import manifest as M

OWNERS = ('core', 'walk', 'flight')
SIZE_RULES = ('exact', 'max')
KINDS = ('pixellab-character', 'local', 'pixflux', 'tileset', 'template', 'procedural', 'derived')


def check_manifest(man, errors):
    seen = set()
    for a in man['assets']:
        k = a.get('key', '?')
        if k in seen:
            errors.append(f'{k}: listed twice in the manifest')
        seen.add(k)
        if a.get('category') not in M.CATEGORIES:
            errors.append(f'{k}: category "{a.get("category")}" is not one of {M.CATEGORIES}')
        if a.get('owner') not in OWNERS:
            errors.append(f'{k}: owner "{a.get("owner")}" is not one of {OWNERS}')
        if a.get('owner') == 'walk' and not k.startswith('walk_'):
            errors.append(f'{k}: walk texture keys must start with walk_')
        if a.get('sizeRule', 'exact') not in SIZE_RULES:
            errors.append(f'{k}: sizeRule must be one of {SIZE_RULES}')
        if a.get('source', {}).get('kind') not in KINDS:
            errors.append(f'{k}: source kind "{a.get("source", {}).get("kind")}" is not one of {KINDS}')
        fp = (a.get('map') or {}).get('footprint')
        if fp and not (len(fp) == 4 and 0 <= fp[0] < fp[2] <= 1 and 0 <= fp[1] < fp[3] <= 1):
            errors.append(f'{k}: footprint {fp} must be fractions fx0 < fx1, fy0 < fy1 in 0..1')


def has_raw(a):
    """Does the paid source of this key exist yet (its PixelLab output)?"""
    import process as P
    kind = a['source']['kind']
    if kind == 'pixflux':
        return bool(P.raw_file(a))
    if kind == 'pixellab-character':
        return all(P.walk_frames(a, d) for d in a['pick']['rows'].values())
    if kind == 'tileset' and 'sets' in a['source']:
        return all(M.versioned(f'{M.raw_dir(a)}/{s["raw"]}/metadata.json') for s in a['source']['sets'])
    if kind == 'tileset':
        return bool(M.versioned(f'{M.raw_dir(a)}/metadata.json'))
    return True


def check_processed(a, man, path, errors, notes):
    """Is the final still what process makes from today's sources? Out of date is an error;
    edited by hand is a note (process will not overwrite it without --force)."""
    import process as P
    k = a['key']
    rec = a.get('processed')
    try:
        now = P.inputs(a, man)
    except (OSError, ValueError, KeyError) as e:
        errors.append(f'{k}: could not read what it is made from ({e})')
        return
    if now is None:
        return  # process does not make it yet (a character keeping its current sheet)
    if not rec:
        if any(p.startswith(M.RAW + '/') for p in now):
            errors.append(f'{k}: made from raw files but has no processed record: run art.py process {k}')
        else:
            notes.append(f'{k}: no processed record yet (art.py process {k} records one)')
        return
    old = rec.get('inputs') or {}
    changed = sorted(p for p in set(old) | set(now) if old.get(p) != now.get(p))
    what = ', '.join(changed[:3]) + (f' and {len(changed) - 3} more' if len(changed) > 3 else '')
    if M.sha256(path) != rec.get('sha256'):
        notes.append(f'{k}: hand-edited ({path} is not what process made; process keeps it unless --force)'
                     + (f'; what it was made from changed since: {what}' if changed else ''))
    elif changed:
        errors.append(f'{k}: out of date: run art.py process {k} (changed: {what})')


def run():
    man = M.load()
    errors, notes = [], []
    check_manifest(man, errors)
    keys = {a['key']: a for a in man['assets']}
    legacy = {os.path.normpath(l['path']) for l in man.get('legacy', [])}

    # PNGs directly in assets/sprites/.
    for p in glob.glob(f'{M.SPRITES}/*.png'):
        errors.append(f'{p}: PNGs must live in final/<category>/, not assets/sprites/')

    # Every PNG under final/: unique names, all in the manifest.
    by_name = collections.defaultdict(list)
    for p in glob.glob(f'{M.FINAL}/**/*.png', recursive=True):
        by_name[os.path.basename(p)[:-4]].append(os.path.normpath(p))
    for name, paths in sorted(by_name.items()):
        if len(paths) > 1:
            errors.append(f'{name}: {len(paths)} PNGs share this name: {", ".join(paths)}')
        for p in paths:
            if p in legacy:
                notes.append(f'{name}: legacy file {p}, kept for now (see manifest "legacy")')
            elif name not in keys:
                errors.append(f'{p}: not in the manifest')

    # Every manifest key: one RGBA PNG at final/<category>/<key>.png of the right size.
    stand_ins = []
    for k, a in keys.items():
        path = M.final_path(a)
        if not os.path.exists(path):
            errors.append(f'{k}: missing {path}')
            continue
        if os.path.normpath(path) not in by_name.get(k, []):
            errors.append(f'{k}: expected at {path}')
        im = Image.open(path)
        if im.mode != 'RGBA':
            errors.append(f'{k}: {path} is {im.mode}, must be RGBA')
        w, h = a['size']
        rule = a.get('sizeRule', 'exact')
        if rule == 'exact' and im.size != (w, h):
            errors.append(f'{k}: {im.width}x{im.height}, manifest says exactly {w}x{h}')
        if rule == 'max' and (im.width > w or im.height > h):
            errors.append(f'{k}: {im.width}x{im.height}, manifest says at most {w}x{h}')
        check_processed(a, man, path, errors, notes)
        if M.is_paid(a) and not has_raw(a):
            what = 'current sheet kept' if a['source']['kind'] == 'pixellab-character' else 'stand-in'
            stand_ins.append(f'{k}: {what}, pending generation (~{a.get("estGenerations", "?")} generations)')

    # The budget.
    total = M.ledger_total()
    budget = man['budget']['generations']
    if total > budget:
        errors.append(f'ledger: {total:g} generations spent, budget is {budget}')
    for l in M.unsettled():
        notes.append(f'ledger: provisional line {l.get("id")} ({l.get("unit")}) is unsettled and counts '
                     f'{l.get("generations")} generations: check it on pixellab.ai and settle it')
    planned = sum(a.get('estGenerations', 0) for a in keys.values() if M.is_paid(a) and not has_raw(a))

    # The level maps built from these PNGs.
    import build_map
    for level in build_map.LEVELS:
        map_errors, map_notes = build_map.check_map(level)
        errors += map_errors
        notes += [f'map {level}: {n}' for n in map_notes]

    print(f'verify: {len(keys)} manifest keys, {sum(len(v) for v in by_name.values())} PNGs under final/')
    for n in notes:
        print(f'  note: {n}')
    for s in stand_ins:
        print(f'  {s}')
    print(f'  budget: {total:g} of {budget} generations spent; about {planned} planned for the stand-ins')
    for e in errors:
        print(f'  FAIL: {e}')
    print('verify: ' + ('FAILED' if errors else 'OK'))
    return 1 if errors else 0


def night_tint():
    """Least-squares fit, per channel, of night = a * day + b over the legacy day/night maps (0..1 units)."""
    pairs = [(f'{M.FINAL}/walk_masroor_day.png', f'{M.FINAL}/walk_masroor_night.png'),
             ('assets/art-wip/level-2/processed/masroor_map_day.png', 'assets/art-wip/level-2/processed/masroor_map_night.png')]
    for day_p, night_p in pairs:
        if os.path.exists(day_p) and os.path.exists(night_p):
            break
    else:
        print('night-tint: no day/night map pair found')
        return 1
    day = np.asarray(Image.open(day_p).convert('RGB')).reshape(-1, 3).astype(float) / 255
    night = np.asarray(Image.open(night_p).convert('RGB')).reshape(-1, 3).astype(float) / 255
    print(f'night-tint: {day_p} -> {night_p}')
    out = []
    for c, name in enumerate('RGB'):
        x, y = day[:, c], night[:, c]
        a, b = np.polyfit(x, y, 1)
        rms = float(np.sqrt(np.mean((a * x + b - y) ** 2)))
        out.append((a, b))
        print(f'  {name}: night = {a:.4f} * day + {b:.4f}   (rms error {rms * 255:.1f} of 255)')
    print('  a = [' + ', '.join(f'{a:.4f}' for a, _ in out) + ']')
    print('  b = [' + ', '.join(f'{b:.4f}' for _, b in out) + ']')
    return 0
