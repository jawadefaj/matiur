# Wings of Freedom

A Phaser 4 game built with TypeScript, Vite, and Vitest. The game is structured around a **game manager** that plays episodes as lists of steps (levels, videos, cutscenes). Each gameplay mechanic is modular and self-contained.

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
├── assets/               Every non-code file (sprites, video, reference, screenshots)
├── design/               Design documentation and specs
├── src/
│   ├── main.ts           Entry point
│   ├── game/             Game script definition and episodes
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

- [Game Design Document](<design/Game Design Document - Wings of Freedom.md>): rev 3.1, the source of truth for story, structure, tone and history.
- [Build spec](design/init_design.md): tech, systems, tuning and code layout.
- [Assets guide](assets/README.md): what's in `assets/`, where each reference file came from, and which ones to review.
