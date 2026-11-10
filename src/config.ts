// Shared constants for scenes and the HUD.

/** Logical width in px. Phaser scales the whole canvas to fit the screen (see main.ts). */
export const GAME_W = 360;

/**
 * Logical height follows the screen's shape so tall phones are filled
 * instead of letterboxed: 640 (9:16) up to 800 (about 9:20). Fixed at boot.
 */
export const GAME_H = computeGameHeight();

function computeGameHeight(): number {
  // No DOM (not in a browser): use the 9:16 baseline.
  if (typeof document === 'undefined') return 640;
  // Measure #game (the safe-area box in index.html), or else the window.
  const el = document.getElementById('game');
  const w = el?.clientWidth || window.innerWidth;
  const h = el?.clientHeight || window.innerHeight;
  if (!w || !h) return 640;
  // Height with the screen's aspect ratio at 360 px wide, clamped to 640..800
  // and rounded to an even number, so GAME_H / 2 is a whole pixel.
  const raw = (GAME_W * h) / w;
  return Math.round(Math.min(800, Math.max(640, raw)) / 2) * 2;
}

/** Extra height beyond the 640 baseline (0 on a 9:16 screen). */
export const EXTRA_H = GAME_H - 640;

/** Font for all game text. index.html loads "Press Start 2P" and main.ts waits for it. */
export const FONT = '"Press Start 2P", monospace';

/**
 * Colours as Phaser numbers (0xRRGGBB). Only ochre, deepGreen, slate and
 * signal are seed colours of the master palette (design/init_design.md §4.1).
 */
export const PAL = {
  ochre: 0xd9a441,
  deepGreen: 0x3e6b35,
  slate: 0x55575a,
  signal: 0xf2d43d,
  panel: 0x262a22,
  panelEdge: 0x4a5240,
  ink: 0x15171a,
  white: 0xf4f4ef,
  aluminium: 0xd5dadf,
  warn: 0xe0a030,
  danger: 0xd8483a,
  ok: 0x7fbf5a,
  friendly: 0x6fd0e8,
  hostile: 0xe8913a,
};

/** Text colours as CSS strings, which Phaser text needs. All but `dim` match a PAL colour. */
export const CSS = {
  signal: '#f2d43d',
  white: '#f4f4ef',
  dim: '#b9bdb0',
  warn: '#e0a030',
  danger: '#d8483a',
  ok: '#7fbf5a',
  friendly: '#6fd0e8',
};

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
