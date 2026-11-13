// On-foot scene: draws a walk level and turns touch and keys into walking.
// Tap the ground to walk there, tap a person to walk over and talk, or drag
// to walk like a stick. Desktop: arrows/WASD walk, Space/E talks or reads on.
import Phaser from 'phaser';
import { CSS, GAME_H, GAME_W, PAL } from '../../../core/config';
import { tuning } from '../../flight/tuning';
import { WALKER_COLS, WALKER_ROWS } from '../../../core/gfx/pixelArt';
import { makeWalkLevel, type WalkLevelId } from '../levels';
import type { Block, BlockStyle, WalkLevel } from '../WalkLevel';
import { WalkWorld } from '../WalkWorld';
import { Button, ButtonSet, txt } from '../../../core/ui/widgets';
import { clamp } from '../../../core/math';

/** Fixed simulation step (60 Hz), as in FlightScene. */
const STEP = 1 / 60;

/** Depths: ground and scenery, then y-sorted characters (DEPTH_ACTORS + y / 10000), then the HUD. */
const DEPTH_GROUND = 0;
const DEPTH_SCENERY = 1;
const DEPTH_MARKERS = 2;
const DEPTH_ACTORS = 3;
const DEPTH_LABELS = 5;
const DEPTH_HUD = 10;

/** Fill and edge colours per block style. */
const STYLE: Record<Exclude<BlockStyle, 'hidden'>, { fill: number; edge?: number }> = {
  grass: { fill: 0x7c8a52 },
  tarmac: { fill: 0x8d8a80 },
  floor: { fill: 0xa08a68 },
  line: { fill: PAL.signal },
  wall: { fill: 0xc9b48a, edge: 0x5a4a35 },
  table: { fill: 0x6a4a30, edge: 0x3a2a1c },
  locker: { fill: 0x6c7470, edge: 0x3a3f3c },
  hangar: { fill: 0x7a8288, edge: 0x3f4448 },
  bowser: { fill: 0x5a6a3a, edge: 0x2f3820 },
  crate: { fill: 0x8a6a3e, edge: 0x4a3820 },
  sandbag: { fill: 0xb8a57a, edge: 0x6e5f40 },
};

/** Drag this far (px) before a touch counts as a drag instead of a tap. */
const TAP_SLOP = 10;

interface DragState {
  id: number;
  x0: number;
  y0: number;
  x: number;
  y: number;
  dragging: boolean;
}

export class WalkScene extends Phaser.Scene {
  world!: WalkWorld;
  level!: WalkLevel;
  private levelId: WalkLevelId = 'flightline';
  private acc = 0;
  /** 'title' card, 'play', or the 'done' card. */
  private phase: 'title' | 'play' | 'done' = 'title';
  private sprites = new Map<string, Phaser.GameObjects.Sprite>();
  private markG!: Phaser.GameObjects.Graphics;
  private hudG!: Phaser.GameObjects.Graphics;
  private hintText!: Phaser.GameObjects.Text;
  private goalText!: Phaser.GameObjects.Text;
  private nameText!: Phaser.GameObjects.Text;
  private speakerText!: Phaser.GameObjects.Text;
  private lineText!: Phaser.GameObjects.Text;
  private cardTexts: Phaser.GameObjects.Text[] = [];
  private buttons = new ButtonSet();
  private talkBtn!: Button;
  private menuBtn!: Button;
  private drag: DragState | null = null;
  /** Where the last tap landed (world px) and how long its ring has left, s. */
  private tapMark = { x: 0, y: 0, t: 0 };
  private camX = 0;
  private camY = 0;
  private keys!: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd', Phaser.Input.Keyboard.Key>;

  constructor() {
    super('Walk');
  }

  init(data: { level?: WalkLevelId }): void {
    this.levelId = data.level ?? 'flightline';
    this.acc = 0;
    this.phase = 'title';
    this.sprites = new Map();
    this.cardTexts = [];
    this.drag = null;
    this.tapMark = { x: 0, y: 0, t: 0 };
  }

  create(): void {
    this.level = makeWalkLevel(this.levelId);
    this.world = new WalkWorld(this.level.map());
    this.level.setup(this.world);
    this.world.locked = true;

    this.buildScenery();
    this.markG = this.add.graphics().setDepth(DEPTH_MARKERS);
    for (const a of this.world.actors) {
      this.sprites.set(a.id, this.add.sprite(0, 0, a.look, 0).setOrigin(0.5, 0.92));
    }
    this.nameText = txt(this, 0, 0, '', 8, CSS.signal).setOrigin(0.5, 1).setDepth(DEPTH_LABELS);

    // HUD, pinned to the screen.
    this.hudG = this.add.graphics().setScrollFactor(0).setDepth(DEPTH_HUD);
    this.goalText = txt(this, 8, 8, '', 8, CSS.dim).setScrollFactor(0).setDepth(DEPTH_HUD + 1);
    this.hintText = txt(this, 8, 24, '', 8, CSS.white, GAME_W - 80).setScrollFactor(0).setDepth(DEPTH_HUD + 1);
    this.speakerText = txt(this, 18, 0, '', 8, CSS.signal).setScrollFactor(0).setDepth(DEPTH_HUD + 1);
    this.lineText = txt(this, 18, 0, '', 8, CSS.white, GAME_W - 36).setScrollFactor(0).setDepth(DEPTH_HUD + 1);

    this.buttons = new ButtonSet();
    this.menuBtn = this.buttons.add(new Button(this, GAME_W - 62, 6, 56, 32, 'MENU', () => this.scene.start('Menu')));
    this.talkBtn = this.buttons.add(new Button(this, GAME_W - 96, GAME_H - 64, 88, 48, 'TALK', () => this.world.interact(), true));
    for (const b of this.buttons.buttons) {
      b.text.setScrollFactor(0);
      b.setDepth(DEPTH_HUD);
    }

    this.cameras.main.setBounds(0, 0, this.world.width, this.world.height);
    const p = this.world.player;
    this.camX = clamp(p.x - GAME_W / 2, 0, Math.max(0, this.world.width - GAME_W));
    this.camY = clamp(p.y - GAME_H / 2, 0, Math.max(0, this.world.height - GAME_H));
    this.cameras.main.setScroll(Math.round(this.camX), Math.round(this.camY));

    this.showTitleCard();
    this.bindInput();
    this.syncVisuals(0);
    if (import.meta.env.DEV) (window as unknown as { __wofWalk: unknown }).__wofWalk = { scene: this };
  }

  update(_t: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.1);
    if (this.phase === 'play') {
      this.readKeys();
      this.acc += dt;
      let n = 0;
      while (this.acc >= STEP && n < 5) {
        this.world.step(STEP);
        this.level.update(this.world, STEP);
        this.acc -= STEP;
        n++;
      }
      if (n >= 5) this.acc = 0;
      if (this.level.status === 'complete') this.showDoneCard();
    }
    this.tapMark.t = Math.max(0, this.tapMark.t - dt);
    this.syncVisuals(dt);
  }

  // ---------------------------------------------------------------------------
  // Input

  private bindInput(): void {
    const kb = this.input.keyboard;
    if (kb) {
      const K = Phaser.Input.Keyboard.KeyCodes;
      this.keys = kb.addKeys({
        up: K.UP,
        down: K.DOWN,
        left: K.LEFT,
        right: K.RIGHT,
        w: K.W,
        a: K.A,
        s: K.S,
        d: K.D,
      }) as typeof this.keys;
      const onAction = () => this.action();
      kb.on('keydown-SPACE', onAction);
      kb.on('keydown-E', onAction);
      kb.on('keydown-ENTER', onAction);
      kb.on('keydown-ESC', () => this.scene.start('Menu'));
    }

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.buttons.pointerDown(p.id, p.x, p.y)) return;
      if (this.drag) return;
      this.drag = { id: p.id, x0: p.x, y0: p.y, x: p.x, y: p.y, dragging: false };
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const d = this.drag;
      if (!d || d.id !== p.id || this.phase !== 'play') return;
      d.x = p.x;
      d.y = p.y;
      if (!d.dragging && Math.hypot(d.x - d.x0, d.y - d.y0) > TAP_SLOP) d.dragging = true;
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.buttons.pointerUp(p.id, p.x, p.y)) return;
      const d = this.drag;
      if (!d || d.id !== p.id) return;
      this.drag = null;
      this.world.input = { dx: 0, dy: 0 };
      if (d.dragging) return;
      // A tap: read on, start, or walk/talk.
      if (this.phase !== 'play' || this.level.dialogue.length > 0) {
        this.action();
        return;
      }
      if (this.world.locked) return;
      const wp = this.cameras.main.getWorldPoint(p.x, p.y);
      this.world.tap(wp.x, wp.y);
      this.tapMark = { x: wp.x, y: wp.y, t: 0.5 };
    });
  }

  /** Space / tap with no other meaning: dismiss a card, read the next line, or talk. */
  private action(): void {
    if (this.phase === 'title') {
      this.clearCard();
      this.phase = 'play';
      return;
    }
    if (this.phase === 'done') return;
    if (this.level.dialogue.length > 0) this.level.advance();
    else this.world.interact();
  }

  /** Keys and the drag stick both write world.input. */
  private readKeys(): void {
    let dx = 0;
    let dy = 0;
    const k = this.keys;
    if (k) {
      if (k.left.isDown || k.a.isDown) dx -= 1;
      if (k.right.isDown || k.d.isDown) dx += 1;
      if (k.up.isDown || k.w.isDown) dy -= 1;
      if (k.down.isDown || k.s.isDown) dy += 1;
    }
    const d = this.drag;
    if (d?.dragging) {
      const t = tuning.walk;
      const ox = d.x - d.x0;
      const oy = d.y - d.y0;
      const len = Math.hypot(ox, oy);
      if (len > t.stickDeadZone) {
        // Walk speed grows with drag distance up to stickMax.
        const m = Math.min(1, (len - t.stickDeadZone) / (t.stickMax - t.stickDeadZone));
        dx = (ox / len) * Math.max(0.35, m);
        dy = (oy / len) * Math.max(0.35, m);
      }
    }
    this.world.input = { dx, dy };
  }

  // ---------------------------------------------------------------------------
  // Drawing

  private buildScenery(): void {
    const w = this.world;
    const g = this.add.graphics().setDepth(DEPTH_GROUND);
    g.fillStyle(this.level.groundColor, 1);
    g.fillRect(0, 0, w.width, w.height);
    // Flat ground blocks first, then solid ones, each in list order.
    const sg = this.add.graphics().setDepth(DEPTH_SCENERY);
    const draw = (b: Block) => {
      if (b.style === 'hidden') return;
      const st = STYLE[b.style];
      const gg = b.solid ? sg : g;
      gg.fillStyle(st.fill, 1);
      gg.fillRect(b.x, b.y, b.w, b.h);
      if (st.edge !== undefined) {
        gg.lineStyle(1, st.edge, 1);
        gg.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
      }
      if (b.style === 'hangar') {
        // Roof ribs and the open doors on the south face.
        gg.lineStyle(1, 0x656c72, 1);
        for (let x = b.x + 12; x < b.x + b.w - 4; x += 14) gg.lineBetween(x + 0.5, b.y + 2, x + 0.5, b.y + b.h - 10);
        gg.fillStyle(0x2a2d31, 1);
        gg.fillRect(b.x + 16, b.y + b.h - 8, b.w - 32, 8);
      }
    };
    for (const b of this.level.blocks) if (!b.solid) draw(b);
    for (const b of this.level.blocks) if (b.solid) draw(b);
    for (const p of this.level.props) this.add.image(Math.round(p.x), Math.round(p.y), p.key).setDepth(DEPTH_SCENERY + 0.5);
  }

  private syncVisuals(dt: number): void {
    const w = this.world;
    const fps = tuning.walk.animFps;
    // The walk cycle: step, stand, other step, stand.
    const cycle = [1, 0, 2, 0];
    for (const a of w.actors) {
      const s = this.sprites.get(a.id)!;
      s.setVisible(a.visible);
      s.setPosition(Math.round(a.x), Math.round(a.y));
      s.setDepth(DEPTH_ACTORS + a.y / 10000);
      const row = WALKER_ROWS.indexOf(a.facing);
      const col = a.moving ? cycle[Math.floor(a.walkTime * fps) % cycle.length] : 0;
      s.setFrame(row * WALKER_COLS + col);
    }
    this.updateCamera(dt);
    this.drawMarkers();
    this.drawHud();
  }

  private updateCamera(dt: number): void {
    const p = this.world.player;
    const tx = clamp(p.x - GAME_W / 2, 0, Math.max(0, this.world.width - GAME_W));
    const ty = clamp(p.y - GAME_H / 2, 0, Math.max(0, this.world.height - GAME_H));
    const k = 1 - Math.exp(-tuning.walk.cameraFollow * dt);
    this.camX += (tx - this.camX) * k;
    this.camY += (ty - this.camY) * k;
    this.cameras.main.setScroll(Math.round(this.camX), Math.round(this.camY));
  }

  /** Goal rings in the world, edge arrows for off-screen goals, the tap ring, and the nearby name. */
  private drawMarkers(): void {
    const g = this.markG;
    g.clear();
    const pulse = 0.5 + 0.5 * Math.sin(this.time.now / 200);
    if (this.tapMark.t > 0) {
      g.lineStyle(1, PAL.white, this.tapMark.t * 2);
      g.strokeCircle(this.tapMark.x, this.tapMark.y, 6 - this.tapMark.t * 6);
    }
    const hud = this.hudG;
    hud.clear();
    const cam = this.cameras.main;
    for (const m of this.level.markers) {
      const pos = m.actor ? this.world.actor(m.actor) : m;
      g.lineStyle(2, PAL.signal, 0.5 + 0.5 * pulse);
      g.strokeEllipse(pos.x, pos.y, 22 + pulse * 4, 10 + pulse * 2);
      // Off-screen: an arrow at the screen edge pointing to it.
      const sx = pos.x - cam.scrollX;
      const sy = pos.y - cam.scrollY;
      const top = 48;
      const bottom = GAME_H - 80;
      if (sx < 0 || sx > GAME_W || sy < top || sy > bottom) {
        const ax = clamp(sx, 14, GAME_W - 14);
        const ay = clamp(sy, top + 14, bottom - 14);
        const ang = Math.atan2(sy - ay, sx - ax);
        hud.fillStyle(PAL.signal, 1);
        hud.fillTriangle(
          ax + Math.cos(ang) * 10,
          ay + Math.sin(ang) * 10,
          ax + Math.cos(ang + 2.4) * 8,
          ay + Math.sin(ang + 2.4) * 8,
          ax + Math.cos(ang - 2.4) * 8,
          ay + Math.sin(ang - 2.4) * 8,
        );
      }
    }
    // Name over the person the TALK button would talk to.
    const near = this.phase === 'play' && !this.world.locked ? this.world.nearestTalkable() : null;
    this.nameText.setVisible(!!near);
    if (near) this.nameText.setText(near.name).setPosition(Math.round(near.x), Math.round(near.y - 26));
  }

  private drawHud(): void {
    const g = this.hudG;
    const lvl = this.level;
    const playing = this.phase === 'play';
    // Top panel: goals done and the current hint.
    g.fillStyle(PAL.panel, 0.9);
    g.fillRect(0, 0, GAME_W, 44);
    g.fillStyle(PAL.panelEdge, 1);
    g.fillRect(0, 44, GAME_W, 1);
    const done = lvl.objectives.filter((o) => o.state === 'done').length;
    const active = lvl.objectives.find((o) => o.state === 'active');
    this.goalText.setText(`${lvl.title.toUpperCase()}  ${done}/${lvl.objectives.length}`);
    this.hintText.setText(lvl.hint || active?.label || '');

    // Drag stick ring while dragging.
    const d = this.drag;
    if (playing && d?.dragging) {
      g.lineStyle(1, PAL.white, 0.5);
      g.strokeCircle(d.x0, d.y0, tuning.walk.stickMax);
      const ox = d.x - d.x0;
      const oy = d.y - d.y0;
      const len = Math.hypot(ox, oy);
      const k = len > tuning.walk.stickMax ? tuning.walk.stickMax / len : 1;
      g.fillStyle(PAL.white, 0.5);
      g.fillCircle(d.x0 + ox * k, d.y0 + oy * k, 8);
    }

    // Dialogue box.
    const line = lvl.dialogue[0];
    const boxH = 84;
    const by = GAME_H - boxH - 8;
    if (line && playing) {
      g.fillStyle(PAL.ink, 1);
      g.fillRect(10, by + 2, GAME_W - 16, boxH);
      g.fillStyle(PAL.panel, 1);
      g.fillRect(8, by, GAME_W - 16, boxH);
      g.lineStyle(1, PAL.signal, 1);
      g.strokeRect(8.5, by + 0.5, GAME_W - 17, boxH - 1);
      if (Math.floor(this.time.now / 400) % 2 === 0) {
        g.fillStyle(PAL.signal, 1);
        g.fillTriangle(GAME_W - 26, by + boxH - 16, GAME_W - 18, by + boxH - 12, GAME_W - 26, by + boxH - 8);
      }
      this.speakerText.setText(line.speaker.toUpperCase()).setPosition(18, by + 10);
      this.lineText.setText(line.text).setPosition(18, by + 28);
    }
    this.speakerText.setVisible(!!line && playing);
    this.lineText.setVisible(!!line && playing);

    this.talkBtn.setVisible(playing && !line && !this.world.locked && !!this.world.nearestTalkable());
    this.menuBtn.setVisible(this.phase !== 'done');
    this.buttons.draw(g);
  }

  // ---------------------------------------------------------------------------
  // Cards

  private showTitleCard(): void {
    const l = this.level;
    const cy = GAME_H / 2;
    const add = (t: Phaser.GameObjects.Text) => this.cardTexts.push(t.setScrollFactor(0).setDepth(DEPTH_HUD + 3));
    const bg = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0b0c0d, 0.7).setOrigin(0).setScrollFactor(0).setDepth(DEPTH_HUD + 2);
    this.cardBg = bg;
    add(txt(this, GAME_W / 2, cy - 60, l.date.toUpperCase(), 8, CSS.dim).setOrigin(0.5));
    add(txt(this, GAME_W / 2, cy - 38, l.title.toUpperCase(), 16, CSS.signal).setOrigin(0.5));
    add(txt(this, GAME_W / 2, cy - 14, l.place, 8, CSS.white).setOrigin(0.5));
    const goals = l.objectives.map((o) => `- ${o.label}`).join('\n');
    add(txt(this, 30, cy + 10, goals, 8, CSS.dim, GAME_W - 60));
    add(txt(this, GAME_W / 2, cy + 90, 'Tap to walk. Tap a person to talk.\nOr drag to walk.', 8, CSS.dim).setOrigin(0.5, 0).setAlign('center'));
    add(txt(this, GAME_W / 2, cy + 140, 'TAP TO BEGIN', 8, CSS.signal).setOrigin(0.5));
  }

  private cardBg: Phaser.GameObjects.Rectangle | null = null;

  private clearCard(): void {
    for (const t of this.cardTexts) t.destroy();
    this.cardTexts = [];
    this.cardBg?.destroy();
    this.cardBg = null;
  }

  private showDoneCard(): void {
    if (this.phase === 'done') return;
    this.phase = 'done';
    this.world.input = { dx: 0, dy: 0 };
    const l = this.level;
    const cy = GAME_H / 2;
    this.cardBg = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0b0c0d, 0.7).setOrigin(0).setScrollFactor(0).setDepth(DEPTH_HUD + 2);
    const add = (t: Phaser.GameObjects.Text) => this.cardTexts.push(t.setScrollFactor(0).setDepth(DEPTH_HUD + 3));
    add(txt(this, GAME_W / 2, cy - 70, 'DONE', 16, CSS.ok).setOrigin(0.5));
    add(txt(this, GAME_W / 2, cy - 40, l.doneText, 8, CSS.white, GAME_W - 60).setOrigin(0.5, 0).setAlign('center'));
    const next = l.next;
    const btns: Button[] = [];
    if (next.scene === 'Flight') {
      btns.push(new Button(this, 40, cy + 10, GAME_W - 80, 44, `FLY SORTIE ${next.sortie}`, () => this.scene.start('Flight', { sortie: next.sortie }), true));
    }
    btns.push(new Button(this, 40, cy + 66, GAME_W - 80, 36, 'MENU', () => this.scene.start('Menu')));
    for (const b of btns) {
      b.text.setScrollFactor(0);
      b.setDepth(DEPTH_HUD + 3);
      this.buttons.add(b);
    }
    // Card buttons draw above the card background.
    this.hudG.setDepth(DEPTH_HUD + 2.5);
  }
}

