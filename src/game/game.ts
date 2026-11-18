// THE GAME SCRIPT, part 1: game-wide settings.
// Episodes are in ./episodes/ (one file each, found automatically). Mechanics
// are in src/mechanics/ (one folder each, found automatically).
import { defineGame } from '../core/define';

export const GAME = defineGame({
  title: 'Wings of Freedom',
  subtitle: 'The Legend of Matiur Rahman',
  // Texture tiled behind the menu (made by registerCommonArt in core/gfx/textures.ts).
  menuBackground: 'ground_farmland',
  // 'open': any chapter can be started from the menu. 'inOrder': each opens when the one before it is done.
  chapters: 'open',
  // Dev builds only (npm run dev): open every episode, and N finishes the current step.
  dev: { unlockAll: true, skipKey: true },
});
