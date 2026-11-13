// Flight-scene layout: render order and HUD positions (logical pixels).
import { EXTRA_H, GAME_H } from '../../core/config';

/** Render order in the flight scene. */
export const DEPTH = {
  ground: 0,
  features: 1,
  obstacles: 2,
  shadows: 3,
  markers: 4,
  aircraft: 5,
  player: 6,
  bullets: 7,
  smoke: 8,
  // clouds and worldUi are unused: cloud images sit at markers - 0.5, below the jets.
  clouds: 9,
  worldUi: 10,
};

/** HUD layout (logical pixels). Touch targets are at least 44 px. */
const THR_H = Math.round(230 + EXTRA_H * 0.4);

export const HUD = {
  topH: 44,
  // objectiveY and radioY are unused: FlightHudScene hard-codes the hint (y 48) and radio box (y 62).
  objectiveY: 48,
  radioY: 62,
  // pause, throttle and altGauge are rectangles (top-left x, y); pull and
  // fire are circles (centre x, y and radius r).
  pause: { x: 6, y: GAME_H - 50, w: 44, h: 44 },
  pull: { x: 304, y: GAME_H - 50, r: 34 },
  fire: { x: 230, y: GAME_H - 40, r: 26 },
  // On tall screens the throttle grows by 40% of EXTRA_H and the altitude
  // gauge by 50%. The throttle's bottom stays 110 px above the screen bottom.
  throttle: { x: 318, y: GAME_H - 110 - THR_H, w: 36, h: THR_H },
  altGauge: { x: 6, y: 150, w: 22, h: Math.round(280 + EXTRA_H * 0.5) },
  // Playfield between the top panels and the bottom controls. The camera
  // centres its look-ahead point in it, and HUD edge arrows stay inside it.
  playTop: 100,
  playBottom: GAME_H - 92,
};
