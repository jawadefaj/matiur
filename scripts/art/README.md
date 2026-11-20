# Art pipeline (PixelLab -> game PNGs)

Every image the game loads is one PNG at `assets/sprites/final/<category>/<key>.png`. The file name is the texture key, so names must be unique across all folders. Categories: `characters`, `vehicles`, `objects`, `tiles`, `effects`. The folders are only for people: the game finds every PNG under `final/` (see `src/core/gfx/pngArt.ts`).

`assets/sprites/manifest.json` is the single source of truth. It lists every key with its size, where its pixels come from, the steps that turn the raw image into the final one, and how the map builder uses it (sort order, shadow, collider footprint, tile tables).

## Setup (once)

The scripts need Python 3.13 with Pillow and numpy, in a venv outside OneDrive:

```bash
python -m venv "$LOCALAPPDATA/matiur-art-venv"
"$LOCALAPPDATA/matiur-art-venv/Scripts/python.exe" -m pip install -r scripts/art/requirements.txt
```

In PowerShell the venv's python is `$env:LOCALAPPDATA\matiur-art-venv\Scripts\python.exe`. Below, `py` means that python.

The PixelLab API key goes in the repo-root `.env` file, which git ignores:

```
PIXELLAB_API_KEY=...
```

Never prefix it with `VITE_`: Vite puts every `VITE_*` variable into the game bundle, which would publish the key. The scripts never print the key or write it anywhere else; it only goes into the `Authorization` header of calls to `api.pixellab.ai`.

## Commands

Run every command from the repo root.

| Command | What it does | Costs |
|---|---|---|
| `py scripts/art/art.py fetch` | Copies every PixelLab file from `assets/art-wip/level-2/pixellab/` into `assets/sprites/original/pixellab/` (sidecars say `recovered: true`), downloads the characters' rotations and existing animation frames, and logs the account balance. Safe to run again. | free (GETs) |
| `py scripts/art/art.py generate [keys] --dry-run` | Lists every generation still to do, what each costs, the total, the ledger and the balance, and checks each request against the live OpenAPI spec. Spends nothing. | free |
| `py scripts/art/art.py generate [keys] --max-generations N` | Generates. Refuses unless the total fits in N, in the budget left in the ledger, and in the account balance. Writes raw files, sidecars and ledger lines. | paid |
| `py scripts/art/art.py process [keys]` | Raw -> final PNGs. Paid keys not generated yet get a stand-in. Also writes the atlas tables into the manifest and a contact sheet to `assets/art-wip/previews/final_contact_sheet.png`. | free |
| `py scripts/art/art.py suggest-roofs` | K-means the roof colours of the original map's houses into 5 colours (`houseRoofs` in the manifest, darkest first). | free |
| `py scripts/art/art.py build-map masroor [--force \| --ground-only \| --refit-objects]` | Builds the Masroor Tiled map `src/mechanics/walk/levels/masroor.tmj` from the final PNGs (`scripts/art/build_map.py`). It refuses to overwrite the map unless told how; editing it in Tiled is described in [assets/sprites/README.md](../../assets/sprites/README.md). | free |
| `py scripts/art/art.py verify` | Checks `final/` against the manifest (see below). Exit code 1 on any failure. | free |
| `py scripts/art/art.py verify --night-tint` | Fits `night = a * day + b` per channel from the old baked day and night maps. They are no longer in `final/`; it uses the copies in the gitignored `assets/art-wip/level-2/processed/` if you have them. The fit the game uses is `NIGHT_TINT` in `src/mechanics/walk/scenes/WalkScene.ts`. | free |

## The budget rule

**Always run `generate --dry-run` first**, read the table, then run the real thing with `--max-generations` set to the dry run's total. The ledger (`assets/sprites/original/pixellab/ledger.jsonl`) logs every generation; its total may never pass `budget.generations` in the manifest (150). The trial account's earlier spending is in the ledger as `recovered` and does not count.

What things cost: pixflux image 1, tileset 1, character animation 1 per direction (always pass explicit `directions`), map object 1. `create-1-direction-object` costs 10-25 a call and is blocked unless `--allow-expensive`. Downloads, imports and every GET are free.

`generate` never overwrites. A key whose raw file exists is skipped; `--reroll` makes a new version next to it (`sabre.v2.png`, `walk/south.v2/`), and `process` uses the newest version. To go back to an older one, delete or rename the newer file.

## Folders

```
assets/sprites/
  manifest.json                 the list of keys (edit by hand)
  final/<category>/<key>.png    what the game loads (made by process)
  original/pixellab/            raw PixelLab output, never loaded by the game
    <category>/<raw key>/       raw files; each has a sidecar <file>.json
    ledger.jsonl                one line per generation and balance check
  templates/                    the code-drawn placeholders as PNGs (stand-ins)
assets/art-wip/                 gitignored: the trial's work, previews, spec cache
```

A sidecar records the endpoint, the request (images replaced by their sha256 and path), seed, ids (job, tileset, character, animation group), usage and creation time.

## The manifest

```jsonc
{
  "budget": {"generations": 150},
  "palettes": {"masroor": {"from": "...jpeg", "crop": [x0, y0, x1, y1], "colors": 48}},  // forced palettes ($palette)
  "houseRoofs": {"1": [r, g, b], ...},          // from suggest-roofs
  "legacy": [{"path": "...", "note": "..."}],   // optional: old files verify tolerates for now (none at present)
  "assets": [{
    "key": "walk_house_1", "category": "objects", "owner": "walk",  // owner: core | walk | flight
    "usedBy": ["walk:masroor"],
    "size": [58, 58], "sizeRule": "exact",       // exact, or max (no bigger than)
    "source": {"kind": "derived", ...},          // pixellab-character | local | pixflux | tileset | template | procedural | derived
    "estGenerations": 0,
    "post": [{"op": "crop_alpha"}, {"op": "flatten_roof", "roof": "1"}],  // run in order
    "map": {"sort": "ysort", "shadow": true, "footprint": [0.04, 0.2, 0.96, 1.0]},
    "tile": {...}, "pick": {...}, "standIn": {...}, "note": "..."
  }]
}
```

- **Request bodies** for paid keys are complete and checked against the spec by the dry run. Three placeholders are filled in at run time: `{"$image": path, "scale": 2, "padTo": [w, h]}` (a PNG, padded then scaled with nearest neighbour), `{"$palette": name}` (a colour swatch from `palettes`) and `{"$ref": "<set>.<lower|upper>"}` (a terrain id from a tileset generated earlier, so two tilesets share one concrete).
- **Footprint** (the collider) is in fractions of the sprite. In px: `fx = int(W*fx0)`, `fy = int(H*fy0)`, `fw = max(4, int(W*(fx1-fx0)))`, `fh = max(4, int(H*(fy1-fy0)))` (`manifest.footprint_px`). `null` means no collider (walkable).
- **Post steps**: `crop_alpha` (crop to the alpha bounding box), `resize` (`k` a number or `[num, den]`, nearest neighbour), `half` (halve keeping outlines), `fit` (centre on the entry's size), `flatten_roof`, plus the tile steps below.

### Stand-ins

Until a paid key is generated, `process` copies its template PNG, so the game looks as before, and `verify` lists it as "stand-in, pending generation". Characters keep their current sheet until all four directions of the walk exist. One small difference: the aircraft stand-ins are rotated from the outlined template, so their 15 turned frames differ by a pixel here and there from the code-drawn aircraft (frame 0 is identical).

### Characters

`walk_matiur_sd` and `walk_guard` are PixelLab characters. Their walks are made with `POST /characters/animations`, `mode: "v3"`, `template_action: "walking"`, explicit directions (1 generation each). Matiur's south walk already exists from the trial (v3 walking), and an animation stays on the engine it was made with, so north/east/west are added to that same `animation_group_id` with the same mode. The guard uses the same engine so the two match.

`process` turns the frames into a walker sheet: 3 columns (stand, step one, step two) by 4 rows (down, left, right, up). Stand is frame 0. The steps are the two frames with the feet furthest apart, half a cycle apart, measured on the bottom sixth of the figure: in side views the widest spread, in front and back views the frame with one foot lowest and the frame with the other foot lowest. The three frames of a row are cropped with one shared box (so the feet stay on one line) and halved.

### Tile atlases

`walk_tiles_ground` (144 x 108): 8 x 6 tiles of 16 px, margin 1, spacing 2, each tile's edge pixels extruded into the gap. Three Wang sets: ids 0-15 sand/asphalt, 16-31 sand/concrete, 32-47 concrete/asphalt. **Local tile id = set base + NW\*8 + NE\*4 + SW\*2 + SE\*1**, where a corner is 1 when it is the set's upper terrain. The full table (id, set, corners `[NW, NE, SW, SE]` as terrain names) is `tile.tiles` in the manifest. Sand/asphalt is the trial's PixelLab set; the other two are procedural stand-ins (the sand/asphalt shapes with concrete composited in) until their tilesets are generated, which then drop into the same ids. Asphalt is recoloured to the original map's blue-grey (`tint_terrain`).

`walk_tiles_paint`: runway and taxiway paint, one tile per pattern the Masroor map uses. `tile.patterns[i]` is local id `i`: 16 characters, 4 rows of 4 cells of 4 x 4 px, `.` none, `W` white, `Y` yellow. `masroor_ground.paint_pattern(cells, tx, ty)` gives the pattern for a map tile.

`ground_farmland` and `ground_plains` (128 x 128, seamless): one PixelLab tileset each, laid on a 4 x 4 corner grid that wraps around, so the texture tiles.

## Masroor layout and ground

While the map property `legacy` is true, `build-map`, `verify` and `npm test` require the map's colliders to be exactly the old baked map's, kept in `tests/mechanics/walk/fixtures/masroorLayout.legacy.json`.

`masroor_layout.py` has every object position from the legacy map builder (region px, 4 world px each, and the anchor rules), the house roof sampling and `house_variants()` (which `walk_house_<n>` each original house uses). `masroor_ground.py` reads the ground types (asphalt, concrete, paint) from the original map's colours. Both are ports of `assets/art-wip/level-2/build_masroor_map.py`.

## verify fails when

- a manifest key has no PNG at `final/<category>/<key>.png`, it is not RGBA, or its size breaks the size rule;
- a PNG sits directly in `assets/sprites/`;
- two PNGs under `final/` share a name;
- a PNG under `final/` is not in the manifest (files in `legacy` are reported, not failed);
- the ledger is over budget, or the manifest is malformed (walk keys must start with `walk_`).

## Adding an asset

1. Add an entry to the manifest (copy a similar one).
2. Paid source: `generate <key> --dry-run`, then `generate <key> --max-generations N`.
3. `process <key>`, look at the contact sheet, then `verify`.
4. If the game should use it, register the key in the owner's `art/register.ts`.
