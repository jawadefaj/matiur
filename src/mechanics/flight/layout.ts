// Flight-scene layout: render order and HUD positions (logical pixels).
import { EXTRA_H, GAME_H, GAME_W } from '../../core/config';

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
const THR_H = Math.round(200 + EXTRA_H * 0.4);
const THR_Y = GAME_H - 110 - THR_H;

/**
 * The same layout in every flight level (design/design.md, Flight > Controls):
 * left thumb: CLIMB and DIVE above the throttle, LOCK below it; right thumb:
 * drag anywhere else to steer. Altitude bar on the right edge, pause bottom right.
 */
export const HUD = {
  // Top panel height, then the hint line and the radio box below it. Sized
  // for Bengali text, whose letters reach higher and lower than Latin ones.
  topH: 54,
  objectiveY: 56,
  radioY: 78,
  // pause, lock, throttle and altBar are rectangles (top-left x, y); climb
  // and dive are circles (centre x, y and radius r).
  pause: { x: 310, y: GAME_H - 50, w: 44, h: 44 },
  lock: { x: 6, y: GAME_H - 96, w: 44, h: 44 },
  // On tall screens the throttle grows by 40% of EXTRA_H and the altitude
  // bar by 50%. The throttle's bottom stays 110 px above the screen bottom.
  throttle: { x: 10, y: THR_Y, w: 36, h: THR_H },
  dive: { x: 28, y: THR_Y - 50, r: 24 },
  climb: { x: 28, y: THR_Y - 108, r: 24 },
  altBar: { x: 332, y: 150, w: 22, h: Math.round(280 + EXTRA_H * 0.5) },
  // Playfield between the top panels and the bottom controls. The camera
  // centres its look-ahead point in it, and HUD edge arrows stay inside it.
  playTop: 120,
  playBottom: GAME_H - 92,
  // Edge arrows stay between the left controls and the altitude bar.
  playLeft: 58,
  playRight: GAME_W - 34,
};
