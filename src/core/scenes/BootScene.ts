// First scene to run (see createGame.ts): loads any PNG art and each
// mechanic's files, makes every texture (PNG or placeholder), checks the game
// definition, then hands over to the GameManager.
import Phaser from 'phaser';
import { CSS, GAME_W } from '../config';
import { MENU_GIF_KEY, addGif, loadPngArt, makeArtKit, registerCommonArt } from '../gfx/textures';
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
    // A GIF menu background is loaded as bytes: Phaser would show only its first frame.
    const bg = gmOf(this).parts.game.menuBackground;
    if (bg && typeof bg === 'object') this.load.binary(MENU_GIF_KEY, bg.gif);
    for (const r of Object.values(gmOf(this).parts.runtimes)) r.preload?.(this);
  }

  create(): void {
    const gm = gmOf(this);
    const { episodes, descriptors, runtimes } = gm.parts;
    const owners = new Map<string, string>();
    const core = makeArtKit(this, 'core', owners);
    registerCommonArt(core);
    if (this.cache.binary.exists(MENU_GIF_KEY)) {
      // A broken GIF is logged and the menu falls back to a flat colour.
      try {
        addGif(core, this.anims, MENU_GIF_KEY, this.cache.binary.get(MENU_GIF_KEY));
      } catch (e) {
        console.warn(`Could not decode the menu background GIF: ${e instanceof Error ? e.message : e}`);
      }
    }
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
