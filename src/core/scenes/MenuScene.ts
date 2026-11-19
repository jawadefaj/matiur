// The menu, generated from the game definition (src/game/). One screen lists
// every episode: its heading with PLAY / CONTINUE, then its chapters. Settings
// and FULL SCREEN are at the bottom.
import Phaser from 'phaser';
import type { EpisodeDef, SettingDef, SettingValue } from '../contracts';
import { CSS, EXTRA_H, GAME_H, GAME_W, PAL } from '../config';
import { MENU_GIF_KEY } from '../gfx/textures';
import { CORE_SCENES, gmOf, type GameManager } from '../manager/GameManager';
import { episodeProgress, loadSave, mechanicSetting, setMechanicSetting, updateSettings } from '../save';
import { Button, ButtonSet, txt } from '../ui/widgets';

export class MenuScene extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics;
  private buttons = new ButtonSet();
  private ground: Phaser.GameObjects.TileSprite | null = null;
  private gm!: GameManager;

  constructor() {
    super(CORE_SCENES.menu);
  }

  create(): void {
    this.gm = gmOf(this);
    // A fresh set each time: Phaser reuses this scene object when the menu reopens.
    this.buttons = new ButtonSet();
    this.ground = this.addBackground();
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0b0c0d, this.ground ? 0.55 : 1).setOrigin(0);
    this.g = this.add.graphics();
    this.buildMenu(this.gm.flow.episodes);

    // ButtonSet does its own hit-testing. The first tap also unlocks video
    // playback (phones only allow it after a tap).
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.buttons.pointerDown(p.id, p.x, p.y));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      this.gm.video.unlock();
      this.buttons.pointerUp(p.id, p.x, p.y);
    });
  }

  /** The game's menuBackground tiled over the screen (a GIF plays its animation), or null if there is none. */
  private addBackground(): Phaser.GameObjects.TileSprite | null {
    const bg = this.gm.parts.game.menuBackground;
    const key = typeof bg === 'string' ? bg : bg ? MENU_GIF_KEY : null;
    if (!key || !this.textures.exists(key)) return null;
    const animated = this.anims.exists(key);
    // A GIF usually has a transparent background: give it a tarmac-grey one.
    if (animated) this.add.rectangle(0, 0, GAME_W, GAME_H, PAL.slate).setOrigin(0);
    const ground = this.add.tileSprite(0, 0, GAME_W, GAME_H, key, animated ? 0 : undefined).setOrigin(0);
    // Centre the columns, so the screen edges cut both outer columns equally.
    ground.tilePositionX = -Math.round((GAME_W % ground.frame.width) / 2);
    if (animated) ground.anims.play(key);
    return ground;
  }

  /** Title, then each episode with its chapters, then settings. Keys 1-9 start chapters on desktop. */
  private buildMenu(episodes: EpisodeDef[]): void {
    const flow = this.gm.flow;
    const game = this.gm.parts.game;
    const save = loadSave();
    const cx = GAME_W / 2;
    const oy = Math.round(EXTRA_H / 2);
    // Text drawn straight on the background gets a dark outline so it reads over the art.
    const onBg = (x: number, y: number, s: string, size: number, color: string) => txt(this, x, y, s, size, color).setStroke('#0b0c0d', 4);
    onBg(cx, oy + 24, game.title.toUpperCase(), 16, CSS.signal).setOrigin(0.5);
    if (game.subtitle) onBg(cx, oy + 46, game.subtitle, 8, CSS.dim).setOrigin(0.5);

    let y = oy + 66;
    let n = 0;
    let enter: (() => void) | null = null;
    for (const ep of episodes) {
      const open = flow.isUnlocked(ep.id, save);
      const p = episodeProgress(save, ep.id);
      onBg(30, y + 4, `LEVEL ${ep.number}: ${ep.title.toUpperCase()}`, 8, CSS.signal);
      onBg(30, y + 18, ep.date, 8, CSS.dim);
      if (!open) {
        onBg(330, y + 11, 'LOCKED', 8, CSS.dim).setOrigin(1, 0);
        y += 44;
        continue;
      }

      // CONTINUE where the player left off, else PLAY from the start (title card and all).
      const resume = p.resume ? flow.resolve(`${ep.id}/${p.resume}`) : null;
      const from = resume && resume.ref !== flow.firstRef(ep.id) ? 'resume' : 'start';
      const play = () => this.gm.startEpisode(ep.id, from);
      const label = from === 'resume' ? 'CONTINUE' : p.finished ? 'REPLAY' : 'PLAY';
      this.buttons.add(new Button(this, 240, y, 90, 28, label, play, true));
      // ENTER plays the first episode that isn't finished.
      if (!enter && !p.finished) enter = play;
      y += 36;

      // Chapters: each starts the episode from that step.
      flow.chapters(ep.id, save).forEach((c) => {
        const label = `${++n}. ${c.title.toUpperCase()}${c.done ? '  [DONE]' : c.locked ? '  [LOCKED]' : ''}`;
        const go = () => !c.locked && this.gm.playChapter(c.ref);
        this.buttons.add(new Button(this, 30, y, 300, 32, label, go));
        if (n <= KEY_NAMES.length) this.input.keyboard?.on(`keydown-${KEY_NAMES[n - 1]}`, go);
        y += 38;
      });
      y += 10;
    }
    if (enter) this.input.keyboard?.on('keydown-ENTER', enter);

    // Settings of every mechanic the episodes use (e.g. flight's GUNS).
    const used = new Set(episodes.flatMap((ep) => ep.steps.flatMap((s) => (s.kind === 'level' ? [s.mechanic] : []))));
    const defs = [...used].flatMap((id) => (this.gm.parts.descriptors[id]?.settings ?? []).map((d) => ({ owner: id, def: d })));
    this.buildSettings(y, defs);
  }

  /** Setting toggles, two per row, then FULL SCREEN. Each tap saves at once. Returns the y below them. */
  private buildSettings(y: number, defs: { owner: string; def: SettingDef }[]): number {
    const toggles: { label: () => string; next: () => void }[] = defs.map(({ owner, def }) => {
      const value = (): SettingValue => mechanicSetting(owner, def.key) ?? def.default;
      return {
        label: () => `${def.label}: ${String(value()).toUpperCase()}`,
        next: () => {
          const i = def.values.indexOf(value());
          setMechanicSetting(owner, def.key, def.values[(i + 1) % def.values.length]);
        },
      };
    });
    toggles.push({
      label: () => `BUZZ: ${loadSave().settings.haptics ? 'ON' : 'OFF'}`,
      next: () => updateSettings({ haptics: !loadSave().settings.haptics }),
    });
    toggles.forEach((t, i) => {
      const x = i % 2 === 0 ? 30 : 185;
      const b: Button = this.buttons.add(
        new Button(this, x, y, 145, 32, t.label(), () => {
          t.next();
          b.setLabel(t.label());
        }),
      );
      if (i % 2 === 1 || i === toggles.length - 1) y += 38;
    });
    if (this.scale.fullscreen.available) {
      this.buttons.add(new Button(this, 30, y, 300, 32, 'FULL SCREEN', () => this.scale.toggleFullscreen()));
      y += 38;
    }
    return y;
  }

  update(_t: number, dms: number): void {
    // Drift the background down the screen at 30 px/s: the walking pilots
    // head south, and a ground texture looks like flying north.
    if (this.ground) this.ground.tilePositionY -= dms * 0.03;
    // Buttons are drawn into one Graphics, redrawn every frame to show presses.
    this.g.clear();
    this.buttons.draw(this.g);
  }
}

/** Phaser key names for keys 1-9. */
const KEY_NAMES = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
