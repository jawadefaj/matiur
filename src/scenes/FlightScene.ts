// Episode 2 flight scene: runs the simulation at a fixed step and renders it.
// The HUD and touch controls live in UIScene, which runs on top.
import Phaser from 'phaser';
import { tuning } from '../data/tuning';
import { DEPTH, GAME_H, GAME_W, HUD, PAL } from '../config';
import { World } from '../sim/World';
import type { Aircraft } from '../sim/types';
import { makeSortie, type SortieNum } from '../sortie';
import type { Airfield, Sortie, TerrainSpec } from '../sortie/Sortie';
import { HILL_KEYS } from '../gfx/textures';
import { clamp, frameForHeading, lerp } from '../systems/math';
import { loadSave, vibrate } from '../save';

const STEP = 1 / 60;

interface AircraftView {
  body: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Sprite;
  smokeAcc: number;
}

interface Puff {
  img: Phaser.GameObjects.Image;
  life: number;
  max: number;
  vx: number;
  vy: number;
  alpha: number;
}

interface CloudView {
  img: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  x: number;
  y: number;
}

export class FlightScene extends Phaser.Scene {
  world!: World;
  sortie!: Sortie;
  sortieNum: SortieNum = 1;
  /** Set by the UI (pause menu, title card). */
  paused = false;
  /** 0..1 flashes read by the UI. */
  hitFlash = 0;
  crashFlash = 0;

  private acc = 0;
  private views = new Map<number, AircraftView>();
  private ground!: Phaser.GameObjects.TileSprite;
  private bulletG!: Phaser.GameObjects.Graphics;
  private markG!: Phaser.GameObjects.Graphics;
  private ghost!: Phaser.GameObjects.Sprite;
  private puffs: Puff[] = [];
  private puffPool: Phaser.GameObjects.Image[] = [];
  private clouds: CloudView[] = [];
  private baseFires: { x: number; y: number }[] = [];
  private fireAcc = 0;
  private camX = 0;
  private camY = 0;
  private lookX = 0;
  private lookY = 0;

  constructor() {
    super('Flight');
  }

  init(data: { sortie?: SortieNum }): void {
    this.sortieNum = data.sortie ?? 1;
    this.paused = true; // until the title card is dismissed
    this.acc = 0;
    this.hitFlash = 0;
    this.crashFlash = 0;
    this.views = new Map();
    this.puffs = [];
    this.puffPool = [];
    this.clouds = [];
    this.baseFires = [];
  }

  create(): void {
    this.world = new World(1000 + this.sortieNum);
    this.world.gunsMode = loadSave().settings.gunsMode;
    this.sortie = makeSortie(this.sortieNum);
    this.sortie.setup(this.world);

    this.buildTerrain(this.sortie.terrain);
    this.markG = this.add.graphics().setDepth(DEPTH.markers);
    this.ghost = this.add.sprite(0, 0, 'sabre', 0).setAlpha(0.35).setDepth(DEPTH.markers).setVisible(false);
    this.bulletG = this.add.graphics().setDepth(DEPTH.bullets);

    const p = this.world.player.f;
    this.lookX = Math.sin(p.heading) * tuning.camera.lookAhead;
    this.lookY = -Math.cos(p.heading) * tuning.camera.lookAhead;
    this.camX = p.x + this.lookX - GAME_W / 2;
    this.camY = p.y + this.lookY - this.viewCentreY();
    this.cameras.main.setScroll(Math.round(this.camX), Math.round(this.camY));
    this.syncVisuals(0);

    this.scene.launch('UI', { flight: this });
    if (import.meta.env.DEV) (window as unknown as { __wof: unknown }).__wof = { scene: this };
  }

  restartSortie(n: SortieNum = this.sortieNum): void {
    this.scene.stop('UI');
    this.scene.start('Flight', { sortie: n });
  }

  toMenu(): void {
    this.scene.stop('UI');
    this.scene.start('Menu');
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.1);
    const s = this.sortie;
    if (!this.paused && s.status === 'running') {
      if (s.freezeWorld) {
        s.update(this.world, dt);
      } else {
        this.acc += dt;
        let n = 0;
        while (this.acc >= STEP && n < 5) {
          this.world.step(STEP);
          s.update(this.world, STEP);
          this.handleEvents();
          this.acc -= STEP;
          n++;
          if (s.freezeWorld || s.status !== 'running') break;
        }
        if (n >= 5) this.acc = 0;
      }
    }
    this.hitFlash = Math.max(0, this.hitFlash - dt * 3);
    this.crashFlash = Math.max(0, this.crashFlash - dt * 0.8);
    this.syncVisuals(this.paused ? 0 : dt);
  }

  /** Vertical centre of the visible playfield (between HUD panels). */
  private viewCentreY(): number {
    return (HUD.playTop + HUD.playBottom) / 2;
  }

  // -------------------------------------------------------------------------
  // Events → effects

  private handleEvents(): void {
    for (const e of this.world.drainEvents()) {
      switch (e.type) {
        case 'hit':
        case 'friendlyHit':
          this.spawnPuff('spark', e.x, e.y, 0.15, 0, 0, 1);
          break;
        case 'playerHit':
          this.spawnPuff('spark', e.x, e.y, 0.15, 0, 0, 1);
          this.hitFlash = 1;
          vibrate(25);
          break;
        case 'pipLost':
          vibrate(90);
          break;
        case 'baseHit':
          if (this.baseFires.length < 6) {
            for (let i = 0; i < 3; i++) {
              this.baseFires.push({ x: e.x + (Math.random() - 0.5) * 120, y: e.y + (Math.random() - 0.5) * 300 });
            }
          }
          break;
        case 'crash':
          this.crashFlash = 1;
          vibrate(160);
          break;
        default:
          break;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Terrain

  private buildTerrain(t: TerrainSpec): void {
    this.ground = this.add
      .tileSprite(0, 0, GAME_W, GAME_H, `ground_${t.ground}`)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(DEPTH.ground);

    const fg = this.add.graphics().setDepth(DEPTH.features);
    for (const r of t.rivers) {
      fg.lineStyle(r.width + 4, 0x6b7a4a, 1);
      polyline(fg, r.points);
      fg.lineStyle(r.width, 0x3f6e8c, 1);
      polyline(fg, r.points);
      fg.lineStyle(Math.max(1, r.width - 8), 0x5a8fb0, 1);
      polyline(fg, r.points);
    }
    for (const r of t.roads) {
      fg.lineStyle(r.width, 0xb9a77f, 1);
      polyline(fg, r.points);
    }
    for (const v of t.villages) this.drawVillage(fg, v.x, v.y);
    for (const a of t.airfields) this.drawAirfield(fg, a);

    // Low-level obstacles.
    const og = this.add.graphics().setDepth(DEPTH.obstacles);
    for (const o of t.obstacles) {
      switch (o.kind) {
        case 'hill': {
          const key = HILL_KEYS[o.r] ?? 'hill32';
          this.add.image(Math.round(o.x1), Math.round(o.y1), key).setDepth(DEPTH.obstacles);
          break;
        }
        case 'tree':
          this.add.image(Math.round(o.x1), Math.round(o.y1), 'tree').setDepth(DEPTH.obstacles);
          break;
        case 'hut':
          this.add.image(Math.round(o.x1), Math.round(o.y1), 'hut').setDepth(DEPTH.obstacles);
          break;
        case 'pylon':
          this.add.image(Math.round(o.x1), Math.round(o.y1), 'pylon').setDepth(DEPTH.obstacles + 0.2);
          break;
        case 'wire':
          og.lineStyle(1, 0x000000, 0.25);
          og.lineBetween(o.x1 + 3, o.y1 + 5, o.x2 + 3, o.y2 + 5);
          og.lineStyle(1, 0x2a2a2a, 1);
          og.lineBetween(o.x1, o.y1, o.x2, o.y2);
          break;
        case 'ridge': {
          og.lineStyle(o.r * 2 + 2, 0x4a3a28, 1);
          og.lineBetween(o.x1, o.y1, o.x2, o.y2);
          og.fillStyle(0x4a3a28, 1);
          og.fillCircle(o.x1, o.y1, o.r + 1);
          og.fillCircle(o.x2, o.y2, o.r + 1);
          og.lineStyle(o.r * 2, 0x8a7350, 1);
          og.lineBetween(o.x1, o.y1, o.x2, o.y2);
          og.fillStyle(0x8a7350, 1);
          og.fillCircle(o.x1, o.y1, o.r);
          og.fillCircle(o.x2, o.y2, o.r);
          og.lineStyle(Math.max(1, o.r - 3), 0xa48b62, 1);
          og.lineBetween(o.x1 - 1, o.y1 - 2, o.x2 - 1, o.y2 - 2);
          break;
        }
      }
    }

    // Clouds: below the jets at altitude; only their shadows at low level.
    for (const c of t.clouds) {
      const shadow = this.add.image(c.x, c.y, `cloudsh${c.variant}`).setAlpha(0.16).setDepth(DEPTH.shadows);
      const img = this.add.image(c.x, c.y, `cloud${c.variant}`).setAlpha(0.88).setDepth(DEPTH.markers - 0.5);
      if (this.sortie.lowLevel) img.setVisible(false);
      this.clouds.push({ img, shadow, x: c.x, y: c.y });
    }
  }

  private drawVillage(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(0x9c8a64, 1);
    g.fillRect(x - 22, y - 16, 44, 32);
    for (let i = 0; i < 7; i++) {
      const hx = Math.round(x - 18 + ((i * 13) % 36));
      const hy = Math.round(y - 12 + ((i * 7) % 24));
      g.fillStyle(0x2b2118, 1);
      g.fillRect(hx - 1, hy - 1, 8, 7);
      g.fillStyle(i % 2 ? 0xa46d45 : 0x8a5a3a, 1);
      g.fillRect(hx, hy, 6, 5);
    }
  }

  private drawAirfield(g: Phaser.GameObjects.Graphics, a: Airfield): void {
    const top = a.y - a.length / 2;
    const left = a.x - a.width / 2;
    // Cleared ground.
    g.fillStyle(0x9a9a6a, 1);
    g.fillRect(left - 40, top - 40, a.width + 230, a.length + 80);
    // Runway.
    g.fillStyle(0x45484a, 1);
    g.fillRect(left - 1, top - 1, a.width + 2, a.length + 2);
    g.fillStyle(0x5d6062, 1);
    g.fillRect(left, top, a.width, a.length);
    g.fillStyle(0xd8d8d0, 1);
    for (let y = top + 24; y < top + a.length - 24; y += 18) g.fillRect(a.x - 1, y, 2, 9);
    for (const ty of [top + 4, top + a.length - 10]) {
      for (let x = left + 3; x < left + a.width - 3; x += 4) g.fillRect(x, ty, 2, 6);
    }
    // Taxiway, apron, hangars, tower.
    const tx = a.x + a.width / 2 + 26;
    g.fillStyle(0x6b6e70, 1);
    g.fillRect(tx, top + 20, 8, a.length - 40);
    g.fillRect(a.x + a.width / 2, top + 20, 26, 8);
    g.fillRect(a.x + a.width / 2, top + a.length - 28, 26, 8);
    g.fillRect(tx + 8, a.y - 70, 80, 140);
    for (let i = 0; i < 3; i++) {
      const hy = a.y - 66 + i * 46;
      g.fillStyle(0x2c2f33, 1);
      g.fillRect(tx + 95, hy - 1, 34, 30);
      g.fillStyle(0x7d8287, 1);
      g.fillRect(tx + 96, hy, 32, 28);
      g.fillStyle(0x666b70, 1);
      for (let k = 2; k < 28; k += 4) g.fillRect(tx + 96, hy + k, 32, 1);
    }
    g.fillStyle(0x2c2f33, 1);
    g.fillRect(tx + 140, a.y + 80, 10, 10);
    g.fillStyle(0xc9b48a, 1);
    g.fillRect(tx + 141, a.y + 81, 8, 8);
    // Parked Sabres facing the taxiway.
    for (let i = 0; i < 4; i++) {
      this.add
        .sprite(Math.round(tx + 40 + (i % 2) * 34), Math.round(a.y - 46 + Math.floor(i / 2) * 50 + (i % 2) * 18), 'sabre', 12)
        .setDepth(DEPTH.features + 0.5);
    }
  }

  // -------------------------------------------------------------------------
  // Per-frame visuals

  private viewFor(a: Aircraft): AircraftView {
    let v = this.views.get(a.id);
    if (!v) {
      const shadow = this.add.sprite(0, 0, `${a.kind}_sh`, 0).setAlpha(0.28).setDepth(DEPTH.shadows);
      const body = this.add.sprite(0, 0, a.kind, 0).setDepth(a.role === 'player' ? DEPTH.player : DEPTH.aircraft);
      v = { body, shadow, smokeAcc: 0 };
      this.views.set(a.id, v);
    }
    return v;
  }

  private syncVisuals(dt: number): void {
    const w = this.world;
    const p = w.player;

    for (const a of w.aircraft) {
      const v = this.viewFor(a);
      const visible = a.status === 'active' || a.status === 'brokenOff' || (a.role === 'player');
      v.body.setVisible(visible);
      v.shadow.setVisible(visible);
      if (!visible) continue;
      const frame = frameForHeading(a.f.heading);
      v.body.setFrame(frame).setPosition(Math.round(a.f.x), Math.round(a.f.y));
      const alt = a.f.altitude;
      if (alt < 450) {
        const off = Math.round(clamp(alt * 0.12, 0, 40));
        v.shadow.setFrame(frame).setPosition(Math.round(a.f.x) + off, Math.round(a.f.y) + off);
        v.shadow.setAlpha(0.3 * (1 - alt / 450));
      } else {
        v.shadow.setVisible(false);
      }
      // Smoke trail.
      if (dt > 0 && a.smoke > 0) {
        v.smokeAcc += dt * (a.status === 'brokenOff' ? 34 : 22 * a.smoke);
        const tx = a.f.x - Math.sin(a.f.heading) * 9;
        const ty = a.f.y + Math.cos(a.f.heading) * 9;
        while (v.smokeAcc >= 1) {
          v.smokeAcc -= 1;
          const key = a.status === 'brokenOff' || a.smoke > 0.6 ? 'puff_dark' : 'puff_light';
          this.spawnPuff(key, tx + (Math.random() - 0.5) * 3, ty + (Math.random() - 0.5) * 3, 1.3, 0, 0, 0.6);
        }
      }
    }
    // Fuel vapour from a leaking player jet.
    if (dt > 0 && w.damage.lost > 0 && w.fuel.pct > 0 && p.f.airborne && Math.random() < dt * 14) {
      this.spawnPuff('puff_fuel', p.f.x - Math.sin(p.f.heading) * 6, p.f.y + Math.cos(p.f.heading) * 6, 0.7, 0, 0, 0.5);
    }
    // Smoke rising from the base after a bomb run.
    if (dt > 0 && this.baseFires.length > 0) {
      this.fireAcc += dt * 10;
      while (this.fireAcc >= 1) {
        this.fireAcc -= 1;
        const f = this.baseFires[Math.floor(Math.random() * this.baseFires.length)];
        this.spawnPuff('dust', f.x, f.y, 2.2, 6, -10, 0.5);
      }
    }
    this.stepPuffs(dt);
    this.drawBullets();
    this.drawMarkers();
    this.updateCamera(dt);
    this.updateClouds();
  }

  private spawnPuff(key: string, x: number, y: number, life: number, vx: number, vy: number, alpha: number): void {
    if (this.puffs.length > 260) return;
    const img = this.puffPool.pop() ?? this.add.image(0, 0, key);
    img.setTexture(key).setPosition(Math.round(x), Math.round(y)).setAlpha(alpha).setVisible(true).setDepth(DEPTH.smoke);
    this.puffs.push({ img, life, max: life, vx, vy, alpha });
  }

  private stepPuffs(dt: number): void {
    if (dt <= 0) return;
    const keep: Puff[] = [];
    for (const pf of this.puffs) {
      pf.life -= dt;
      if (pf.life <= 0) {
        pf.img.setVisible(false);
        this.puffPool.push(pf.img);
        continue;
      }
      if (pf.vx || pf.vy) pf.img.setPosition(Math.round(pf.img.x + pf.vx * dt), Math.round(pf.img.y + pf.vy * dt));
      pf.img.setAlpha(pf.alpha * (pf.life / pf.max));
      keep.push(pf);
    }
    this.puffs = keep;
  }

  private drawBullets(): void {
    const g = this.bulletG;
    g.clear();
    for (const b of this.world.bullets) {
      const col = b.side === 'enemy' ? 0xffa060 : 0xffe27a;
      g.lineStyle(1, col, 1);
      g.lineBetween(Math.round(b.x - b.vx * 0.012), Math.round(b.y - b.vy * 0.012), Math.round(b.x), Math.round(b.y));
    }
  }

  private drawMarkers(): void {
    const g = this.markG;
    g.clear();
    this.ghost.setVisible(false);
    const t = this.time.now / 1000;
    for (const m of this.sortie.markers) {
      switch (m.kind) {
        case 'waypoint':
          g.lineStyle(1, PAL.signal, 0.9);
          g.strokeCircle(m.x, m.y, m.r);
          g.lineStyle(1, PAL.signal, 0.4);
          g.strokeCircle(m.x, m.y, m.r * (0.55 + 0.1 * Math.sin(t * 3)));
          break;
        case 'base':
          g.lineStyle(1, PAL.ok, 0.8);
          g.strokeCircle(m.x, m.y, m.r);
          break;
        case 'slot':
          this.ghost
            .setVisible(true)
            .setFrame(frameForHeading(m.heading ?? 0))
            .setPosition(Math.round(m.x), Math.round(m.y))
            .setAlpha(0.3 + 0.15 * Math.sin(t * 5));
          g.lineStyle(1, PAL.signal, 0.8);
          g.strokeCircle(m.x, m.y, m.r);
          break;
        case 'runway':
          for (let i = 0; i < 4; i++) {
            const y = m.y + 30 + i * 22 - ((t * 30) % 22);
            g.lineStyle(2, PAL.signal, 0.8);
            g.lineBetween(m.x - 10, y + 6, m.x, y);
            g.lineBetween(m.x + 10, y + 6, m.x, y);
          }
          break;
      }
    }
    // Where the stick is pointing.
    const c = this.world.controls.desiredHeading;
    const p = this.world.player.f;
    if (c !== null && p.airborne) {
      const x = p.x + Math.sin(c) * 26;
      const y = p.y - Math.cos(c) * 26;
      g.fillStyle(0xffffff, 0.7);
      g.fillCircle(Math.round(x), Math.round(y), 2);
    }
  }

  private updateCamera(dt: number): void {
    const p = this.world.player.f;
    const look = p.airborne || p.speed > 5 ? tuning.camera.lookAhead : 60;
    const k = dt > 0 ? Math.min(1, tuning.camera.follow * dt) : 1;
    this.lookX = lerp(this.lookX, Math.sin(p.heading) * look, Math.min(1, k * 0.6));
    this.lookY = lerp(this.lookY, -Math.cos(p.heading) * look, Math.min(1, k * 0.6));
    const tx = p.x + this.lookX - GAME_W / 2;
    const ty = p.y + this.lookY - this.viewCentreY();
    this.camX = lerp(this.camX, tx, k);
    this.camY = lerp(this.camY, ty, k);
    const cam = this.cameras.main;
    cam.setScroll(Math.round(this.camX), Math.round(this.camY));
    this.ground.tilePositionX = cam.scrollX;
    this.ground.tilePositionY = cam.scrollY;
  }

  private updateClouds(): void {
    const cam = this.cameras.main;
    const cx = cam.scrollX + GAME_W / 2;
    const cy = cam.scrollY + GAME_H / 2;
    for (const c of this.clouds) {
      // Clouds sit between the jets and the ground, so they slide a little faster.
      c.img.setPosition(Math.round(c.x + (c.x - cx) * 0.15), Math.round(c.y + (c.y - cy) * 0.15));
      c.shadow.setPosition(Math.round(c.x + 30), Math.round(c.y + 45));
    }
  }
}

function polyline(g: Phaser.GameObjects.Graphics, pts: { x: number; y: number }[]): void {
  if (pts.length < 2) return;
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.strokePath();
}
