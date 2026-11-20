// On-foot scene: draws a walk level and turns touch and keys into walking.
// The GameManager starts it with a StepHost whose params say which level.
// Tap the ground to walk there, tap a person to walk over and talk, or drag
// to walk like a stick. Desktop: arrows/WASD walk, Space/E talks or reads on.
// Stealth levels (Level 2) add guards' vision cones, a detection meter and a
// RETRY card when the player is caught. A level with a Tiled map (Masroor) is
// drawn as Phaser tile layers plus one image per house, tree or jet, y-sorted
// with the characters so they can walk behind things.
import Phaser from 'phaser';
import { t } from '../../../core/i18n';
import { CSS, GAME_H, GAME_W, PAL } from '../../../core/config';
import { tuning } from '../tuning';
import { WALKER_COLS, WALKER_ROWS } from '../art/pixelArt';
import { makeWalkLevel } from '../levels';
import type { Block, BlockStyle, LevelTilemap, MapSprite, WalkLevel, WallLine } from '../WalkLevel';
import { WalkWorld, type Point } from '../WalkWorld';
import type { Guard } from '../stealth';
import { Button, ButtonSet, txt } from '../../../core/ui/widgets';
import { clamp } from '../../../core/math';
import { makeCanvas } from '../../../core/gfx/pixel';
import type { StepHost } from '../../../core/contracts';
import type { WalkParams } from '..';

/** This mechanic's scene keys. */
export const WALK_SCENES = { walk: 'walk:Walk' } as const;

/** Fixed simulation step (60 Hz), as in FlightScene. */
const STEP = 1 / 60;

/**
 * Depths, bottom to top: tile layers (just under DEPTH_GROUND), ground boxes,
 * flat map pictures (pond, track, revetments), the shadows (so they fall
 * across the flat pictures, as on the old baked map), the wall and solid
 * boxes, then characters, vehicles and standing scenery y-sorted together
 * (DEPTH_ACTORS + bottom y / 10000: whoever stands lower on the map is in
 * front), then goal markers and torch cones over all of that so the stealth
 * game stays readable, then names and the HUD.
 */
const DEPTH_GROUND = 0;
const DEPTH_SHADOWS = 0.5;
const DEPTH_FLAT = DEPTH_SHADOWS - 0.25;
const DEPTH_SCENERY = 1;
const DEPTH_ACTORS = 3;
/** Added for a character standing up on something (the guard in the watchtower): above any y-sorted scenery. */
const DEPTH_ELEVATED = 0.5;
const DEPTH_MARKERS = 4;
const DEPTH_CONES = 4.5;
const DEPTH_LABELS = 5;
const DEPTH_HUD = 10;

/**
 * Night on a tiled map, as one tint. The old baked night map was the day map
 * darkened and pushed to blue. Fitted per channel as night = a * day, it gives
 * this colour (rms error 1.6, 0.8 and 8.2 of 255 for R, G, B), and Phaser's
 * plain MULTIPLY tint (its default) draws exactly colour * tint. It is linear,
 * so tinting each picture and shadow gives the same result as tinting the
 * finished map.
 * Why not a closer fit: `python scripts/art/art.py verify --night-tint` fits
 * night = a * day + b (rms 1.2, 0.6, 8.1), which needs the MULTIPLY_TWO tint
 * mode. Phaser's shader picks the mode with an exact == after the mode goes
 * through the GPU as a byte; drivers that convert that byte as c * (1/255)
 * (SwiftShader, for one) miss modes 3, 6 and 7, and night came out in day
 * colours. Mode 0 (MULTIPLY) always matches.
 */
const NIGHT_TINT = 0x616fa2; // a * 255 = 97, 111, 162

/** Ground shadows: the picture's silhouette, moved down-right and see-through (the old baked map's look). */
const SHADOW_DX = 6;
const SHADOW_DY = 5;
const SHADOW_ALPHA = 90 / 255;

/** A wall stamp every this many px along the wall. 1 matches the old baked wall pixel for pixel; 2 leaves notches. */
const WALL_STEP = 1;

/** A standing picture in front of the player turns this see-through, so he never vanishes behind a house. */
const SEE_THROUGH = 0.5;
/** Cell size (px) of the grid that finds the pictures near the player. */
const FADE_CELL = 128;

/** A standing (y-sorted) map picture and its bounds, for the see-through check. */
interface StandingPic {
  img: Phaser.GameObjects.Image;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  sortY: number;
}

/** Things that take a tint: images and tilemap layers. */
interface Tintable {
  setTint(color: number): unknown;
}

const cellKey = (cx: number, cy: number): number => cy * 1024 + cx;

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
  /** How this level reports back to the GameManager. */
  private host!: StepHost<WalkParams>;
  private acc = 0;
  /** 'title' card, 'play', or the 'done' card. */
  private phase: 'title' | 'play' | 'done' = 'title';
  private sprites = new Map<string, Phaser.GameObjects.Sprite>();
  private vehicleSprites: Phaser.GameObjects.Image[] = [];
  /** Standing map pictures by FADE_CELL grid cell (see cellKey). */
  private standing = new Map<number, StandingPic[]>();
  /** The pictures made see-through last frame. */
  private faded = new Set<Phaser.GameObjects.Image>();
  private coneG!: Phaser.GameObjects.Graphics;
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
    super(WALK_SCENES.walk);
  }

  init(data: { host: StepHost<WalkParams> }): void {
    this.host = data.host;
    this.acc = 0;
    this.phase = 'title';
    this.sprites = new Map();
    this.vehicleSprites = [];
    this.standing = new Map();
    this.faded = new Set();
    this.cardTexts = [];
    this.drag = null;
    this.tapMark = { x: 0, y: 0, t: 0 };
  }

  create(): void {
    this.level = makeWalkLevel(this.host.params.map);
    this.world = new WalkWorld(this.level.map());
    this.level.setup(this.world);
    this.world.locked = true;

    this.buildScenery();
    this.markG = this.add.graphics().setDepth(DEPTH_MARKERS);
    this.coneG = this.add.graphics().setDepth(DEPTH_CONES);
    for (const a of this.world.actors) {
      this.sprites.set(a.id, this.add.sprite(0, 0, a.look, 0).setOrigin(0.5, 0.92));
    }
    this.vehicleSprites = this.level.vehicles.map((v) => this.add.image(0, 0, v.key));
    this.nameText = txt(this, 0, 0, '', 8, CSS.signal).setOrigin(0.5, 1).setDepth(DEPTH_LABELS);

    // HUD, pinned to the screen.
    this.hudG = this.add.graphics().setScrollFactor(0).setDepth(DEPTH_HUD);
    this.goalText = txt(this, 8, 8, '', 8, CSS.dim).setScrollFactor(0).setDepth(DEPTH_HUD + 1);
    this.hintText = txt(this, 8, 24, '', 8, CSS.white, GAME_W - 80).setScrollFactor(0).setDepth(DEPTH_HUD + 1);
    this.speakerText = txt(this, 18, 0, '', 8, CSS.signal).setScrollFactor(0).setDepth(DEPTH_HUD + 1);
    this.lineText = txt(this, 18, 0, '', 8, CSS.white, GAME_W - 36).setScrollFactor(0).setDepth(DEPTH_HUD + 1);

    this.buttons = new ButtonSet();
    this.menuBtn = this.buttons.add(new Button(this, GAME_W - 62, 6, 56, 32, t('ui.menu'), () => this.host.quit()));
    this.talkBtn = this.buttons.add(new Button(this, GAME_W - 96, GAME_H - 64, 88, 48, t('walk.talk'), () => this.world.interact(), true));
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
      else if (this.level.status === 'failed') this.showFailCard();
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
      kb.on('keydown-ESC', () => this.host.quit());
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
    else if (!this.world.locked && this.level.action(this.world)) return;
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
    const tm = this.level.tilemap;
    if (tm) this.buildTilemap(tm);
    const g = this.add.graphics().setDepth(DEPTH_GROUND);
    if (!tm) {
      g.fillStyle(this.level.groundColor, 1);
      g.fillRect(0, 0, w.width, w.height);
    }
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
    for (const s of this.level.sprites) this.addMapSprite(s);
    this.level.wallLines.forEach((line, i) => this.addWall(line, i));
  }

  /** The Tiled ground: one Phaser tilemap layer per tile layer, under everything else. */
  private buildTilemap(tm: LevelTilemap): void {
    if (!this.cache.tilemap.exists(tm.cacheKey)) {
      this.cache.tilemap.add(tm.cacheKey, { format: Phaser.Tilemaps.Formats.TILED_JSON, data: tm.json });
    }
    // insertNull: an empty cell (most of 'paint') stays null instead of becoming
    // a Tile object on every visit. Phaser's culling and setTint skip nulls.
    const map = this.make.tilemap({ key: tm.cacheKey, insertNull: true });
    // Only the atlas tilesets: the objects' image collection is drawn as single images (addMapSprite).
    const sets = tm.tilesets.flatMap((name) => map.addTilesetImage(name, name) ?? []);
    tm.layers.forEach((name, i) => {
      const layer = map.createLayer(name, sets, 0, 0, false) as Phaser.Tilemaps.TilemapLayer | null;
      if (!layer) throw new Error(`Tile layer "${name}" could not be made from ${tm.cacheKey}`);
      layer.setDepth(DEPTH_GROUND - 0.5 + i * 0.1);
      if (this.level.night) this.nightTint(layer);
    });
  }

  /**
   * A map picture, standing on its bottom edge, and its shadow. Flat things lie
   * under every character and every shadow; the rest are y-sorted with the
   * characters, by their bottom edge.
   */
  private addMapSprite(s: MapSprite): void {
    const night = this.level.night;
    if (s.shadow) {
      const sh = this.add.image(s.x + SHADOW_DX, s.y + SHADOW_DY, `${s.key}_sh`).setOrigin(0, 1).setFlipX(s.flipX);
      sh.setAlpha(SHADOW_ALPHA).setDepth(DEPTH_SHADOWS);
      if (night) this.nightTint(sh);
    }
    const img = this.add.image(s.x, s.y, s.key).setOrigin(0, 1).setFlipX(s.flipX);
    img.setDepth(s.flat ? DEPTH_FLAT : DEPTH_ACTORS + s.sortY / 10000);
    if (night) this.nightTint(img);
    if (s.flat) return;
    // File it in every grid cell it covers, for the see-through check.
    const pic: StandingPic = { img, x0: s.x, y0: s.y - s.h, x1: s.x + s.w, y1: s.y, sortY: s.sortY };
    for (let cy = Math.max(0, Math.floor(pic.y0 / FADE_CELL)); cy <= Math.floor(pic.y1 / FADE_CELL); cy++) {
      for (let cx = Math.max(0, Math.floor(pic.x0 / FADE_CELL)); cx <= Math.floor(pic.x1 / FADE_CELL); cx++) {
        const k = cellKey(cx, cy);
        const list = this.standing.get(k);
        if (list) list.push(pic);
        else this.standing.set(k, [pic]);
      }
    }
  }

  /**
   * A wall: its stamp every WALL_STEP px along each segment, drawn once into a
   * canvas and shown as one picture, so it costs nothing per frame. Each stamp
   * is centred on the line and reaches 2 px below it, like the old baked wall.
   * Lower stamps go first, so the dark top edge of one never lands on the face
   * of the stamp above it. A canvas texture, not a render texture: Phaser
   * uploads a canvas again after the WebGL context is lost (a phone suspending
   * the tab, say), where a render texture comes back blank. The texture is
   * kept, so a retry reuses it.
   */
  private addWall(line: WallLine, index: number): void {
    const frame = this.textures.getFrame(line.key);
    const sw = frame.width;
    const sh = frame.height;
    const spots: Point[] = [];
    for (let k = 1; k < line.points.length; k++) {
      const a = line.points[k - 1];
      const b = line.points[k];
      const n = Math.trunc(Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)));
      for (let i = 0; n > 0; i = Math.min(i + WALL_STEP, n)) {
        // Top-left corner of the stamp at this point of the line.
        spots.push({ x: Math.trunc(a.x + ((b.x - a.x) * i) / n) - Math.floor(sw / 2), y: Math.trunc(a.y + ((b.y - a.y) * i) / n) - (sh - 2) });
        if (i === n) break;
      }
    }
    if (spots.length === 0) return;
    const x0 = Math.min(...spots.map((p) => p.x));
    const y0 = Math.min(...spots.map((p) => p.y));
    const x1 = Math.max(...spots.map((p) => p.x)) + sw;
    const y1 = Math.max(...spots.map((p) => p.y)) + sh;
    // A walk_ key, like every texture this mechanic makes.
    const key = `walk_wall_layer_${this.level.id}_${index}`;
    if (!this.textures.exists(key)) {
      const [canvas, ctx] = makeCanvas(x1 - x0, y1 - y0);
      const src = frame.source.image as CanvasImageSource;
      spots.sort((p, q) => q.y - p.y);
      for (const p of spots) ctx.drawImage(src, frame.cutX, frame.cutY, sw, sh, p.x - x0, p.y - y0, sw, sh);
      this.textures.addCanvas(key, canvas);
    }
    const img = this.add.image(x0, y0, key).setOrigin(0).setDepth(DEPTH_SCENERY);
    if (this.level.night) this.nightTint(img);
  }

  /** Night colours for a picture or tile layer (see NIGHT_TINT): MULTIPLY, the default tint mode. */
  private nightTint(o: Tintable): void {
    o.setTint(NIGHT_TINT);
  }

  /** Standing pictures that cover the player and stand in front of him go see-through. */
  private seeThrough(): void {
    const p = this.world.player;
    const s = this.sprites.get(p.id);
    const now = new Set<Phaser.GameObjects.Image>();
    if (s && p.visible && this.standing.size > 0) {
      const x0 = s.x - s.displayWidth * s.originX;
      const y0 = s.y - s.displayHeight * s.originY;
      const x1 = x0 + s.displayWidth;
      const y1 = y0 + s.displayHeight;
      for (let cy = Math.max(0, Math.floor(y0 / FADE_CELL)); cy <= Math.floor(y1 / FADE_CELL); cy++) {
        for (let cx = Math.max(0, Math.floor(x0 / FADE_CELL)); cx <= Math.floor(x1 / FADE_CELL); cx++) {
          for (const pic of this.standing.get(cellKey(cx, cy)) ?? []) {
            if (pic.sortY > p.y && pic.x0 < x1 && pic.x1 > x0 && pic.y0 < y1 && pic.y1 > y0) now.add(pic.img);
          }
        }
      }
    }
    for (const img of this.faded) if (!now.has(img)) img.setAlpha(1);
    for (const img of now) img.setAlpha(SEE_THROUGH);
    this.faded = now;
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
      s.setDepth(DEPTH_ACTORS + a.y / 10000 + (a.elevated ? DEPTH_ELEVATED : 0));
      const row = WALKER_ROWS.indexOf(a.facing);
      const col = a.moving ? cycle[Math.floor(a.walkTime * fps) % cycle.length] : 0;
      s.setFrame(row * WALKER_COLS + col);
    }
    this.seeThrough();
    this.level.vehicles.forEach((v, i) => {
      const img = this.vehicleSprites[i];
      // Drawn nose up, so a heading of -PI/2 (north) is no turn.
      const r = v.heading + Math.PI / 2;
      // Sorted by the bottom of the turned picture, as map pictures sort by
      // their bottom edge: half the height of its turned bounding box below the centre.
      const half = 0.5 * (Math.abs(Math.sin(r)) * img.width + Math.abs(Math.cos(r)) * img.height);
      img
        .setPosition(Math.round(v.x), Math.round(v.y))
        .setRotation(r)
        .setDepth(DEPTH_ACTORS + (v.y + half) / 10000);
    });
    this.drawCones();
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
    for (const r of this.level.rings) {
      g.lineStyle(2, 0xe83a2a, 0.9);
      g.strokeCircle(r.x, r.y, r.r);
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

  /** Torch cones, cut short by walls, and a small light around the player at night. */
  private drawCones(): void {
    const g = this.coneG;
    g.clear();
    const lvl = this.level;
    if (lvl.night) {
      const p = this.world.player;
      g.fillStyle(0xfff2c0, 0.1);
      g.fillCircle(p.x, p.y - 10, 22);
    }
    const st = lvl.stealth;
    if (!st) return;
    const RAYS = 24;
    for (const gd of st.guards) {
      const a = this.world.actor(gd.id);
      const color = gd.state === 'caught' ? 0xff4030 : gd.state === 'suspicious' ? 0xffb030 : lvl.night ? 0xffe9a0 : 0xffffff;
      const pts = [new Phaser.Math.Vector2(a.x, a.y)];
      for (let i = 0; i <= RAYS; i++) {
        const ang = gd.look - gd.angle / 2 + (gd.angle * i) / RAYS;
        const r = this.rayLength(gd, a, ang);
        pts.push(new Phaser.Math.Vector2(a.x + Math.cos(ang) * r, a.y + Math.sin(ang) * r));
      }
      g.fillStyle(color, gd.seen ? 0.38 : lvl.night ? 0.26 : 0.2);
      g.fillPoints(pts, true);
    }
  }

  /** How far a ray from a guard goes before a wall stops it (binary search on the nav grid). */
  private rayLength(gd: Guard, from: { x: number; y: number }, ang: number): number {
    const nav = this.world.nav;
    const end = (r: number) => ({ x: from.x + Math.cos(ang) * r, y: from.y + Math.sin(ang) * r });
    if (nav.clearLine(from, end(gd.range))) return gd.range;
    let lo = 0;
    let hi = gd.range;
    for (let k = 0; k < 6; k++) {
      const mid = (lo + hi) / 2;
      if (nav.clearLine(from, end(mid))) lo = mid;
      else hi = mid;
    }
    return lo;
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
    this.goalText.setText(t('walk.progress', { title: lvl.title, done, total: lvl.objectives.length }));
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
      this.speakerText.setText(line.speaker ?? '').setPosition(18, by + 10);
      this.lineText.setText(line.text).setPosition(18, by + 28);
    }
    this.speakerText.setVisible(!!line && playing);
    this.lineText.setVisible(!!line && playing);

    // Detection meter: the most alarmed guard.
    const st = lvl.stealth;
    if (st && playing) {
      const alarm = st.alarm;
      g.fillStyle(PAL.ink, 0.8);
      g.fillRect(GAME_W - 112, 30, 104, 8);
      g.fillStyle(alarm >= 0.4 ? 0xffb030 : 0xffe9a0, 1);
      g.fillRect(GAME_W - 110, 32, Math.round(100 * alarm), 4);
    }
    const free = playing && !line && !this.world.locked;
    const actLabel = free ? lvl.actionLabel(this.world) : null;
    this.talkBtn.setLabel(actLabel ?? t('walk.talk'));
    this.talkBtn.setVisible(free && (!!actLabel || !!this.world.nearestTalkable()));
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
    add(txt(this, GAME_W / 2, cy - 60, l.date, 8, CSS.dim).setOrigin(0.5));
    add(txt(this, GAME_W / 2, cy - 38, l.title, 16, CSS.signal).setOrigin(0.5));
    add(txt(this, GAME_W / 2, cy - 14, l.place, 8, CSS.white).setOrigin(0.5));
    const goals = l.objectives.map((o) => t('walk.goal', { label: o.label })).join('\n');
    add(txt(this, 30, cy + 10, goals, 8, CSS.dim, GAME_W - 60));
    const how = l.stealth
      ? t('walk.howStealth')
      : t('walk.howTalk');
    add(txt(this, GAME_W / 2, cy + 90, how, 8, CSS.dim).setOrigin(0.5, 0).setAlign('center'));
    add(txt(this, GAME_W / 2, cy + 140, t('ui.tapToBegin'), 8, CSS.signal).setOrigin(0.5));
  }

  private cardBg: Phaser.GameObjects.Rectangle | null = null;

  private clearCard(): void {
    for (const t of this.cardTexts) t.destroy();
    this.cardTexts = [];
    this.cardBg?.destroy();
    this.cardBg = null;
  }

  /** Caught or too late: report the failure and offer RETRY. */
  private showFailCard(): void {
    if (this.phase === 'done') return;
    this.phase = 'done';
    this.world.input = { dx: 0, dy: 0 };
    const cy = GAME_H / 2;
    this.cardBg = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0b0c0d, 0.7).setOrigin(0).setScrollFactor(0).setDepth(DEPTH_HUD + 2);
    const add = (t: Phaser.GameObjects.Text) => this.cardTexts.push(t.setScrollFactor(0).setDepth(DEPTH_HUD + 3));
    add(txt(this, GAME_W / 2, cy - 70, t('walk.caught'), 16, CSS.warn).setOrigin(0.5));
    add(txt(this, GAME_W / 2, cy - 40, this.level.failText, 8, CSS.white, GAME_W - 60).setOrigin(0.5, 0).setAlign('center'));
    this.host.report({ result: 'failed' });
    const btns = [
      new Button(this, 40, cy + 10, GAME_W - 80, 44, t('ui.retry'), () => this.host.retry(), true),
      new Button(this, 40, cy + 66, GAME_W - 80, 36, t('ui.menu'), () => this.host.quit()),
    ];
    for (const b of btns) {
      b.text.setScrollFactor(0);
      b.setDepth(DEPTH_HUD + 3);
      this.buttons.add(b);
    }
    this.hudG.setDepth(DEPTH_HUD + 2.5);
    // Space / Enter retries too.
    this.input.keyboard?.once('keydown-ENTER', () => this.host.retry());
  }

  private showDoneCard(): void {
    if (this.phase === 'done') return;
    this.phase = 'done';
    this.world.input = { dx: 0, dy: 0 };
    const l = this.level;
    const cy = GAME_H / 2;
    this.cardBg = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0b0c0d, 0.7).setOrigin(0).setScrollFactor(0).setDepth(DEPTH_HUD + 2);
    const add = (t: Phaser.GameObjects.Text) => this.cardTexts.push(t.setScrollFactor(0).setDepth(DEPTH_HUD + 3));
    add(txt(this, GAME_W / 2, cy - 70, t('ui.done'), 16, CSS.ok).setOrigin(0.5));
    add(txt(this, GAME_W / 2, cy - 40, l.doneText, 8, CSS.white, GAME_W - 60).setOrigin(0.5, 0).setAlign('center'));
    // Saved as complete; the next button carries on through the episode.
    this.host.report({ result: 'complete' });
    const next = this.host.upNext;
    const btns: Button[] = [new Button(this, 40, cy + 10, GAME_W - 80, 44, next?.label ?? t('ui.done'), () => this.host.advance(), true)];
    if (next) btns.push(new Button(this, 40, cy + 66, GAME_W - 80, 36, t('ui.menu'), () => this.host.quit()));
    this.host.ads.resultsBanner(true);
    for (const b of btns) {
      b.text.setScrollFactor(0);
      b.setDepth(DEPTH_HUD + 3);
      this.buttons.add(b);
    }
    // Card buttons draw above the card background.
    this.hudG.setDepth(DEPTH_HUD + 2.5);
  }
}

