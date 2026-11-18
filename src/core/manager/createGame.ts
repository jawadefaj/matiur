// Starts Phaser with the manager's scenes plus every mechanic's scenes, and
// makes the GameManager. Called once by src/main.ts.
import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';
import { HtmlVideoPlayer } from '../media/VideoPlayer';
import { BootScene } from '../scenes/BootScene';
import { CardScene } from '../scenes/CardScene';
import { CutsceneScene } from '../scenes/CutsceneScene';
import { MenuScene } from '../scenes/MenuScene';
import { VideoScene } from '../scenes/VideoScene';
import { GameManager, type GameParts } from './GameManager';

export async function createGame(parts: GameParts): Promise<GameManager> {
  document.title = parts.game.title;
  // Text is drawn to canvas, so the pixel font must be ready first.
  try {
    // Wait at most 3 s, so a slow or blocked font server cannot stop the game.
    await Promise.race([document.fonts.load('8px "Press Start 2P"'), new Promise((r) => setTimeout(r, 3000))]);
  } catch {
    // Fall back to monospace.
  }

  const container = document.getElementById('game');
  if (!container) throw new Error('index.html needs a <div id="game">');
  const video = new HtmlVideoPlayer(container);

  // Order matters. The first scene (Boot) starts automatically. Phaser updates
  // scenes in reverse list order and renders them in list order, so within a
  // mechanic a HUD listed after its world scene writes the controls before the
  // world steps, and draws on top.
  const runtimes = Object.values(parts.runtimes).sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));
  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent: container,
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
      // Full screen the whole #game box, so the video overlay stays visible.
      fullscreenTarget: container,
    },
    input: {
      // Four touch points, so the stick, PULL, FIRE and throttle can be held at once.
      activePointers: 4,
    },
    scene: [BootScene, MenuScene, CardScene, VideoScene, CutsceneScene, ...runtimes.flatMap((r) => r.scenes)],
  });

  const gm = new GameManager(game, parts, video);
  game.registry.set('gm', gm);
  // Dev builds: N finishes the current step, to click through an episode fast.
  if (import.meta.env.DEV && parts.game.dev.skipKey) {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'n' || e.key === 'N') gm.finishCurrent();
    });
    (window as unknown as { __gm: GameManager }).__gm = gm;
  }
  return gm;
}
