// Placeholder cutscene player: shows the 'line' shots of a script from
// src/data/cutscenes/<script>.json in a dialogue box, or the step's
// placeholder lines until that file exists. Tap for the next line, hold to
// skip. The full GDD §6.9 player (camera moves, portraits, sound) will be a
// mechanic in src/mechanics/cutscene/ and replace this scene automatically.
import Phaser from 'phaser';
import type { CutsceneStep, DialogueLine, StepHost } from '../contracts';
import { CSS, EXTRA_H, GAME_H, GAME_W, PAL } from '../config';
import { CORE_SCENES } from '../manager/GameManager';
import { CUTSCENES, scriptLines } from '../media/content';
import { txt } from '../ui/widgets';
import { onTaps } from './taps';

export class CutsceneScene extends Phaser.Scene {
  private host!: StepHost<CutsceneStep>;
  private lines: DialogueLine[] = [];
  private index = 0;
  private speaker!: Phaser.GameObjects.Text;
  private line!: Phaser.GameObjects.Text;
  private bar!: Phaser.GameObjects.Graphics;
  private holdProgress: () => number = () => 0;

  constructor() {
    super(CORE_SCENES.cutscene);
  }

  init(data: { host: StepHost<CutsceneStep> }): void {
    this.host = data.host;
    this.index = 0;
  }

  create(): void {
    const c = this.host.params;
    const script = CUTSCENES[c.script];
    const placeholder = !script;
    this.lines = script ? scriptLines(script) : (c.placeholder ?? [{ text: `(cutscene "${c.script}" not written yet)` }]);
    if (!script) console.info(`Cutscene "${c.script}": no src/data/cutscenes/${c.script}.json yet, showing placeholder lines.`);

    const ep = this.host.episode;
    const oy = Math.round(EXTRA_H / 2);
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x15171a).setOrigin(0);
    if (ep) txt(this, GAME_W / 2, oy + 120, `${ep.date}\n${ep.place}`, 8, CSS.dim).setOrigin(0.5, 0).setAlign('center');
    if (placeholder) txt(this, GAME_W / 2, oy + 170, 'PLACEHOLDER SCENE', 8, CSS.warn).setOrigin(0.5);

    // Dialogue box at the bottom, like the walk scene's.
    const boxY = GAME_H - 150;
    const g = this.add.graphics();
    g.fillStyle(PAL.panel, 0.95);
    g.fillRect(10, boxY, GAME_W - 20, 96);
    g.lineStyle(1, PAL.panelEdge, 1);
    g.strokeRect(10.5, boxY + 0.5, GAME_W - 21, 95);
    this.speaker = txt(this, 20, boxY + 10, '', 8, CSS.signal);
    this.line = txt(this, 20, boxY + 28, '', 8, CSS.white, GAME_W - 40);
    txt(this, GAME_W / 2, GAME_H - 40, this.host.canSkip ? 'TAP: NEXT   HOLD: SKIP' : 'TAP: NEXT', 8, CSS.dim).setOrigin(0.5);
    this.bar = this.add.graphics();

    this.holdProgress = onTaps(this, {
      tap: () => this.nextLine(),
      hold: this.host.canSkip ? () => this.host.advance() : undefined,
    });
    this.show();
  }

  private nextLine(): void {
    this.index++;
    if (this.index >= this.lines.length) this.host.finish();
    else this.show();
  }

  private show(): void {
    const l = this.lines[this.index];
    this.speaker.setText(l?.speaker ?? '');
    this.line.setText(l?.text ?? '');
  }

  update(): void {
    const p = this.holdProgress();
    this.bar.clear();
    if (p > 0) {
      this.bar.fillStyle(PAL.signal, 1);
      this.bar.fillRect(0, GAME_H - 4, GAME_W * p, 4);
    }
  }
}
