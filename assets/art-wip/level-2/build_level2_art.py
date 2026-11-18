"""Build the minimal Level 2 art from the uploaded originals.

Run from the repo root:  python3 assets/art-wip/level-2/build_level2_art.py
Intermediate images go to assets/art-wip/level-2/, game PNGs to assets/sprites/.
"""
import sys, os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from extract import extract, pad  # noqa: E402

ORIG = 'assets/sprites/original'
OUT = 'assets/sprites'
WIP = HERE
os.makedirs(f'{WIP}/processed', exist_ok=True)
os.makedirs(f'{WIP}/previews', exist_ok=True)


def save(img, *paths):
    for p in paths:
        img.save(p)
        print('saved', p, img.size)


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


def walker_sheet(dirs, frame):
    """A 3x4 walker sheet (rows down, left, right, up) with the same still image in every column."""
    fw, fh = frame
    sheet = Image.new('RGBA', (fw * 3, fh * 4), (0, 0, 0, 0))
    for r, d in enumerate(['down', 'left', 'right', 'up']):
        im = dirs[d]
        for c in range(3):
            sheet.paste(im, (c * fw + (fw - im.width) // 2, r * fh + fh - im.height - 1), im)
    return sheet


# 1. The walk map: master-map region x 600-1220, y 430-900, day and night.
m = Image.open(f'{ORIG}/airport-level-map-clean.jpeg').convert('RGB').crop((600, 430, 1220, 900))
save(m, f'{WIP}/processed/masroor_east_day.png', f'{OUT}/walk_masroor_day.png')
a = np.asarray(m).astype(float) / 255
lum = a.mean(2, keepdims=True)
night = a * 0.28 + lum * np.array([0.10, 0.14, 0.26])  # dark, desaturated, blue
night = Image.fromarray((np.clip(night, 0, 1) * 255).astype(np.uint8))
save(night, f'{WIP}/processed/masroor_east_night.png', f'{OUT}/walk_masroor_night.png')

# 2. Matiur in service dress: the extracted turnaround poses, halved to walk scale.
src = f'{ORIG}/character-matiur-turnaround.jpeg'
poses = {'down': extract(src, (40, 10, 265, 400)), 'right': extract(src, (340, 10, 545, 400)), 'up': extract(src, (640, 10, 860, 400))}
poses['left'] = poses['right'].transpose(Image.FLIP_LEFT_RIGHT)
small = {}
for d, im in poses.items():
    save(im, f'{WIP}/processed/matiur_{d}_native.png')
    small[d] = half(im)
    save(small[d], f'{WIP}/processed/matiur_{d}_walk.png')
save(walker_sheet(small, (20, 30)), f'{OUT}/walk_matiur_sd.png')

# 3. The night guard (PixelLab), halved to walk scale.
pl = f'{WIP}/pixellab'
g = {'down': 'south', 'left': 'west', 'right': 'east', 'up': 'north'}
gs = {}
for d, n in g.items():
    im = Image.open(f'{pl}/guard_{n}.png').convert('RGBA')
    im = im.crop(im.getbbox())
    gs[d] = half(im)
    save(gs[d], f'{WIP}/processed/guard_{d}_walk.png')
fw = max(i.width for i in gs.values()) + 2
fh = max(i.height for i in gs.values()) + 2
save(walker_sheet(gs, (fw, fh)), f'{OUT}/walk_guard.png')

# 4. Bluebird, the T-33, from above, nose up.
t = Image.open(f'{ORIG}/vehicle-paf-plane-sprite.jpeg').convert('RGB')
ta = np.asarray(t).astype(int)
bg = ta[3, 3]
alpha = (np.abs(ta - bg).sum(2) > 60).astype(np.uint8) * 255
timg = Image.fromarray(np.dstack([ta.astype(np.uint8), alpha]), 'RGBA')
timg = timg.crop(timg.getbbox())
save(timg, f'{WIP}/processed/t33_cutout.png')
target_w = 96
t33 = timg.resize((target_w, round(timg.height * target_w / timg.width)), Image.NEAREST)
save(t33, f'{WIP}/processed/t33_walk.png', f'{OUT}/walk_t33.png')

# 5. Preview: the night map with Matiur and a guard at game scale (x4 map).
prev = night.resize((night.width * 4, night.height * 4), Image.NEAREST).crop((1500, 1200, 2100, 1600)).convert('RGBA')
prev.alpha_composite(small['down'], (300, 200))
prev.alpha_composite(gs['left'], (420, 180))
prev.alpha_composite(t33, (60, 60))
save(prev.resize((prev.width * 2, prev.height * 2), Image.NEAREST), f'{WIP}/previews/level2_v1_scale_x2.png')
