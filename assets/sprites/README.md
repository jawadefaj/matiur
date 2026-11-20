# Sprites (PNG game art)

Every image the game loads is one PNG at `final/<category>/<key>.png`. The file name is the texture key: `final/vehicles/sabre.png` replaces the Sabre and `final/objects/tree.png` replaces the trees. Categories are `characters`, `vehicles`, `objects`, `tiles` and `effects`. The folders are only for people: the game finds every PNG under `final/`, so **a name may be used once across all folders** (the game stops at boot if two PNGs share one). Any key without a PNG keeps its placeholder drawn in code, so art can arrive one file at a time.

```
assets/sprites/
├── manifest.json               every key: size, size rule, where its pixels come from, how maps use it
├── final/<category>/<key>.png  what the game loads
├── original/pixellab/          raw PixelLab output, a sidecar .json per file, ledger.jsonl. Never loaded.
├── original/                   the source pictures (master map, character sheets, tilesets)
└── templates/                  the code-drawn placeholders as PNGs at their real size. Never loaded.
```

Nothing in `original/` becomes a texture. The one exception to "never loaded" is the menu background GIF, `original/UI/Idle_v3_walking_south.gif`, which `src/game/game.ts` imports by name.

`manifest.json` is the list of keys. Every PNG under `final/` must have an entry, and every entry must have exactly one PNG of the size it gives (`sizeRule` `exact`, or `max` for no bigger). `npm test` (`tests/assets/manifest.test.ts`) and `python scripts/art/art.py verify` both check this.

The PNGs are made by the art pipeline in `scripts/art/`: fetch and generate the raw art with PixelLab, process it into `final/`, build the Masroor map, verify. Commands, the generation budget and the manifest fields are in [scripts/art/README.md](../../scripts/art/README.md).

To paint a PNG by hand instead, copy its template from `templates/` into `final/<category>/` (the category its manifest entry gives) and paint over it. `art.py process` then leaves it alone: it never overwrites a hand-painted final. It records the hash of each PNG it writes and skips a final that has changed since, unless you pass `--force`. If you'd rather keep the painting as a source, save it under `original/` (as `original/pixellab/<category>/<key>/<key>.png`) and set the key's manifest source to kind `local`; then `process` makes the final from it.

After you add or rename a PNG, restart `npm run dev` so it finds the new file. Edits to a file that's already there show up on reload.

## How the art looks

The whole game is 2D top-down pixel art, seen from above ([design/design.md](../../design/design.md)). People are walker sheets (see "Walking characters" below); planes are drawn from straight above, nose up.

**The game draws these itself, so they need no art:** vision cones (see-through triangles on the ground: white, then yellow, then red), the noise ring around a running character, Matiur fading or darkening while hidden, every plane's ground shadow (it moves away and shrinks as the plane climbs), the plane growing slightly when high, and the HUD (colours, not numbers).

### People

| Who | How they look | Key |
|---|---|---|
| Matiur, PAF officer (Masroor, 1971) | Dark blue-grey service dress and peaked cap | `walk_matiur_sd` |
| Matiur, schoolboy (Sargodha) | Not drawn yet | none yet |
| Matiur crouching | Not drawn yet. Crouching is slower and silent. | none yet |
| Matiur's friends (Sargodha) | Not drawn yet. One of them is caught at the end of the orchard level. | none yet |
| Orchard watchmen (Sargodha, night) | Not drawn yet | none yet |
| Base guards (Masroor) | Olive uniform and beret, rifle, torch at night | `walk_guard` |
| Nurses and orderlies (Air Force hospital) | Not drawn yet. They walk set routes. | none yet |

### Cover, and things to pick up or read

| Thing | How it looks | What it does |
|---|---|---|
| Crate, cupboard | Not drawn yet | Hides Matiur fully |
| Bush | A low shrub | Cover (`walk_bush`) |
| Parked jeep | Not drawn yet | Cover |
| Building and hangar shadows | Dark patches on the ground | Hide Matiur only while he crouches |
| Maltas | Not drawn yet | Picked up in the orchard |
| The flight schedule | A document in the operations office. Not drawn yet. | Read |
| The runway and taxiway layout | A map in the map or control room. Not drawn yet. | Read |
| Chloroform | A bottle in the hospital pharmacy. Not drawn yet. | Picked up |

### Planes and the ground below

| What | How it looks | Key |
|---|---|---|
| Matiur's plane | From above, nose up. The design doesn't name the type for Risalpur or 1967; the Sabre stands in. | `sabre` |
| The friend's plane (1967 dogfight) | Not drawn yet | none yet |
| The T-33 (20 August) | Silver with yellow bands and tip tanks | `walk_t33` on the ground; none yet in flight |
| Clouds | Pass under the plane at high altitude | `cloud0` … `cloud2` |
| Engine smoke | Dark puffs when the engine fails | `puff_dark` |
| Parachute | Not drawn yet | none yet |
| Runway lights and practice rings (Risalpur) | Not drawn yet | none yet |
| Ground | Fields, then hills, then desert and dunes; villages | `ground_farmland`, `ground_plains`, `hill24` … `hill48`, `hut`, `tree`, `pylon` |

**Art the design doesn't use.** These keys come from levels of the earlier design that stand in for some chapters for now: the 1965 aircraft (`mystere`, `hunter`, `gnat`, `canberra`, `b57`), the flight-line walkers (`walker_pilot`, `walker_wingman`, `walker_crew`) and `sabre_parked`. They need no new art unless the design brings them back.

## Rules

- **Transparent background:** use a PNG with alpha (RGBA).
- **1 image pixel = 1 game pixel.** The screen is 360 px wide, and the game scales the art up with sharp pixels, not blur. A bigger image shows bigger on screen. Hit boxes don't change: they're set in the simulation (or, for Masroor, in its Tiled map), not by the art.
- **Use the exact key names below,** in lowercase (letters, digits and `_`). Walk keys start with `walk_`.

## Keys

| File | What it is | Size | Notes |
|---|---|---|---|
| **Shared** | *made in src/core/gfx/* | | |
| `tiles/ground_farmland.png` | Farmland ground (menu and flight) | 128 × 128 | Must tile seamlessly: it repeats in every direction |
| `tiles/ground_plains.png` | Plains ground (flight) | 128 × 128 | Must tile seamlessly |
| `objects/tree.png` | Tree (flight and walk) | 8 × 8 | |
| **Flight** | *made in src/mechanics/flight/art/* | | |
| `vehicles/sabre.png` | Player's F-86 Sabre and Sherdil Two | 17 × 21 | Aircraft: see below |
| `vehicles/mystere.png` | Mystère IV | 17 × 21 | Aircraft |
| `vehicles/hunter.png` | Hawker Hunter | 21 × 23 | Aircraft |
| `vehicles/gnat.png` | Folland Gnat | 17 × 15 | Aircraft |
| `vehicles/canberra.png` | Canberra bomber | 29 × 23 | Aircraft |
| `vehicles/b57.png` | B-57 bomber (friendly Bulldog flight) | 29 × 23 | Aircraft |
| `objects/hill24.png` … `hill48.png` | Hills on the low-level route, by radius | 52, 68, 84, 100 square | Keep each hill near its template size, because the collision radius is fixed |
| `objects/hut.png` | Village hut | 7 × 7 | |
| `objects/pylon.png` | Power-line pylon | 5 × 5 | |
| `effects/cloud0.png` `cloud1.png` `cloud2.png` | Three cloud shapes | 56 × 32 | The ground shadow is made from the cloud. To draw the shadow yourself, add `cloudsh0.png` and so on. |
| `effects/puff_light.png` `puff_dark.png` | Smoke trail puffs (light, and dark for a badly hit plane) | 6 × 6 | |
| `effects/puff_fuel.png` | Fuel vapour | 4 × 4 | |
| `effects/spark.png` | Hit spark | 4 × 4 | |
| `effects/dust.png` | Smoke over a bombed base | 10 × 10 | |
| **Walk** | *made in src/mechanics/walk/art/* | | |
| `walker_pilot.png` | Matiur on foot (flight line) | 48 × 104 | Walker sheet: see below. No PNG yet (placeholder) |
| `walker_wingman.png` | Sherdil Two on foot | 48 × 104 | Walker sheet. No PNG yet |
| `walker_crew.png` | Crew chief | 48 × 104 | Walker sheet. No PNG yet |
| `sabre_parked.png` | Parked Sabre at walking scale, nose up | 100 × 104 | Keep the size: the walk collision boxes in `src/mechanics/walk/levels/FlightLine.ts` follow it. No PNG yet |
| `characters/walk_matiur_sd.png` | Matiur in service dress (Masroor) | at most 72 × 136 | Walker sheet |
| `characters/walk_guard.png` | Masroor guard with a torch | at most 108 × 144 | Walker sheet |
| `vehicles/walk_t33.png` | The T-33 from above, nose up | 80 × 94 | Taxis in the `masroor-intercept` level; also every parked jet on the Masroor map (in that level, the parked jet where the T-33 starts isn't drawn: the moving T-33 is that jet) |
| `tiles/walk_tiles_ground.png` | Masroor ground atlas: sand, asphalt, concrete | 144 × 108 | 8 × 6 tiles of 16 px, margin 1, spacing 2. Tile ids are in the manifest |
| `tiles/walk_tiles_paint.png` | Masroor runway and taxiway paint | 144 × 468 | Rebuilt by `build-map` with the map |
| `objects/walk_house_1.png` … `walk_house_5.png`, `walk_hospital`, `walk_control_tower`, `walk_fuel_tank`, `walk_watchtower`, `walk_facility`, `walk_pond`, `walk_track`, `walk_revetment`, `walk_tree`, `walk_bush`, `walk_shelter` | The pictures placed on the Masroor map | see the manifest | One picture per kind of thing. Never scaled on the map: see "The Masroor map" |
| `objects/walk_wall.png` | One piece of the perimeter wall | 6 × 8 | Stamped every 1 px along the wall line |

### Walking characters

A grid of frames, 3 columns by 4 rows. Rows from the top: facing down (toward the camera), left, right, up. Columns: standing, left foot forward, right foot forward. The template frames are 16 × 26. The feet sit near the bottom of each frame, where the soft shadow is.

### Aircraft

Draw the aircraft **from above, nose pointing up (north)**. The game turns it into 16 headings and makes the black ground shadow from it. Rotating pixel art can make thin lines jagged at angles. If that bothers you, draw all 16 headings yourself instead:

- One PNG strip of 16 square frames side by side, so its width is exactly 16 × its height.
- Frame 0 points up, and each next frame is turned 22.5° clockwise.

The game spots a strip by its shape (width = 16 × height). Any other shape is treated as one picture to rotate.

## The Masroor map

The Masroor walk map is the Tiled map [src/mechanics/walk/levels/masroor.tmj](../../src/mechanics/walk/levels/masroor.tmj), 155 × 118 tiles of 16 px (2480 × 1888 px); the world is the top 2480 × 1880, set by the map properties `worldWidth`/`worldHeight`. The game refuses a map made for another world size, or whose tiles don't cover the world. Phaser draws it, bottom to top: the tile layers, the flat pictures (pond, track, revetments), the shadows, the wall, then one image per standing object, sorted with the characters and Bluebird by their bottom edge so Matiur can walk behind a house or a tree. Its colliders are read from the same file (`src/core/tiled.ts`), so what you see is what blocks. Night is the day map with one tint, no second picture.

It was built by `python scripts/art/art.py build-map masroor`. To change it by hand, open it in [Tiled](https://www.mapeditor.org/) 1.10 or newer:

- **Layers:** `ground` (every cell has a tile), `paint` (runway and taxiway markings), `objects` (the pictures), `collision` (the wall and the no-go areas), `markers` (named points).
- **Move or add things** on the `objects` layer, using the `walk_objects` tileset. An object stands on its bottom edge.
- **Never scale an object**: the game refuses a map whose objects are not drawn at their picture's size. After art is regenerated at a new size, run `python scripts/art/art.py build-map masroor --refit-objects` to fit the objects to the new pictures.
- **Colliders of a kind of object** (every house, every tree…) are the rectangles drawn on its tile in the `walk_objects` tileset, with Tiled's tile collision editor. Rectangles only, no rotation.
- **Make one object walkable:** give it the custom bool property `solid` = false.
- **No-go areas:** draw plain rectangles on the `collision` layer, or give a rectangle on another layer the bool property `solid` = true. Without that, a rectangle on another layer (a zone on `markers`, say) never blocks; and `solid` = false switches any rectangle off. A no-go rectangle must have a width and a height: the game refuses one without, and names its object id.
- **Hidden objects:** an object hidden in Tiled (its eye switched off in the Objects panel) is ignored: no collider and not drawn. Only the object's own eye counts; hiding a whole layer changes nothing in the game.
- **The wall** is the `wall` polyline on the `collision` layer. Its posts (`step`, `postW`, `postH`, `postDX`, `postDY`) are its collider; `texture` is the stamp it is drawn with.
- **Ground tiles** have a bool `walkable` property; a tile with `walkable` = false blocks.
- **Markers** are named after the constants in `src/mechanics/walk/levels/Masroor.ts` (HOME, OFFICE…). The test checks they match: move both together.
- **After your first hand edit, set the map property `legacy` to false.** While it is true, the tests and `verify` require the colliders to be exactly the old baked map's (`tests/mechanics/walk/fixtures/masroorLayout.legacy.json`).
- Keep the tilesets embedded, the map not infinite, and tile layers as CSV or uncompressed Base64. The map loader says what to fix if one of these slips.

Then run `npm test` and `python scripts/art/art.py verify`.

## How it works

`src/core/gfx/pngArt.ts` finds the PNGs under `final/` when the game is built, and the boot scene loads them before any texture is made. Then core and each mechanic register their textures (`src/core/gfx/textures.ts` and each mechanic's `art/register.ts`), using each PNG if there is one, else the placeholder drawn in code. PNGs in `final/` go into the build automatically. Nothing needs to be copied into `public/`.

A new mechanic should name its keys `<mechanic id>_...` so they can't clash: the boot scene stops if two mechanics register the same key.
