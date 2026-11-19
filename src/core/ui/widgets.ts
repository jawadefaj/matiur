// Small UI helpers: game text and tappable buttons with manual hit-testing
// (works with multi-touch alongside the flight controls).
import Phaser from 'phaser';
import { CSS, GAME_H, GAME_W, PAL } from '../config';
import { FONT, FONT_SCALE, FONT_WEIGHT, localDigits } from '../i18n';

/**
 * Measured for the line height: Latin plus Bengali letters that reach
 * highest and lowest, so vowel signs above and below are never clipped.
 */
const TEST_STRING = '|MÉqgyকিঁর্খুূৃ';

/**
 * Text is drawn at the screen's real pixel density, then shown on the
 * 360 px wide game canvas, so Bengali letters stay sharp on a phone.
 */
function textResolution(): number {
  if (typeof window === 'undefined') return 1;
  const zoom = Math.min(window.innerWidth / GAME_W, window.innerHeight / GAME_H);
  return Math.max(1, Math.min(4, Math.ceil((window.devicePixelRatio || 1) * zoom)));
}

/**
 * Add game text at (x, y). `size` is in px of the original 8 px pixel-font
 * layout; the font scale in src/data/strings.xml enlarges it. `wrap` is a
 * word-wrap width in px (0 = no wrap). Digits follow the XML's <digits>.
 */
export function txt(
  scene: Phaser.Scene,
  x: number,
  y: number,
  s: string,
  size = 8,
  color = CSS.white,
  wrap = 0,
): Phaser.GameObjects.Text {
  const px = Math.round(size * FONT_SCALE);
  const style: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: FONT,
    fontStyle: String(FONT_WEIGHT),
    fontSize: `${px}px`,
    color,
    lineSpacing: Math.round(px * 0.15),
    testString: TEST_STRING,
    resolution: textResolution(),
  };
  if (wrap > 0) style.wordWrap = { width: wrap };
  const text = scene.add.text(x, y, localDigits(s), style);
  // Smooth, not pixelated: the game's pixelArt setting would make letters jagged.
  text.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  // Every later setText also gets local digits.
  const setText = text.setText.bind(text);
  text.setText = (v: string | string[]) => setText(Array.isArray(v) ? v.map((l) => localDigits(String(l))) : localDigits(String(v)));
  return text;
}

/**
 * A tappable box with a centred label. Only the label is a game object: the
 * box is drawn by draw() into a Graphics that the scene clears every frame.
 */
export class Button {
  /** True while a pointer that went down on this button is held. */
  pressed = false;
  visible = true;
  readonly text: Phaser.GameObjects.Text;

  /** (x, y) is the top-left corner and (w, h) the size, in px. A primary button has a yellow label and border. */
  constructor(
    scene: Phaser.Scene,
    public x: number,
    public y: number,
    public w: number,
    public h: number,
    label: string,
    public onTap: () => void,
    public primary = false,
  ) {
    this.text = txt(scene, x + w / 2, y + h / 2, label, 8, primary ? CSS.signal : CSS.white).setOrigin(0.5);
  }

  contains(px: number, py: number): boolean {
    return this.visible && px >= this.x && px <= this.x + this.w && py >= this.y && py <= this.y + this.h;
  }

  setLabel(s: string): void {
    this.text.setText(s);
  }

  setVisible(v: boolean): void {
    this.visible = v;
    this.text.setVisible(v);
  }

  /** Put the label just above depth d. The box takes the depth of the Graphics it is drawn into. */
  setDepth(d: number): void {
    this.text.setDepth(d + 0.1);
  }

  /** Draw the box into g: drop shadow, face and border. A pressed button shifts 1 px toward its shadow. */
  draw(g: Phaser.GameObjects.Graphics): void {
    if (!this.visible) return;
    const o = this.pressed ? 1 : 0;
    g.fillStyle(PAL.ink, 1);
    g.fillRect(this.x + 2, this.y + 2, this.w, this.h);
    g.fillStyle(this.pressed ? PAL.panelEdge : PAL.panel, 1);
    g.fillRect(this.x + o, this.y + o, this.w, this.h);
    g.lineStyle(1, this.primary ? PAL.signal : PAL.panelEdge, 1);
    g.strokeRect(this.x + o + 0.5, this.y + o + 0.5, this.w - 1, this.h - 1);
    this.text.setPosition(this.x + this.w / 2 + o, this.y + this.h / 2 + o);
  }

  destroy(): void {
    this.text.destroy();
  }
}

/** Tracks presses so a tap only fires if it starts and ends on the same button. */
export class ButtonSet {
  buttons: Button[] = [];
  /** Pointer id -> the button that pointer pressed. */
  private down = new Map<number, Button>();

  add(b: Button): Button {
    this.buttons.push(b);
    return b;
  }

  /** Press the button under (x, y) for pointer `id`. Returns true if a button was hit. */
  pointerDown(id: number, x: number, y: number): boolean {
    const b = this.buttons.find((bb) => bb.contains(x, y));
    if (!b) return false;
    b.pressed = true;
    this.down.set(id, b);
    return true;
  }

  /**
   * Release pointer `id`. Its button's onTap runs only if the pointer is still
   * over it. Returns true if the pointer had pressed a button.
   */
  pointerUp(id: number, x: number, y: number): boolean {
    const b = this.down.get(id);
    if (!b) return false;
    this.down.delete(id);
    b.pressed = false;
    if (b.contains(x, y)) b.onTap();
    return true;
  }

  draw(g: Phaser.GameObjects.Graphics): void {
    for (const b of this.buttons) b.draw(g);
  }

  /** Destroy every label and forget all buttons and presses. */
  clear(): void {
    for (const b of this.buttons) b.destroy();
    this.buttons = [];
    this.down.clear();
  }
}
