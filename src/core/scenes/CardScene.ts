// Full-screen cards: the episode title card that opens every episode and the
// archive card that closes it (GDD §6.7, §0 rule 4). Tap to continue.
import Phaser from 'phaser';
import type { CardStep, StepHost } from '../contracts';
import { CSS, EXTRA_H, GAME_H, GAME_W, PAL } from '../config';
import { CORE_SCENES } from '../manager/GameManager';
import { episodeProgress, loadSave } from '../save';
import { txt } from '../ui/widgets';
import { onTaps } from './taps';

export class CardScene extends Phaser.Scene {
  private host!: StepHost<CardStep>;
  private prompt!: Phaser.GameObjects.Text;

  constructor() {
    super(CORE_SCENES.card);
  }

  init(data: { host: StepHost<CardStep> }): void {
    this.host = data.host;
  }

  create(): void {
    const card = this.host.params.card;
    const ep = this.host.episode;
    const cx = GAME_W / 2;
    const oy = Math.round(EXTRA_H / 2);
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0b0c0d).setOrigin(0);
    const g = this.add.graphics();
    g.lineStyle(1, PAL.signal, 1);
    g.strokeRect(20.5, oy + 140.5, GAME_W - 41, 359);

    if (card.type === 'title') {
      txt(this, cx, oy + 200, ep ? `EPISODE ${ep.number}` : '', 8, CSS.dim).setOrigin(0.5);
      txt(this, cx, oy + 232, (ep?.title ?? '').toUpperCase(), 16, CSS.signal).setOrigin(0.5);
      txt(this, cx, oy + 280, ep?.date ?? '', 8, CSS.white).setOrigin(0.5);
      txt(this, cx, oy + 300, ep?.place ?? '', 8, CSS.dim).setOrigin(0.5);
    } else {
      // {step-id.key} placeholders take the stats saved this episode.
      const stats = ep ? episodeProgress(loadSave(), ep.id).stats : {};
      const text = card.text.replace(/\{([^}]+)\}/g, (_m, k: string) => String(stats[k] ?? '-'));
      txt(this, cx, oy + 160, 'ARCHIVE', 8, CSS.dim).setOrigin(0.5);
      txt(this, cx, oy + 184, card.heading.toUpperCase(), 16, CSS.signal, GAME_W - 60).setOrigin(0.5, 0).setAlign('center');
      const body = txt(this, 36, oy + 232, `${card.date ? card.date + '\n\n' : ''}${text}`, 8, CSS.white, GAME_W - 72);
      if (card.source) txt(this, 36, body.y + body.height + 16, card.source, 8, CSS.dim, GAME_W - 72);
    }
    this.prompt = txt(this, cx, oy + 470, card.type === 'title' ? 'TAP TO BEGIN' : 'TAP TO CONTINUE', 8, CSS.signal).setOrigin(0.5);

    onTaps(this, { tap: () => this.host.finish() });
  }

  update(time: number): void {
    // The prompt blinks 0.5 s on, 0.5 s off.
    this.prompt.setVisible(Math.floor(time / 500) % 2 === 0);
  }
}
