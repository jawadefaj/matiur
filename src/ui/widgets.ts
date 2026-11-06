// Small UI helpers: pixel-font text and tappable buttons with manual
// hit-testing (works with multi-touch alongside the flight controls).
import Phaser from 'phaser';
import { CSS, FONT, PAL } from '../config';

export function txt(
  scene: Phaser.Scene,
  x: number,
  y: number,
  s: string,
  size = 8,
  color = CSS.white,
  wrap = 0,
): Phaser.GameObjects.Text {
  const style: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: FONT,
    fontSize: `${size}px`,
    color,
    lineSpacing: Math.round(size * 0.5),
  };
  if (wrap > 0) style.wordWrap = { width: wrap };
  return scene.add.text(x, y, s, style);
}

export class Button {
  pressed = false;
  visible = true;
  readonly text: Phaser.GameObjects.Text;

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

  setDepth(d: number): void {
    this.text.setDepth(d + 0.1);
  }

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
  private down = new Map<number, Button>();

  add(b: Button): Button {
    this.buttons.push(b);
    return b;
  }

  pointerDown(id: number, x: number, y: number): boolean {
    const b = this.buttons.find((bb) => bb.contains(x, y));
    if (!b) return false;
    b.pressed = true;
    this.down.set(id, b);
    return true;
  }

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

  clear(): void {
    for (const b of this.buttons) b.destroy();
    this.buttons = [];
    this.down.clear();
  }
}
