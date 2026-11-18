# Assets

All of the game's non-code files live here: the app icon, reference photos, reading material and the screenshots used in the main README.

The game build uses only `public/`, `sprites/` and `video/`. In-game art comes from PNGs in `sprites/` where they exist. Everything else is placeholder pixel art drawn in code when the game starts (each mechanic's `art/pixelArt.ts` in `src/mechanics/`, and `src/core/gfx/commonArt.ts`). The game never loads anything from `reference/` or `screenshots/`.

## Folders

```
assets/
├── public/          App icon and web-app manifest. These ship with the game.
├── sprites/         PNG game art. Each file replaces one placeholder (see sprites/README.md).
│   └── templates/   The placeholders as PNGs, to paint over. Not used by the game.
├── video/           Video files for video steps (see video/README.md).
├── reference/       Research for art and writing. Never shipped.
│   ├── people/      Photos of Matiur Rahman
│   ├── places/      Places from his life
│   ├── aircraft/    F-86 Sabre and T-33 references
│   └── reading/     Articles and other reading
└── screenshots/     Phone screenshots of the current build, shown in the main README
```

| Folder | In the game build? | How it is used |
|---|---|---|
| `public/` | Yes | Vite serves this folder at the site root and copies it unchanged into `dist/` (`publicDir` in [vite.config.ts](../vite.config.ts)). [index.html](../index.html) links to `icon.svg` and `manifest.webmanifest`. |
| `sprites/` | Yes | Found by `src/core/gfx/pngArt.ts` when the game is built. Each PNG replaces the placeholder with the same name. Rules and key names are in [sprites/README.md](sprites/README.md). |
| `video/` | Yes | Found by `src/core/media/content.ts` when the game is built. A `video('intro', { src: 'ep2_intro' })` step plays `ep2_intro.mp4`. Size and format rules are in [video/README.md](video/README.md). |
| `reference/` | No | Used by people only: artists, writers and fact-checkers. |
| `screenshots/` | No | Shown in the [main README](../README.md). |

**Planned folders.** The [build spec](../design/init_design.md) (§10) plans these for when real art replaces the placeholders: `palette/` (the master palette file), `tilesets/`, `portraits/`, `ui/`, `audio/`, `fonts/`, and `archive/` for the real photos shown on archive cards. Create each folder when its first file arrives.

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
| `family-home-memorial-plaque.jpg` | A memorial plaque in Bangla at his family home. It gives his birth as 29-10-1941 and his death as 20-08-1971. That birth date bears on the open birth-date question in GDD §9. | `Residence_of_Bir_Sreshtho_Flight_Lieutenant_Matiur_Rahman_and_his_forefathers_02.jpg` (looks like a Wikimedia Commons file name) |

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
