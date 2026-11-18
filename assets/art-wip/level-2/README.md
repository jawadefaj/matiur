# Level 2 art: work in progress

Every image made or processed for Level 2 is kept here. The images the game actually loads are copied to `assets/sprites/`.

| Folder | What's in it |
|---|---|
| `extracted/` | Matiur's service-dress poses sampled off the pixel grid of `character-matiur-turnaround.jpeg` (about 6.65 px per art pixel), at native size, padded to 64 × 64. Made for free, no AI. |
| `pixellab/` | Results from PixelLab: the night guard in 8 directions, Matiur's 4 rotations (from the extracted poses), a sand-to-asphalt tileset (16 tiles of 16 px) and an 8-frame south walk for Matiur. Not used in the game yet, except the guard. |
| `processed/` | What the build script makes: the walk-map region by day and night, Matiur and the guard halved to walk scale, and the T-33 cut out of `vehicle-paf-plane-sprite.jpeg`. |
| `previews/` | Contact sheets and scale checks. |
| `screenshots/` | The first version running in the browser. |

## Rebuilding

```bash
python3 assets/art-wip/level-2/build_level2_art.py
```

It reads `assets/sprites/original/` and `pixellab/`, writes `processed/` and `previews/`, and writes the game PNGs:
`walk_masroor_day.png`, `walk_masroor_night.png`, `walk_matiur_sd.png`, `walk_guard.png`, `walk_t33.png`.

`extract.py` samples pixel art drawn large back to one image pixel per art pixel. `pl.py` is a tiny PixelLab API client; the key is injected by the cloud environment, never stored in the repo.

## PixelLab use so far

Trial account, 40 generations: Matiur rotations 0.25, guard 2, tileset 1, Matiur south walk 1. 35.75 left.
