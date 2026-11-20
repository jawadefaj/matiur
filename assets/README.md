# Assets

All of the game's non-code files live here: the app icon, the game art, the cinematic videos, reference photos, reading material and old screenshots. How each character and thing should look is in [sprites/README.md](sprites/README.md#how-the-art-looks).

The game build uses only `public/`, `sprites/final/` (plus the menu GIF in `sprites/original/UI/`) and `videos/`. In-game art comes from the PNGs in `sprites/final/` where they exist. Everything else is placeholder pixel art drawn in code when the game starts (each mechanic's `art/pixelArt.ts` in `src/mechanics/`, and `src/core/gfx/commonArt.ts`). The game never loads anything from `reference/` or `screenshots/`.

## Folders

```
assets/
├── public/          App icon and web-app manifest. These ship with the game.
├── sprites/         Game art (see sprites/README.md).
│   ├── final/       The PNGs the game loads, one per texture key, in category folders.
│   ├── manifest.json  Every key: size, source, post steps, map use. Made and checked by scripts/art/.
│   ├── original/    Source pictures, and pixellab/: raw PixelLab output with sidecars and the ledger. Not loaded.
│   └── templates/   The placeholders as PNGs, to paint over. Not used by the game.
├── videos/          Clips for the cinematics, and the demo clips that stand in for missing ones.
├── reference/       Research for art and writing. Never shipped.
│   ├── people/      Photos of Matiur Rahman
│   ├── places/      Places from his life
│   ├── aircraft/    F-86 Sabre and T-33 references
│   └── reading/     Articles and other reading
└── screenshots/     Phone screenshots of an earlier build
```

| Folder | In the game build? | How it is used |
|---|---|---|
| `public/` | Yes | Vite serves this folder at the site root and copies it unchanged into `dist/` (`publicDir` in [vite.config.ts](../vite.config.ts)). [index.html](../index.html) links to `icon.svg` and `manifest.webmanifest`. |
| `sprites/final/` | Yes | Found by `src/core/gfx/pngArt.ts` when the game is built. Each PNG replaces the placeholder with the same name (the file name is the key, unique across the category folders). Rules, key names and the Masroor Tiled map are in [sprites/README.md](sprites/README.md). |
| `sprites/manifest.json` | No | The list of every key, its size and where its pixels come from. Read by the art pipeline ([scripts/art/README.md](../scripts/art/README.md)) and checked by `npm test`. |
| `sprites/original/` | Only the menu GIF | Source pictures for the art. `original/pixellab/` keeps the raw PixelLab output, a sidecar per file and `ledger.jsonl` (the generation budget). |
| `sprites/templates/` | No | The code-drawn placeholders as PNGs, to paint over. |
| `videos/` | Yes | Found by `src/core/media/content.ts` when the game is built. See "Videos" below. |
| `reference/` | No | Used by people only: artists, writers and fact-checkers. |
| `screenshots/` | No | Not used. They show the build before the 12-chapter design. |

**New folders.** Create a folder (for example `audio/` or `fonts/`) when its first file arrives, and add it to the tree and table above.

## Videos

- **Name** each clip after its scene, as the chapter file asks for it: `clip('ch02_maltas_intro', 15)` in `src/game/episodes/ch02.maltas.ts` plays `videos/ch02_maltas_intro.mp4`. MP4 or WebM; if both exist, MP4 wins.
- **Until a clip exists,** the demo clip of the nearest length plays instead (`demo-15sec`, `demo-30sec` or `demo-60sec`; see `src/game/clips.ts`), and its fallback text from `src/data/strings.xml` shows if no video can play.
- **Keep each clip at 20 MB or less** so it loads on a phone. Test it on a real phone.

## Rules

- **Names:** lowercase words joined by hyphens, with no spaces. Put the subject first, for example `f86-sabre-parked.webp`.
- **`public/` ships to every player.** Put only files the running game needs there.
- **Record the source** of every new reference file in the index below. If an article is still online, prefer a link over a saved copy.
- **Rights:** this repo is public on GitHub. Don't commit photos you have no right to share, such as watermarked or "copyright" images.
- **Reference photos are not cleared for the game.** If a photo is wanted on an archive card, add a cleared copy to `archive/` and leave the reference copy where it is.

## Reference index

The "Was" column gives each file's name before the November 2026 reorganization. Everything here used to sit in `design/images-assets/` or `design/reading-matrials/`.

### People: `reference/people/`

| File | Shows | Was |
|---|---|---|
| `matiur-rahman-portrait.png` | Formal portrait in service dress and peaked cap, with pilot's wings | `Bir_Shreshto_Flt._Lft._Matiur_Rahman-6.png` |
| `matiur-rahman-flight-helmet.png` | Close-up in a flight helmet (sepia) | `Bir_Shreshto_Flt._Lft._Matiur_Rahman-3.png` |
| `matiur-rahman-officers-group.png` | Nine officers in service dress. He is in the front row, second from the right. | `Bir_Shreshto_Flt._Lft._Matiur_Rahman-2.png` |
| `matiur-rahman-with-pilots.png` | Six pilots in flight suits by a sandbag wall. He is standing, first on the left. Scanned from a printed page with a Bangla caption. | `Bir_Shreshto_Flt._Lft._Matiur_Rahman-4.png` |

All four carry the Bangladesh Air Force crest, so they probably came from a BAF website or publication. The exact source was not recorded.

### Places: `reference/places/`

| File | Shows | Was |
|---|---|---|
| `family-home-memorial-plaque.jpg` | A memorial plaque in Bangla at his family home. It gives his birth as 29-10-1941 and his death as 20-08-1971. | `Residence_of_Bir_Sreshtho_Flight_Lieutenant_Matiur_Rahman_and_his_forefathers_02.jpg` (looks like a Wikimedia Commons file name) |

### Aircraft: `reference/aircraft/`

| File | Shows | Was |
|---|---|---|
| `f86-sabres-1965-formation.jpg` | Four PAF F-86 Sabres in formation over mountains. The original file name dates it to the 1965 war. | `PAF_F-86_Sabres_1965_War.jpg` |
| `f86-sabre-parked.webp` | PAF F-86 Sabre "102" (serial 53-1102) parked by an arched hangar, in black and white. The same image is in the Hush-Kit PDF. | `sabre1.webp` |
| `f86-sabre-3d-render.webp` | A computer-made render of a silver PAF Sabre over green hills. It is the Hush-Kit article's header image. | `sabre.webp` |
| `t33a-profile-art.jpg` | Side-view illustration of a silver PAF T-33A (serial 56-1746) | `Lockheed T-33 Shooting Star jet trainer.jpg` |
| `t33-camouflage-photo.jpg` | Photo of a PAF T-33 in green camouflage taking off. It is watermarked "Copyright Peter R Foster". | `Lockheed T-33 Shooting Star jet trainer1.jpg` |

### Reading: `reference/reading/`

| File | What it is | Was |
|---|---|---|
| `f86-sabre-pilot-interview-hushkit-2019.pdf` | *Flying & fighting in the North American F-86F Sabre: Pakistan Air Force pilot interview*, Hush-Kit, 1 October 2019. Wg Cdr Irfan Masum (Rtd) describes flying the F-86F, including the PAF training path (T-6G or T-37, then the T-33, then the Sabre). It is a 10-page print of the web page, and its text can't be searched. Online at <https://hushkit.net/2019/10/01/flying-fighting-in-the-north-american-f-86f-sabre-pakistan-air-force-pilot-interview/> | `sabre.pdf` |

## Files to review

These add little or cause problems. They are kept until someone decides.

| File | Problem | Suggestion |
|---|---|---|
| `reference/aircraft/t33-camouflage-photo.jpg` | Watermarked "Copyright Peter R Foster" in a public repo. It is also the largest image (708 KB), and `t33a-profile-art.jpg` already covers the T-33. | Delete it. |
| `reference/aircraft/f86-sabre-3d-render.webp` | A computer render, not a photo from the period. It is also a copy of the PDF's first image. | Delete it. |
| `reference/reading/f86-sabre-pilot-interview-hushkit-2019.pdf` | 1.7 MB, the text can't be searched, and the article is still online at the link above. Its first two images are the two Sabre `.webp` files. | Keep the link and delete the PDF, unless you need an offline copy. |
