// The flight mechanic's Phaser side: its scenes and textures.
import { defineRuntime } from '../../core/runtime';
import { registerFlightArt } from './art/register';
import { FlightHudScene } from './scenes/FlightHudScene';
import { FLIGHT_SCENES, FlightScene } from './scenes/FlightScene';

export default defineRuntime({
  id: 'flight',
  // The HUD after the flight scene: it updates first (writes the controls) and draws on top.
  scenes: [FlightScene, FlightHudScene],
  entryScene: FLIGHT_SCENES.flight,
  registerArt: registerFlightArt,
});
