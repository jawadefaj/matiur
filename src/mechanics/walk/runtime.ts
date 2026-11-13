// The walk mechanic's Phaser side: its scene and textures.
import { defineRuntime } from '../../core/runtime';
import { registerWalkArt } from './art/register';
import { WALK_SCENES, WalkScene } from './scenes/WalkScene';

export default defineRuntime({
  id: 'walk',
  scenes: [WalkScene],
  entryScene: WALK_SCENES.walk,
  registerArt: registerWalkArt,
});
