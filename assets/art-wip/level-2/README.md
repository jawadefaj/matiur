# Level 2 art: work in progress

Every image made or processed for Level 2 is kept here. The images the game actually loads are copied to `assets/sprites/`.

| Folder | What's in it |
|---|---|
| `extracted/` | Matiur's service-dress poses sampled off the pixel grid of `character-matiur-turnaround.jpeg` (about 6.65 px per art pixel), at native size, padded to 64 × 64. Made for free, no AI. |
| `pixellab/` | Results from PixelLab: the night guard in 8 directions, Matiur's 4 rotations (from the extracted poses), a sand-to-asphalt tileset (16 tiles of 16 px) and an 8-frame south walk for Matiur. Not used in the game yet, except the guard. |
| `processed/` | What the build script makes: the walk-map region by day and night, Matiur and the guard halved to walk scale, and the T-33 cut out of `vehicle-paf-plane-sprite.jpeg`. |
| `previews/` | Contact sheets and scale checks. |
| `screenshots/` | The first version running in the browser. |

## The walk map (version 2)

`build_masroor_map.py` rebuilds the Masroor map at full resolution (2480 × 1880, 1 px = 1 world px) instead of zooming the JPEG 4x:

- Ground types (sand, asphalt, concrete, runway and taxiway paint) are read from the original map's colours and repainted with PixelLab's sand and asphalt tiles. Concrete is the sand tile greyed, with slab joints.
- Every object stands where it is on the original (positions logged by hand in the script). Each kind of thing is **one** PixelLab generation (`pixellab/objects/`): house, hospital, tree, bush, watchtower, fuel tank, control tower, T-33, pond, running track, revetment, signals building. Houses are one image with the roof recoloured to each original house's colour.
- The solar panels on the original are left out (an anachronism, GDD §6.10).
- It writes the colliders for houses, buildings, tanks, towers, tree trunks, parked jets, the pond and the perimeter wall to `src/mechanics/walk/levels/masroorLayout.json`.

`gen_pixflux.py` makes the objects (palette forced from the original map). `house_rejected_mapobject.png` is a first try with the map-object tool, kept for reference.

## Rebuilding

```bash
python3 assets/art-wip/level-2/build_level2_art.py
```

It reads `assets/sprites/original/` and `pixellab/`, writes `processed/` and `previews/`, and writes the character PNGs:
`walk_matiur_sd.png` and `walk_guard.png`. Then run `python3 assets/art-wip/level-2/build_masroor_map.py` for the map, its colliders and `walk_t33.png`'s source.

`extract.py` samples pixel art drawn large back to one image pixel per art pixel. `pl.py` is a tiny PixelLab API client; the key is injected by the cloud environment, never stored in the repo.

## PixelLab use so far

Trial account, 40 generations: Matiur rotations 0.25, guard 2, tileset 1, Matiur south walk 1, map objects 13 (12 kept, 1 rejected). 22.75 left.
