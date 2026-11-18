# Sprites (PNG game art)

Put a PNG in this folder and the game uses it in place of the placeholder art drawn in code. The file name is the texture key: `sabre.png` replaces the Sabre and `tree.png` replaces the trees. Any key without a PNG keeps its placeholder, so art can be added one file at a time.

`templates/` holds the current placeholders as PNGs at their real size. Copy one up into this folder and paint over it. The game ignores `templates/`.

After you add or rename a PNG, restart `npm run dev` so it finds the new file. Edits to a file that's already there show up on reload.

## Rules

- **Transparent background:** use a PNG with alpha.
- **1 image pixel = 1 game pixel.** The screen is 360 px wide, and the game scales the art up with sharp pixels, not blur. A bigger image shows bigger on screen. Hit boxes don't change: they're set in the simulation, not by the art.
- **Use the exact key names below,** in lowercase.

## Keys

| File | What it is | Template size | Notes |
|---|---|---|---|
| **Shared** | *made in src/core/gfx/* | | |
| `ground_farmland.png` | Farmland ground (menu and flight) | 128 × 128 | Must tile seamlessly: it repeats in every direction |
| `ground_plains.png` | Plains ground (sortie 3) | 128 × 128 | Must tile seamlessly |
| `tree.png` | Tree (flight and walk) | 8 × 8 | |
| **Flight** | *made in src/mechanics/flight/art/* | | |
| `sabre.png` | Player's F-86 Sabre and Sherdil Two | 17 × 21 | Aircraft: see below |
| `mystere.png` | Mystère IV | 17 × 21 | Aircraft |
| `hunter.png` | Hawker Hunter | 21 × 23 | Aircraft |
| `gnat.png` | Folland Gnat | 17 × 15 | Aircraft |
| `canberra.png` | Canberra bomber | 29 × 23 | Aircraft |
| `b57.png` | B-57 bomber (friendly Bulldog flight) | 29 × 23 | Aircraft |
| `hill24.png` `hill32.png` `hill40.png` `hill48.png` | Hills on the low-level route, by radius | 52, 68, 84, 100 square | Keep each hill near its template size, because the collision radius is fixed |
| `hut.png` | Village hut | 7 × 7 | |
| `pylon.png` | Power-line pylon | 5 × 5 | |
| `cloud0.png` `cloud1.png` `cloud2.png` | Three cloud shapes | 56 × 32 | The ground shadow is made from the cloud. To draw the shadow yourself, add `cloudsh0.png` and so on. |
| `puff_light.png` `puff_dark.png` | Smoke trail puffs (light, and dark for a badly hit plane) | 6 × 6 | |
| `puff_fuel.png` | Fuel vapour | 4 × 4 | |
| `spark.png` | Hit spark | 4 × 4 | |
| `dust.png` | Smoke over a bombed base | 10 × 10 | |
| **Walk** | *made in src/mechanics/walk/art/* | | |
| `walker_pilot.png` | Matiur on foot | 48 × 104 | Walker sheet: see below |
| `walker_wingman.png` | Sherdil Two on foot | 48 × 104 | Walker sheet |
| `walker_crew.png` | Crew chief | 48 × 104 | Walker sheet |
| `sabre_parked.png` | Parked Sabre at walking scale, nose up | 100 × 104 | Keep the size: the walk collision boxes in `src/mechanics/walk/levels/FlightLine.ts` follow it |

### Walking characters

A grid of frames, 3 columns by 4 rows. Rows from the top: facing down (toward the camera), left, right, up. Columns: standing, left foot forward, right foot forward. The template frames are 16 × 26. The feet sit near the bottom of each frame, where the soft shadow is.

### Aircraft

Draw the aircraft **from above, nose pointing up (north)**. The game turns it into 16 headings and makes the black ground shadow from it. Rotating pixel art can make thin lines jagged at angles. If that bothers you, draw all 16 headings yourself instead:

- One PNG strip of 16 square frames side by side, so its width is exactly 16 × its height.
- Frame 0 points up, and each next frame is turned 22.5° clockwise.

The game spots a strip by its shape (width = 16 × height). Any other shape is treated as one picture to rotate.

## How it works

`src/core/gfx/pngArt.ts` finds the PNGs here when the game is built, and the boot scene loads them before any texture is made. Then core and each mechanic register their textures (`src/core/gfx/textures.ts` and each mechanic's `art/register.ts`), using each PNG if there is one, else the placeholder drawn in code. PNGs here go into the build automatically. Nothing needs to be copied into `public/`.

A new mechanic should name its keys `<mechanic id>_...` so they can't clash: the boot scene stops if two mechanics register the same key.
