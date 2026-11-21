# Wings of Freedom

A 2D top-down mobile game about Flt Lt Matiur Rahman, Bir Sreshtho, told in 12 chapters. Two kinds of chapter are playable, **stealth** and **flight**; the rest are cinematics. **[design/design.md](design/design.md) is the source of truth** for the chapters, mechanics and controls. When the code, a comment or another doc disagrees with it, the design wins.

Built with Phaser 4, TypeScript, Vite and Vitest. A **game manager** plays each chapter as a list of steps (levels, videos, cutscenes). Each gameplay mechanic is modular and self-contained.

## Build & Run

Requires **Node 22.12** or newer.

```bash
# Install dependencies
npm install

# Development server (run with `npm run dev`, then open the Network address on your phone)
npm run dev

# Build for production
npm run build              # Static build in dist/ (Phaser from jsDelivr CDN)
npm run build:single      # Single self-contained HTML file: dist-single/index.html (~2.4 MB)

# Test
npm test                  # Unit tests, bot pilots, game and architecture checks
npm run test:browser      # Cross-browser tests (Chrome, Firefox, Safari)
npm run test:browser:ui   # Interactive browser test UI
npm run typecheck         # TypeScript check only
npm run preview           # Preview the built game locally
```

## Development

Open the `Network:` address printed by `npm run dev` (for example `http://192.168.0.196:5173`) on your phone. The phone must be on the same Wi-Fi. If it won't connect, Windows Firewall is probably blocking Node on a *Public* network—set the Wi-Fi to *Private* or allow Node.js through the firewall.

## Play without installing

- **One file:** `npm run build:single` writes `dist-single/index.html` (~2.4 MB). Phaser, the code and every image are inside it, so you can double-click it, send it to a phone, or upload it anywhere. It plays offline; only the pixel font needs the internet, and falls back to a plain font after 3 s without it.
- **GitHub Pages:** every push to `main` builds and publishes the game with [.github/workflows/pages.yml](.github/workflows/pages.yml), at `https://<owner>.github.io/matiur/`. The one-file build is published next to it as `wings-of-freedom.html`. Turn it on once under **Settings > Pages > Source: GitHub Actions**.

## Text and language

The game is in Bangla. Every word the player sees, plus the font and the digit style, is in one file: [src/data/strings.xml](src/data/strings.xml). Edit the text between `<s id="...">` and `</s>`, keeping each `id` and every `{name}`; the `en="..."` attribute is the original English, for reference. `npm test` checks that every id the code uses is in the file and that no `{name}` went missing. In code, use `t('id')` from `src/core/i18n.ts` instead of writing text in quotes.

## Folder structure

```
matiur/
├── index.html            The web page that loads the game
├── vite.config.ts        Dev server and build settings
├── package.json          npm scripts and dependencies (Phaser, TypeScript, Vite, Vitest)
├── tsconfig.json         TypeScript settings
├── assets/               Every non-code file (sprites, videos, reference, screenshots)
├── design/design.md      The game design: the source of truth
├── src/
│   ├── main.ts           Entry point
│   ├── game/             Game settings and the 12 chapters (episodes/ch01 … ch12)
│   ├── core/             Shared infrastructure (manager, scenes, media, rendering, UI)
│   ├── mechanics/        Modular game mechanics (each with index.ts and runtime.ts)
│   └── data/             Game data (cutscenes, etc.)
├── tests/                Unit tests and architecture checks
└── .claude/launch.json   Dev server settings
```

`node_modules/` (from `npm install`) and `dist/` (from `npm run build`) are created locally and are not committed.

Only scenes, `runtime.ts` files and the manager use Phaser. Everything else is plain TypeScript for testability. [tests/architecture.test.ts](tests/architecture.test.ts) enforces that `core/` never imports a mechanic and that no mechanic imports another.

**Architecture notes**

- Each **mechanic** is a folder in `src/mechanics/` with two entry files:
  - `index.ts`: params, validation, settings (plain TypeScript, no Phaser)
  - `runtime.ts`: Phaser scenes and graphics
- The **game manager** in `src/core/manager/` orchestrates episodes as lists of steps
- See [src/mechanics/README.md](src/mechanics/README.md) for the mechanic contract and template

## Branching

Work happens on branches that each touch their own folder, so they merge into `main` without conflicts:

| Branch pattern | Scope |
|---|---|
| `mechanic/<id>` | A new mechanic in `src/mechanics/<id>/` and its tests |
| `core/<topic>` | Shared infrastructure in `src/core/` and `src/main.ts` |
| Feature branches | Game content (episodes, scenes, data) in `src/game/`, `src/data/`, `assets/` |

Guidelines:
- Merge `main` into your branch before opening a pull request
- Use merge commits (not squash) for multi-commit work
- `npm test` must pass before merging

## Design

[design/design.md](design/design.md) is the only design document. Change the design there first, then the code.

In the code, each chapter is one file in `src/game/episodes/` (`ch01` … `ch12`, called *episodes* in the code). Some playable chapters still borrow a level from an earlier design until their own is built. Each one is marked `TODO` in its chapter file:

| Chapter | Plays for now |
|---|---|
| 2. Sargodha: stealing maltas | The Masroor flight-schedule level |
| 4. Risalpur: first flight | Flight sortie 1 (take off and join up) |
| 5. 1967: dogfight, crash, parachute | Flight sortie 2 (an intercept) |
| 8. Masroor base: runway layout | The Masroor flight-schedule level |
| 10. 20 August: stopping the T-33 | A walk to the taxiway, then SIGNAL (no drive yet) |
| 11. 20 August: the last flight | Flight sortie 3 (low level and home) |

Both mechanics are also behind the design:

- **Stealth** (`src/mechanics/walk/`) has guards, vision cones and getting caught, but not yet crouch, auto-hide, noise or the action button.
- **Flight** (`src/mechanics/flight/`) has the design's controls, the same in every level: throttle with a lock, Climb/Dive buttons on the left, drag on the right to steer (drag far for a hard turn), guns that fire on their own and an altitude bar. The HUD still shows numbers, and the altitude shadow, the bigger sprite when high, and eject are not built yet.

The [assets guide](assets/README.md) covers what's in `assets/` and how the art should look.
