// First scene to run (see main.ts): loads any PNG art, makes every texture
// (PNG or placeholder), then starts the sortie menu.
import Phaser from 'phaser';
import { loadPngArt, makeArtKit, registerCommonArt } from '../gfx/textures';
import { registerFlightArt } from '../../mechanics/flight/art/register';
import { registerWalkArt } from '../../mechanics/walk/art/register';
import { WALK_LIST } from '../../mechanics/walk/levels';

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
    const owners = new Map<string, string>();
    registerCommonArt(makeArtKit(this, 'core', owners));
    registerFlightArt(makeArtKit(this, 'flight', owners));
    registerWalkArt(makeArtKit(this, 'walk', owners));
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
