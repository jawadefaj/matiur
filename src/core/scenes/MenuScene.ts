// The menu, generated from the game definition (src/game/). A scrolling list
// with one row per chapter: number, title, date, mode tag and PLAY / CONTINUE.
// Settings and FULL SCREEN are at the bottom.
import Phaser from 'phaser';
import type { EpisodeDef, SettingDef, SettingValue } from '../contracts';
import { CSS, EXTRA_H, GAME_H, GAME_W, PAL } from '../config';
import { MENU_GIF_KEY } from '../gfx/textures';
import { CORE_SCENES, gmOf, type GameManager } from '../manager/GameManager';
import { episodeProgress, loadSave, mechanicSetting, setMechanicSetting, updateSettings } from '../save';
import { t } from '../i18n';
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

  /** Moves with the page: a label or button at a fixed spot on the unscrolled page. */
  private scrollers: { move: (dy: number) => void }[] = [];
  private scroll = 0;
  private maxScroll = 0;
  /** Where the current drag started, or null. `moved` once it is a scroll and not a tap. */
  private drag: { y: number; from: number; moved: boolean } | null = null;

  /** Keep a label (and later reposition it) as the page scrolls. */
  private pinned<T extends Phaser.GameObjects.Text>(o: T): T {
    const y0 = o.y;
    this.scrollers.push({ move: (dy) => o.setY(y0 - dy) });
    return o;
  }

  /** Title, then one row per chapter (episode), then settings. The page scrolls. Keys 1-9, 0 start chapters on desktop. */
  private buildMenu(episodes: EpisodeDef[]): void {
    const flow = this.gm.flow;
    const game = this.gm.parts.game;
    const save = loadSave();
    const cx = GAME_W / 2;
    const oy = Math.round(EXTRA_H / 2);
    this.scrollers = [];
    this.scroll = 0;
    // Text drawn straight on the background gets a dark outline so it reads over the art.
    const onBg = (x: number, y: number, s: string, size: number, color: string) => this.pinned(txt(this, x, y, s, size, color).setStroke('#0b0c0d', 4));
    onBg(cx, oy + 24, game.title, 16, CSS.signal).setOrigin(0.5);
    if (game.subtitle) onBg(cx, oy + 46, game.subtitle, 8, CSS.dim).setOrigin(0.5);

    let y = oy + 72;
    let enter: (() => void) | null = null;
    episodes.forEach((ep, i) => {
      const open = flow.isUnlocked(ep.id, save);
      const p = episodeProgress(save, ep.id);
      const mode = ep.mode ? t(MODE_LABEL[ep.mode]) : '';
      onBg(24, y + 6, t('menu.level', { n: ep.number, title: ep.title }), 8, open ? CSS.signal : CSS.dim);
      onBg(24, y + 26, open ? t(p.finished ? 'menu.rowInfoDone' : 'menu.rowInfo', { date: ep.date, mode }) : t('menu.locked'), 8, CSS.dim);
      if (open) {
        // CONTINUE where the player left off, else PLAY from the start (title card and all).
        const resume = p.resume ? flow.resolve(`${ep.id}/${p.resume}`) : null;
        const from = resume && resume.ref !== flow.firstRef(ep.id) ? 'resume' : 'start';
        const play = () => this.gm.startEpisode(ep.id, from);
        const label = from === 'resume' ? t('ui.continue') : p.finished ? t('menu.replay') : t('menu.play');
        const b = this.buttons.add(new Button(this, 256, y + 8, 84, 30, label, play, from === 'resume' || !p.finished));
        const by = b.y;
        this.scrollers.push({ move: (dy) => (b.y = by - dy) });
        // ENTER plays the first chapter that isn't finished.
        if (!enter && !p.finished) enter = play;
        if (i < KEY_NAMES.length) this.input.keyboard?.on(`keydown-${KEY_NAMES[i]}`, play);
      }
      y += 54;
    });
    if (enter) this.input.keyboard?.on('keydown-ENTER', enter);

    // Settings of every mechanic the episodes use (e.g. flight's GUNS).
    const used = new Set(episodes.flatMap((ep) => ep.steps.flatMap((s) => (s.kind === 'level' ? [s.mechanic] : []))));
    const defs = [...used].flatMap((id) => (this.gm.parts.descriptors[id]?.settings ?? []).map((d) => ({ owner: id, def: d })));
    y = this.buildSettings(y + 8, defs);
    this.maxScroll = Math.max(0, y + 16 - GAME_H);
    this.setupScrolling();
  }

  /** Drag or wheel scrolls the page; a drag cancels the button press under the finger. */
  private setupScrolling(): void {
    const apply = (v: number) => {
      this.scroll = Phaser.Math.Clamp(v, 0, this.maxScroll);
      this.scrollers.forEach((s) => s.move(this.scroll));
    };
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.drag = { y: p.y, from: this.scroll, moved: false };
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown || !this.drag) return;
      if (!this.drag.moved && Math.abs(p.y - this.drag.y) > 8) {
        this.drag.moved = true;
        this.buttons.pointerUp(p.id, -999, -999); // release without a tap
      }
      if (this.drag.moved) apply(this.drag.from + this.drag.y - p.y);
    });
    this.input.on('pointerup', () => (this.drag = null));
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => apply(this.scroll + dy * 0.5));
  }

  /** Setting toggles, two per row, then FULL SCREEN. Each tap saves at once. Returns the y below them. */
  private buildSettings(y: number, defs: { owner: string; def: SettingDef }[]): number {
    const toggles: { label: () => string; next: () => void }[] = defs.map(({ owner, def }) => {
      const value = (): SettingValue => mechanicSetting(owner, def.key) ?? def.default;
      return {
        label: () => t('menu.setting', { label: def.label, value: def.valueLabels?.[String(value())] ?? String(value()) }),
        next: () => {
          const i = def.values.indexOf(value());
          setMechanicSetting(owner, def.key, def.values[(i + 1) % def.values.length]);
        },
      };
    });
    toggles.push({
      label: () => t('menu.setting', { label: t('menu.buzz'), value: loadSave().settings.haptics ? t('ui.on') : t('ui.off') }),
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
      const by = b.y;
      this.scrollers.push({ move: (dy) => (b.y = by - dy) });
      if (i % 2 === 1 || i === toggles.length - 1) y += 38;
    });
    if (this.scale.fullscreen.available) {
      const fs = this.buttons.add(new Button(this, 30, y, 300, 32, t('ui.fullScreen'), () => this.scale.toggleFullscreen()));
      const fy = fs.y;
      this.scrollers.push({ move: (dy) => (fs.y = fy - dy) });
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

/** String id of each chapter mode's menu tag. */
const MODE_LABEL = {
  cinematic: 'menu.mode.cinematic',
  stealth: 'menu.mode.stealth',
  flight: 'menu.mode.flight',
  interaction: 'menu.mode.interaction',
} as const;

/** Phaser key names for keys 1-9 and 0. */
const KEY_NAMES = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'ZERO'];
