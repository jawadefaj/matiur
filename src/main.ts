// Entry point, loaded by index.html. Waits for the pixel font, then creates
// the Phaser game with every scene.
import Phaser from 'phaser';
import { GAME_H, GAME_W } from './core/config';
import { BootScene } from './core/scenes/BootScene';
import { MenuScene } from './core/scenes/MenuScene';
import { FlightScene } from './mechanics/flight/scenes/FlightScene';
import { FlightHudScene } from './mechanics/flight/scenes/FlightHudScene';
import { WalkScene } from './mechanics/walk/scenes/WalkScene';

async function start(): Promise<void> {
  // Text is drawn to canvas, so the pixel font must be ready first.
  try {
    // Wait at most 3 s, so a slow or blocked font server cannot stop the game.
    await Promise.race([
      document.fonts.load('8px "Press Start 2P"'),
      new Promise((r) => setTimeout(r, 3000)),
    ]);
  } catch {
    // Fall back to monospace.
  }
  new Phaser.Game({
    type: Phaser.WEBGL,
    parent: 'game',
    width: GAME_W,
    height: GAME_H,
    // Same colour as the page background in index.html, so any bars around
    // the scaled canvas blend in.
    backgroundColor: '#111214',
    // Nearest-neighbour scaling and whole-pixel positions keep the art crisp.
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: {
      // Four touch points, so the stick, PULL, FIRE and throttle can be held at once.
      activePointers: 4,
    },
    // Order matters. The first scene (Boot) starts automatically. Phaser
    // updates scenes in reverse list order and renders them in list order, so
    // UI writes the controls before Flight steps the sim, and the HUD draws on top.
    scene: [BootScene, MenuScene, FlightScene, FlightHudScene, WalkScene],
  });
}

void start();
