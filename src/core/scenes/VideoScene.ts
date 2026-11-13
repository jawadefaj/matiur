// Plays a video step through the GameManager's HTML video overlay. If the
// file is missing or can't play, shows the step's fallback text instead.
import Phaser from 'phaser';
import type { StepHost, VideoStep } from '../contracts';
import { CSS, GAME_H, GAME_W } from '../config';
import { CORE_SCENES, gmOf } from '../manager/GameManager';
import { VIDEOS } from '../media/content';
import { txt } from '../ui/widgets';
import { onTaps } from './taps';

export class VideoScene extends Phaser.Scene {
  private host!: StepHost<VideoStep>;
  private prompt: Phaser.GameObjects.Text | null = null;

  constructor() {
    super(CORE_SCENES.video);
  }

  init(data: { host: StepHost<VideoStep> }): void {
    this.host = data.host;
    this.prompt = null;
  }

  create(): void {
    const v = this.host.params;
    const gm = gmOf(this);
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x111214).setOrigin(0);
    // Leaving this scene (quit, the dev N key) stops the video.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => gm.video.stop());
    const url = VIDEOS[v.src];
    if (!url) {
      console.warn(`No video "${v.src}" in assets/video/ (looked for ${v.src}.mp4 and ${v.src}.webm)`);
      this.showFallback();
      return;
    }
    void gm.video.play(url, { muted: v.muted, fit: v.fit, canSkip: this.host.canSkip, holdMs: 800 }).then((end) => {
      if (!this.scene.isActive()) return;
      if (end === 'error') {
        console.warn(`Video "${v.src}" could not play (codec or file problem).`);
        this.showFallback();
      } else {
        this.host.finish();
      }
    });
  }

  /** The step's fallback lines as a tap-to-continue card, or straight on if it has none. */
  private showFallback(): void {
    const lines = this.host.params.fallback;
    if (!lines?.length) {
      this.host.finish();
      return;
    }
    txt(this, GAME_W / 2, GAME_H / 2 - 40, lines.join('\n\n'), 8, CSS.white, GAME_W - 60).setOrigin(0.5, 0).setAlign('center');
    this.prompt = txt(this, GAME_W / 2, GAME_H - 120, 'TAP TO CONTINUE', 8, CSS.signal).setOrigin(0.5);
    onTaps(this, { tap: () => this.host.finish() });
  }

  update(time: number): void {
    this.prompt?.setVisible(Math.floor(time / 500) % 2 === 0);
  }
}
