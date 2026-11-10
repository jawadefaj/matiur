// First scene to run (see main.ts): loads any PNG art, makes every texture
// (PNG or placeholder), then starts the sortie menu.
import Phaser from 'phaser';
import { loadPngArt, registerTextures } from '../gfx/textures';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    // A missing or broken PNG is logged and that key keeps its placeholder.
    this.load.on('loaderror', (file: Phaser.Loader.File) => console.warn(`Could not load ${file.src}`));
    loadPngArt(this);
  }

  create(): void {
    registerTextures(this);
    // ?sortie=1|2|3 jumps straight into a sortie (handy for testing on a phone).
    const n = Number(new URLSearchParams(location.search).get('sortie'));
    if (n === 1 || n === 2 || n === 3) this.scene.start('Flight', { sortie: n });
    else this.scene.start('Menu');
  }
}
