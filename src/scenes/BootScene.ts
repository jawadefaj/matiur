import Phaser from 'phaser';
import { registerTextures } from '../gfx/textures';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    registerTextures(this);
    // ?sortie=1|2|3 jumps straight into a sortie (handy for testing on a phone).
    const n = Number(new URLSearchParams(location.search).get('sortie'));
    if (n === 1 || n === 2 || n === 3) this.scene.start('Flight', { sortie: n });
    else this.scene.start('Menu');
  }
}
