import Phaser from 'phaser';
import { GAME_H, GAME_W } from './config';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { FlightScene } from './scenes/FlightScene';
import { UIScene } from './scenes/UIScene';

async function start(): Promise<void> {
  // Text is drawn to canvas, so the pixel font must be ready first.
  try {
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
    backgroundColor: '#111214',
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: {
      activePointers: 4,
    },
    scene: [BootScene, MenuScene, FlightScene, UIScene],
  });
}

void start();
