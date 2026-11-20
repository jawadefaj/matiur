"""The asset manifest (assets/sprites/manifest.json) and the files around it.

The manifest is the single source of truth for game art: every texture key,
its folder, size, where its pixels come from (source), what is done to them
(post) and how build-map uses it (map, tile). Paths here are relative to the
repo root, and every command runs from the repo root.

Folders:
  assets/sprites/final/<category>/<key>.png       what the game loads
  assets/sprites/original/pixellab/<category>/<raw>/  raw PixelLab output + sidecars
  assets/sprites/original/pixellab/ledger.jsonl   one line per generation (budget)
  assets/sprites/templates/                       the placeholders as PNGs
"""
import hashlib
import json
import os
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SPRITES = 'assets/sprites'
MANIFEST = f'{SPRITES}/manifest.json'
FINAL = f'{SPRITES}/final'
TEMPLATES = f'{SPRITES}/templates'
RAW = f'{SPRITES}/original/pixellab'
LEDGER = f'{RAW}/ledger.jsonl'
PREVIEWS = 'assets/art-wip/previews'
CATEGORIES = ('characters', 'vehicles', 'objects', 'tiles', 'effects')
# Sources that cost PixelLab generations; until their raw files exist the key is a stand-in.
PAID = ('pixellab-character', 'pixflux', 'tileset')


def chdir_root():
    """Every path in the pipeline is relative to the repo root."""
    os.chdir(ROOT)


def load():
    with open(MANIFEST, encoding='utf-8') as f:
        return json.load(f)


def dumps(obj, ind=0, width=110):
    """JSON with 2-space indents, but short lists and objects on one line, so it stays readable."""
    flat = json.dumps(obj, ensure_ascii=False)
    if not isinstance(obj, (dict, list)) or len(flat) + ind <= width and '\n' not in flat:
        return flat
    pad, inner = ' ' * ind, ' ' * (ind + 2)
    if isinstance(obj, list):
        if not obj:
            return '[]'
        return '[\n' + ',\n'.join(inner + dumps(v, ind + 2, width) for v in obj) + '\n' + pad + ']'
    if not obj:
        return '{}'
    return '{\n' + ',\n'.join(f'{inner}{json.dumps(k, ensure_ascii=False)}: {dumps(v, ind + 2, width).lstrip()}'
                              for k, v in obj.items()) + '\n' + pad + '}'


def save(man):
    """Write the manifest back in the same readable layout."""
    with open(MANIFEST, 'w', encoding='utf-8', newline='\n') as f:
        f.write(dumps(man) + '\n')


def entries(man, keys=None):
    """Manifest entries, all of them or the named keys (unknown keys are an error)."""
    if not keys:
        return list(man['assets'])
    by = {a['key']: a for a in man['assets']}
    missing = [k for k in keys if k not in by]
    if missing:
        raise SystemExit(f'not in the manifest: {", ".join(missing)}')
    return [by[k] for k in keys]


def final_path(a):
    return f'{FINAL}/{a["category"]}/{a["key"]}.png'


def raw_dir(a):
    """Folder of the raw PixelLab files for an entry (shared raws name it in source.raw)."""
    src = a.get('source', {})
    return f'{RAW}/{a["category"]}/{src.get("rawKey", a["key"])}'


def versions(path):
    """Every version of a raw file or folder that exists, oldest first: name.png, name.v2.png, name.v3.png..."""
    base, ext = os.path.splitext(path)
    out = [path] if os.path.exists(path) else []
    n = 2
    while os.path.exists(f'{base}.v{n}{ext}'):
        out.append(f'{base}.v{n}{ext}')
        n += 1
    return out


def versioned(path):
    """The newest version of a raw file: name.png, name.v2.png, name.v3.png... or None."""
    return (versions(path) or [None])[-1]


def next_version(path):
    """A path that does not exist yet: name.png, else name.v2.png, name.v3.png..."""
    if not os.path.exists(path):
        return path
    base, ext = os.path.splitext(path)
    n = 2
    while os.path.exists(f'{base}.v{n}{ext}'):
        n += 1
    return f'{base}.v{n}{ext}'


def sha256(path_or_bytes):
    raw = path_or_bytes if isinstance(path_or_bytes, bytes) else open(path_or_bytes, 'rb').read()
    return hashlib.sha256(raw).hexdigest()


def now():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


def write_sidecar(raw_path, info):
    """Sidecar <file>.json next to a raw file: where it came from and what it cost."""
    info = {'file': os.path.basename(raw_path), 'sha256': sha256(raw_path), **info}
    with open(raw_path + '.json', 'w', encoding='utf-8', newline='\n') as f:
        json.dump(info, f, indent=1, default=str)
        f.write('\n')


def read_ledger():
    if not os.path.exists(LEDGER):
        return []
    with open(LEDGER, encoding='utf-8') as f:
        return [json.loads(line) for line in f if line.strip()]


def append_ledger(line):
    os.makedirs(os.path.dirname(LEDGER), exist_ok=True)
    with open(LEDGER, 'a', encoding='utf-8', newline='\n') as f:
        f.write(json.dumps({'at': now(), **line}, default=str) + '\n')


def unsettled(lines=None):
    """Provisional lines still open: PixelLab accepted a paid request, but no line with the real cost
    says settles: <its id> yet, and nobody marked it settled: true by hand."""
    lines = read_ledger() if lines is None else lines
    done = {l.get('settles') for l in lines if l.get('settles')}
    return [l for l in lines if l.get('kind') == 'provisional' and not l.get('settled') and l.get('id') not in done]


def ledger_total(lines=None):
    """Generations this pipeline spent: every generation line, plus the estimated cost of every
    unsettled provisional line (a job that may have been charged). Recovered trial work and
    balance checks do not count."""
    lines = read_ledger() if lines is None else lines
    spent = sum(float(l.get('generations') or 0) for l in lines if l.get('kind') == 'generation' and not l.get('recovered'))
    return spent + sum(float(l.get('generations') or 0) for l in unsettled(lines))


def footprint_px(a, size=None):
    """Collider box (x, y, w, h) in sprite px from the entry's footprint fractions, or None.

    fx = int(W * fx0), fy = int(H * fy0), fw = max(4, int(W * (fx1 - fx0))), fh = max(4, int(H * (fy1 - fy0))).
    """
    fp = (a.get('map') or {}).get('footprint')
    if not fp:
        return None
    w, h = size or a['size']
    fx0, fy0, fx1, fy1 = fp
    return int(w * fx0), int(h * fy0), max(4, int(w * (fx1 - fx0))), max(4, int(h * (fy1 - fy0)))


def is_paid(a):
    return a.get('source', {}).get('kind') in PAID
