// The menu, generated from the game definition (src/game/). With one episode
// it opens straight on that episode: CONTINUE, its chapters, settings and
// notes. With several it first lists the episodes.
import Phaser from 'phaser';
import type { EpisodeDef, SettingDef, SettingValue } from '../contracts';
import { CSS, EXTRA_H, GAME_H, GAME_W } from '../config';
import { CORE_SCENES, gmOf, type GameManager, type MenuData } from '../manager/GameManager';
import { episodeProgress, loadSave, mechanicSetting, setMechanicSetting, updateSettings } from '../save';
import { Button, ButtonSet, txt } from '../ui/widgets';

export class MenuScene extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics;
  private buttons = new ButtonSet();
  private ground: Phaser.GameObjects.TileSprite | null = null;
  private gm!: GameManager;
  private focus?: string;

  constructor() {
    super(CORE_SCENES.menu);
  }

  init(data: MenuData): void {
    this.focus = data?.episode;
  }

  create(): void {
    this.gm = gmOf(this);
    // A fresh set each time: Phaser reuses this scene object when the menu reopens.
    this.buttons = new ButtonSet();
    const bg = this.gm.parts.game.menuBackground;
    this.ground = bg && this.textures.exists(bg) ? this.add.tileSprite(0, 0, GAME_W, GAME_H, bg).setOrigin(0) : null;
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0b0c0d, this.ground ? 0.55 : 1).setOrigin(0);
    this.g = this.add.graphics();

    const episodes = this.gm.flow.episodes;
    const ep = episodes.length === 1 ? episodes[0] : episodes.find((e) => e.id === this.focus);
    if (ep) this.buildEpisode(ep, episodes.length > 1);
    else this.buildEpisodeList(episodes);

    // ButtonSet does its own hit-testing. The first tap also unlocks video
    // playback (phones only allow it after a tap).
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.buttons.pointerDown(p.id, p.x, p.y));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      this.gm.video.unlock();
      this.buttons.pointerUp(p.id, p.x, p.y);
    });
  }

  /** The list of episodes, shown when there is more than one. */
  private buildEpisodeList(episodes: EpisodeDef[]): void {
    const game = this.gm.parts.game;
    const save = loadSave();
    const oy = Math.round(EXTRA_H / 2);
    txt(this, GAME_W / 2, oy + 48, game.title.toUpperCase(), 16, CSS.signal).setOrigin(0.5);
    if (game.subtitle) txt(this, GAME_W / 2, oy + 72, game.subtitle, 8, CSS.dim).setOrigin(0.5);
    let y = oy + 110;
    episodes.forEach((e, i) => {
      const open = this.gm.flow.isUnlocked(e.id, save);
      const done = episodeProgress(save, e.id).finished ? '  [DONE]' : '';
      const label = open ? `EP ${e.number}: ${e.title.toUpperCase()}${done}` : `EP ${e.number}: LOCKED`;
      const go = () => open && this.scene.restart({ episode: e.id } satisfies MenuData);
      this.buttons.add(new Button(this, 30, y, 300, 44, label, go, open));
      txt(this, GAME_W / 2, y + 52, open ? `${e.date} - ${e.kind === 'playable' ? 'playable' : 'story'}` : '', 8, CSS.dim).setOrigin(0.5);
      this.input.keyboard?.on(`keydown-${KEY_NAMES[i]}`, go);
      y += 70;
    });
    this.buildSettings(Math.max(y + 10, oy + 420), []);
  }

  /** One episode: CONTINUE / PLAY, chapters, settings and notes. */
  private buildEpisode(ep: EpisodeDef, withBack: boolean): void {
    const flow = this.gm.flow;
    const save = loadSave();
    const p = episodeProgress(save, ep.id);
    const oy = Math.round(EXTRA_H / 2);
    const cx = GAME_W / 2;
    if (withBack) this.buttons.add(new Button(this, 6, 6, 64, 28, '< BACK', () => this.scene.restart({} satisfies MenuData)));
    txt(this, cx, oy + 30, this.gm.parts.game.title.toUpperCase(), 16, CSS.signal).setOrigin(0.5);
    txt(this, cx, oy + 56, `EPISODE ${ep.number}`, 8, CSS.dim).setOrigin(0.5);
    txt(this, cx, oy + 72, ep.title.toUpperCase(), 16, CSS.white).setOrigin(0.5);
    txt(this, cx, oy + 94, `${ep.date} - ${ep.place}`, 8, CSS.dim, GAME_W - 20).setOrigin(0.5);

    // CONTINUE where the player left off, else PLAY from the title card.
    let y = oy + 112;
    const resume = p.resume ? flow.resolve(`${ep.id}/${p.resume}`) : null;
    const first = flow.firstRef(ep.id);
    if (resume && resume.ref !== first) {
      const label = `CONTINUE: ${flow.title(resume.step).toUpperCase()}`;
      this.buttons.add(new Button(this, 30, y, 300, 40, label, () => this.gm.startEpisode(ep.id, 'resume'), true));
      this.buttons.add(new Button(this, 30, y + 46, 300, 30, 'PLAY FROM THE START', () => this.gm.startEpisode(ep.id, 'start')));
      y += 86;
    } else {
      this.buttons.add(new Button(this, 30, y, 300, 40, p.finished ? 'PLAY AGAIN' : 'PLAY', () => this.gm.startEpisode(ep.id, 'start'), true));
      y += 52;
    }
    this.input.keyboard?.on('keydown-ENTER', () => this.gm.startEpisode(ep.id, resume ? 'resume' : 'start'));

    // Chapters: each starts the episode from that step. Keys 1-9 on desktop.
    const chapters = flow.chapters(ep.id, save);
    if (chapters.length) {
      txt(this, cx, y + 4, 'CHAPTERS', 8, CSS.dim).setOrigin(0.5, 0);
      y += 18;
      chapters.forEach((c, i) => {
        const label = `${i + 1}. ${c.title.toUpperCase()}${c.done ? '  [DONE]' : c.locked ? '  [LOCKED]' : ''}`;
        const go = () => !c.locked && this.gm.startStep(c.ref);
        this.buttons.add(new Button(this, 30, y, 300, 32, label, go));
        if (i < KEY_NAMES.length) this.input.keyboard?.on(`keydown-${KEY_NAMES[i]}`, go);
        y += 38;
      });
    }

    // Settings of the mechanics this episode uses (e.g. flight's GUNS).
    const used = new Set(ep.steps.flatMap((s) => (s.kind === 'level' ? [s.mechanic] : [])));
    const defs = [...used].flatMap((id) => (this.gm.parts.descriptors[id]?.settings ?? []).map((d) => ({ owner: id, def: d })));
    y = this.buildSettings(y + 8, defs);

    if (ep.notes.length) txt(this, cx, y + 8, ep.notes.join('\n'), 8, CSS.dim, GAME_W - 20).setOrigin(0.5, 0).setAlign('center');
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
    // Drift the ground down the screen at 30 px/s, as if flying north.
    if (this.ground) this.ground.tilePositionY -= dms * 0.03;
    // Buttons are drawn into one Graphics, redrawn every frame to show presses.
    this.g.clear();
    this.buttons.draw(this.g);
  }
}

/** Phaser key names for keys 1-9. */
const KEY_NAMES = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
