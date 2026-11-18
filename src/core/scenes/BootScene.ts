// First scene to run (see createGame.ts): loads any PNG art and each
// mechanic's files, makes every texture (PNG or placeholder), checks the game
// definition, then hands over to the GameManager.
import Phaser from 'phaser';
import { CSS, GAME_W } from '../config';
import { loadPngArt, makeArtKit, registerCommonArt } from '../gfx/textures';
import { CORE_SCENES, gmOf } from '../manager/GameManager';
import { validateGame } from '../manager/validate';
import { txt } from '../ui/widgets';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(CORE_SCENES.boot);
  }

  preload(): void {
    // A missing or broken PNG is logged and that key keeps its placeholder.
    this.load.on('loaderror', (file: Phaser.Loader.File) => console.warn(`Could not load ${file.src}`));
    loadPngArt(this);
    for (const r of Object.values(gmOf(this).parts.runtimes)) r.preload?.(this);
  }

  create(): void {
    const gm = gmOf(this);
    const { episodes, descriptors, runtimes } = gm.parts;
    const owners = new Map<string, string>();
    registerCommonArt(makeArtKit(this, 'core', owners));
    for (const r of Object.values(runtimes)) r.registerArt?.(makeArtKit(this, r.id, owners));

    const errors = validateGame(episodes, descriptors, Object.keys(runtimes));
    for (const id of Object.keys(runtimes)) {
      if (!descriptors[id]) errors.push(`src/mechanics/${id}/runtime.ts has no index.ts descriptor.`);
    }
    if (errors.length) {
      console.error(`Game definition problems:\n- ${errors.join('\n- ')}`);
      // In a dev build, stop and show them; a build plays on and skips nothing.
      if (import.meta.env.DEV) {
        txt(this, 12, 12, 'GAME DEFINITION PROBLEMS', 8, CSS.danger);
        txt(this, 12, 32, errors.join('\n\n'), 8, CSS.white, GAME_W - 24);
        return;
      }
    }
    gm.boot(location.search);
  }
}
