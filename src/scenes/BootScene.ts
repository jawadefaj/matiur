// First scene to run (see main.ts): loads any PNG art, makes every texture
// (PNG or placeholder), then starts the sortie menu.
import Phaser from 'phaser';
import { loadPngArt, registerTextures } from '../gfx/textures';
import { WALK_LIST } from '../walk';

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
    // ?sortie=1|2|3 jumps straight into a sortie and ?walk=flightline into a
    // walk level (handy for testing on a phone).
    const q = new URLSearchParams(location.search);
    const n = Number(q.get('sortie'));
    const walk = WALK_LIST.find((l) => l.id === q.get('walk'));
    if (n === 1 || n === 2 || n === 3) this.scene.start('Flight', { sortie: n });
    else if (walk) this.scene.start('Walk', { level: walk.id });
    else this.scene.start('Menu');
  }
}
