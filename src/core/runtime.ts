// A mechanic's Phaser side, exported as the default from
// src/mechanics/<id>/runtime.ts. Kept apart from the descriptor (index.ts) so
// tests can load the game definition without Phaser.
import type Phaser from 'phaser';
import type { ArtKit } from './gfx/textures';

export interface MechanicRuntime {
  /** Must match the descriptor's id and the folder name. */
  readonly id: string;
  /**
   * Scene classes, in the order Phaser should hold them: later scenes render
   * on top and update first. Scene keys start with `${id}:`.
   */
  readonly scenes: readonly (new () => Phaser.Scene)[];
  /** The scene the manager starts with { host } for each level of this mechanic. */
  readonly entryScene: string;
  /** Where this mechanic's scenes go in the game's scene list (lower first). Default 0, ties by id. */
  readonly order?: number;
  /** Make this mechanic's textures. Runs once at boot. */
  registerArt?(kit: ArtKit): void;
  /** Queue files to load at boot (audio, tilesets, maps). */
  preload?(scene: Phaser.Scene): void;
}

export function defineRuntime(r: MechanicRuntime): MechanicRuntime {
  return r;
}
