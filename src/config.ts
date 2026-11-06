// Shared constants for scenes and the HUD.

export const GAME_W = 360;

/**
 * Logical height follows the screen's shape so tall phones are filled
 * instead of letterboxed: 640 (9:16) up to 800 (about 9:20). Fixed at boot.
 */
export const GAME_H = computeGameHeight();

function computeGameHeight(): number {
  if (typeof document === 'undefined') return 640;
  const el = document.getElementById('game');
  const w = el?.clientWidth || window.innerWidth;
  const h = el?.clientHeight || window.innerHeight;
  if (!w || !h) return 640;
  const raw = (GAME_W * h) / w;
  return Math.round(Math.min(800, Math.max(640, raw)) / 2) * 2;
}

/** Extra height beyond the 640 baseline (0 on a 9:16 screen). */
export const EXTRA_H = GAME_H - 640;

export const FONT = '"Press Start 2P", monospace';

/** Seed colours of the master palette (see design/init_design.md §4.1). */
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
  clouds: 9,
  worldUi: 10,
};

/** HUD layout (logical pixels). Touch targets are at least 44 px. */
const THR_H = Math.round(230 + EXTRA_H * 0.4);

export const HUD = {
  topH: 44,
  objectiveY: 48,
  radioY: 62,
  pause: { x: 6, y: GAME_H - 50, w: 44, h: 44 },
  pull: { x: 304, y: GAME_H - 50, r: 34 },
  fire: { x: 230, y: GAME_H - 40, r: 26 },
  throttle: { x: 318, y: GAME_H - 110 - THR_H, w: 36, h: THR_H },
  altGauge: { x: 6, y: 150, w: 22, h: Math.round(280 + EXTRA_H * 0.5) },
  playTop: 100,
  playBottom: GAME_H - 92,
};
