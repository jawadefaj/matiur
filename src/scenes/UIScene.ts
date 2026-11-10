// HUD and touch controls for Episode 2. Runs on top of FlightScene.
// Controls (portrait phone):
//   drag anywhere ........ floating stick: the jet turns toward the drag
//   THROTTLE (right edge)  speed and fuel burn
//   PULL ................. tighter turn (low level: climb)
//   FIRE ................. only when guns are set to HOLD
// Desktop: arrows steer, W/S throttle, SPACE pull, F fire, P/ESC pause.
import Phaser from 'phaser';
import { CSS, EXTRA_H, GAME_H, GAME_W, HUD, PAL } from '../config';
import { tuning } from '../data/tuning';
import { clamp, TAU } from '../systems/math';
import { markSortieCleared, updateSettings } from '../save';
import { Sortie3LowAndHome } from '../sortie/Sortie3LowAndHome';
import { Button, ButtonSet, txt } from '../ui/widgets';
import type { FlightScene } from './FlightScene';

/** Stick drag, px, up to which there is no steering input. */
const DEADZONE = 8;
/** Radius of the drawn stick ring, px; the knob stops at its edge. */
const STICK_R = 36;

/** What covers the HUD: nothing, a card (title or checkpoint), the pause menu or the results. */
type Overlay = 'none' | 'card' | 'pause' | 'result';

/** The floating stick: its base (ox, oy) and the finger (x, y), in screen px. id is the pointer. */
interface Stick {
  id: number;
  ox: number;
  oy: number;
  x: number;
  y: number;
}

type KeyName = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'W' | 'S' | 'SPACE' | 'SHIFT' | 'F';

export class UIScene extends Phaser.Scene {
  private flight!: FlightScene;
  // Graphics layers, back to front: screen effects, HUD, overlays.
  private fx!: Phaser.GameObjects.Graphics;
  private g!: Phaser.GameObjects.Graphics;
  private og!: Phaser.GameObjects.Graphics;
  private t!: Record<string, Phaser.GameObjects.Text>;
  private keys: Partial<Record<KeyName, Phaser.Input.Keyboard.Key>> = {};

  // Which pointer holds each control, so several fingers can work at once.
  private stick: Stick | null = null;
  private pullId: number | null = null;
  private fireId: number | null = null;
  private thrId: number | null = null;
  private pauseId: number | null = null;

  // The open overlay, with its buttons (obtns) and texts (otexts).
  private overlay: Overlay = 'none';
  private obtns = new ButtonSet();
  private otexts: Phaser.GameObjects.Text[] = [];
  /** Seconds since the sortie ended. */
  private endTimer = 0;
  /** Seconds since this HUD started; drives blinking and bobbing. */
  private clock = 0;

  constructor() {
    super('UI');
  }

  /**
   * Scene data: the FlightScene to show and control. Resets state, because
   * Phaser reuses this scene object every time it is launched.
   */
  init(data: { flight: FlightScene }): void {
    this.flight = data.flight;
    this.stick = null;
    this.pullId = this.fireId = this.thrId = this.pauseId = null;
    this.overlay = 'none';
    this.obtns = new ButtonSet();
    this.otexts = [];
    this.endTimer = 0;
    this.clock = 0;
  }

  create(): void {
    this.fx = this.add.graphics().setDepth(0);
    this.g = this.add.graphics().setDepth(1);
    this.og = this.add.graphics().setDepth(20);

    const W = GAME_W;
    this.t = {
      fuel: txt(this, 6, 5, 'FUEL', 8, CSS.dim),
      fuelV: txt(this, 110, 5, '', 8).setOrigin(1, 0),
      gl: txt(this, 122, 5, 'G', 8, CSS.dim),
      gV: txt(this, 232, 5, '', 8).setOrigin(1, 0),
      air: txt(this, 246, 5, 'AIRFRAME', 8, CSS.dim),
      speed: txt(this, 6, 30, '', 8),
      alt: txt(this, 122, 30, '', 8),
      thr: txt(this, 246, 30, '', 8),
      hint: txt(this, W / 2, 48, '', 8, CSS.signal).setOrigin(0.5, 0),
      radioFrom: txt(this, 9, 66, '', 8, CSS.friendly),
      radio: txt(this, 9, 78, '', 8, CSS.white, 340),
      warn: txt(this, W / 2, 124, '', 16, CSS.danger).setOrigin(0.5, 0),
      warn2: txt(this, W / 2, 146, '', 8, CSS.white).setOrigin(0.5, 0),
      pause: txt(this, HUD.pause.x + HUD.pause.w / 2, HUD.pause.y + HUD.pause.h / 2, 'II', 8).setOrigin(0.5),
      pull: txt(this, HUD.pull.x, HUD.pull.y, 'PULL', 8, CSS.signal).setOrigin(0.5),
      fire: txt(this, HUD.fire.x, HUD.fire.y, 'FIRE', 8, CSS.white).setOrigin(0.5),
      thrLbl: txt(this, HUD.throttle.x + HUD.throttle.w / 2, HUD.throttle.y - 14, 'THR', 8, CSS.dim).setOrigin(0.5, 0),
      altNum: txt(this, HUD.altGauge.x, HUD.altGauge.y + HUD.altGauge.h + 6, '', 8),
      radar: txt(this, HUD.altGauge.x, HUD.altGauge.y + HUD.altGauge.h + 50, 'RADAR', 8, CSS.dim),
      a100: txt(this, HUD.altGauge.x + HUD.altGauge.w + 3, 0, '100', 8, CSS.dim),
      a30: txt(this, HUD.altGauge.x + HUD.altGauge.w + 3, 0, '30', 8, CSS.dim),
      slideUp: txt(this, HUD.throttle.x - 4, 0, 'SLIDE\nUP', 8, CSS.signal).setOrigin(1, 0.5).setAlign('right'),
    };
    for (const t of Object.values(this.t)) t.setDepth(2);
    // The altitude gauge and radar only show in low-level flight (sortie 3).
    const lowLevel = this.flight.sortie.lowLevel;
    for (const k of ['altNum', 'radar', 'a100', 'a30']) this.t[k].setVisible(lowLevel);
    const ag = HUD.altGauge;
    // Altitude (ft) to gauge y: 0 ft at the bottom, lowLevel.gaugeMax at the top.
    const yOf = (alt: number) => ag.y + ag.h - (alt / tuning.lowLevel.gaugeMax) * ag.h;
    this.t.a100.setY(Math.round(yOf(tuning.lowLevel.bandHigh) - 4));
    this.t.a30.setY(Math.round(yOf(tuning.lowLevel.bandLow) - 4));

    // Input.
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => this.onDown(p));
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => this.onMove(p));
    this.input.on(Phaser.Input.Events.POINTER_UP, (p: Phaser.Input.Pointer) => this.onUp(p));
    // A finger lifted outside the canvas still counts as released.
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, (p: Phaser.Input.Pointer) => this.onUp(p));
    const kb = this.input.keyboard;
    if (kb) {
      this.keys = kb.addKeys('UP,DOWN,LEFT,RIGHT,W,S,SPACE,SHIFT,F') as Record<KeyName, Phaser.Input.Keyboard.Key>;
      const pauseKey = () => {
        if (this.overlay === 'none') this.openPause();
        else if (this.overlay === 'pause') this.closeOverlay();
      };
      kb.on('keydown-P', pauseKey);
      kb.on('keydown-ESC', pauseKey);
      kb.on('keydown-ENTER', () => this.overlay === 'card' && this.closeOverlay());
      kb.on('keydown-SPACE', () => this.overlay === 'card' && this.closeOverlay());
    }
    // Pause when the tab or app goes to the background.
    const onHidden = () => {
      if (this.overlay === 'none') this.openPause();
    };
    this.game.events.on(Phaser.Core.Events.HIDDEN, onHidden);
    // game.events outlives this scene, so remove the listener when the scene shuts down.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off(Phaser.Core.Events.HIDDEN, onHidden));

    // Every sortie starts paused on its title card.
    this.openCard();
    // Dev builds only: add this scene to the console handle that FlightScene made.
    if (import.meta.env.DEV) Object.assign((window as unknown as { __wof: object }).__wof ?? {}, { ui: this });
  }

  update(_t: number, dms: number): void {
    const dt = Math.min(dms / 1000, 0.1);
    this.clock += dt;
    if (this.flight.sortie.justRestored) {
      this.flight.sortie.justRestored = false;
      this.openCheckpointCard();
    }
    // Input reaches the sim only while no overlay is open.
    if (this.overlay === 'none') this.writeControls(dt);
    // FlightScene steps the sim after this scene (see main.ts), so the HUD
    // shows the state from the end of the previous frame.
    this.draw();
    this.checkEnd(dt);
    this.drawOverlay();
  }

  // -------------------------------------------------------------------------
  // Input

  private get world() {
    return this.flight.world;
  }

  /** FIRE shows only in hold-to-fire mode, and only when the sortie allows guns. */
  private get fireVisible(): boolean {
    return this.world.gunsMode === 'hold' && this.world.allowPlayerGuns;
  }

  /** A new touch: dismiss a card, press an overlay button, or take a control. Elsewhere it starts the stick. */
  private onDown(p: Phaser.Input.Pointer): void {
    if (this.overlay === 'card') {
      this.closeOverlay();
      return;
    }
    if (this.overlay !== 'none') {
      this.obtns.pointerDown(p.id, p.x, p.y);
      return;
    }
    // Hit areas are a little larger than the drawn controls.
    const { x, y } = p;
    const pb = HUD.pause;
    if (x >= pb.x - 4 && x <= pb.x + pb.w + 4 && y >= pb.y - 4 && y <= pb.y + pb.h + 4) {
      this.pauseId = p.id;
      return;
    }
    if (Math.hypot(x - HUD.pull.x, y - HUD.pull.y) <= HUD.pull.r + 8) {
      this.pullId = p.id;
      return;
    }
    if (this.fireVisible && Math.hypot(x - HUD.fire.x, y - HUD.fire.y) <= HUD.fire.r + 6) {
      this.fireId = p.id;
      return;
    }
    const th = HUD.throttle;
    if (x >= th.x - 18 && y >= th.y - 16 && y <= th.y + th.h + 16) {
      this.thrId = p.id;
      this.setThrottleFromY(y);
      return;
    }
    // One stick at a time: another free finger is ignored.
    if (!this.stick) this.stick = { id: p.id, ox: x, oy: y, x, y };
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (this.overlay !== 'none') return;
    if (p.id === this.thrId) this.setThrottleFromY(p.y);
    const s = this.stick;
    if (s && p.id === s.id) {
      s.x = p.x;
      s.y = p.y;
      // Drag the base along when the finger goes far, so it never "runs out".
      const dx = s.x - s.ox;
      const dy = s.y - s.oy;
      const d = Math.hypot(dx, dy);
      const max = STICK_R * 1.6;
      if (d > max) {
        s.ox = s.x - (dx / d) * max;
        s.oy = s.y - (dy / d) * max;
      }
    }
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (this.overlay !== 'none') {
      this.obtns.pointerUp(p.id, p.x, p.y);
      return;
    }
    // Pause opens on release, and only if the finger is still on the button.
    if (p.id === this.pauseId) {
      this.pauseId = null;
      const pb = HUD.pause;
      if (p.x >= pb.x - 4 && p.x <= pb.x + pb.w + 4 && p.y >= pb.y - 4 && p.y <= pb.y + pb.h + 4) this.openPause();
    }
    if (p.id === this.pullId) this.pullId = null;
    if (p.id === this.fireId) this.fireId = null;
    if (p.id === this.thrId) this.thrId = null;
    if (this.stick && p.id === this.stick.id) this.stick = null;
  }

  /** Let go of every control and centre the stick, as an overlay opens. */
  private releaseAll(): void {
    this.stick = null;
    this.pullId = this.fireId = this.thrId = this.pauseId = null;
    const c = this.world.controls;
    c.desiredHeading = null;
    c.pull = false;
    c.fire = false;
  }

  /** Throttle from finger height: 1 at the top of the track, 0 at the bottom. */
  private setThrottleFromY(y: number): void {
    const th = HUD.throttle;
    this.world.controls.throttle = clamp(1 - (y - th.y) / th.h, 0, 1);
  }

  /** Write the held controls (touch or keys) into world.controls. The touch throttle is set as the finger moves. */
  private writeControls(dt: number): void {
    const c = this.world.controls;
    const k = this.keys;
    let dh: number | null = null;
    if (this.stick) {
      const dx = this.stick.x - this.stick.ox;
      const dy = this.stick.y - this.stick.oy;
      // Drag direction as a heading: 0 = up the screen, clockwise (see systems/math.ts).
      if (Math.hypot(dx, dy) > DEADZONE) dh = Math.atan2(dx, -dy);
    } else {
      // Arrow keys give eight directions.
      const kx = (k.RIGHT?.isDown ? 1 : 0) - (k.LEFT?.isDown ? 1 : 0);
      const ky = (k.DOWN?.isDown ? 1 : 0) - (k.UP?.isDown ? 1 : 0);
      if (kx || ky) dh = Math.atan2(kx, -ky);
    }
    c.desiredHeading = dh;
    c.pull = this.pullId !== null || !!k.SPACE?.isDown || !!k.SHIFT?.isDown;
    c.fire = this.fireId !== null || !!k.F?.isDown;
    // W and S move the throttle by 60% per second.
    if (k.W?.isDown) c.throttle = Math.min(1, c.throttle + dt * 0.6);
    if (k.S?.isDown) c.throttle = Math.max(0, c.throttle - dt * 0.6);
  }

  // -------------------------------------------------------------------------
  // Drawing

  /** Redraw the whole HUD from the sim, every frame. */
  private draw(): void {
    const w = this.world;
    const s = this.flight.sortie;
    const p = w.player.f;
    const fx = this.fx;
    const g = this.g;
    fx.clear();
    g.clear();
    // Blink phase for HUD warnings: 0.25 s on, 0.25 s off.
    const blinkOn = Math.floor(this.clock * 4) % 2 === 0;

    // Screen effects: greyout, G strain, hits, crash.
    if (w.gmeter.greyLevel > 0) {
      fx.fillStyle(0x7d7d7d, 0.5 * w.gmeter.greyLevel);
      fx.fillRect(0, 0, GAME_W, GAME_H);
    }
    // G strain: a dark border that thickens toward the blackout limit (tunnel vision).
    const st = w.gmeter.strain;
    if (st > 0) {
      const th = Math.round(10 + 80 * st);
      fx.fillStyle(0x000000, 0.25 + 0.5 * st);
      fx.fillRect(0, 0, GAME_W, th);
      fx.fillRect(0, GAME_H - th, GAME_W, th);
      fx.fillRect(0, th, th, GAME_H - th * 2);
      fx.fillRect(GAME_W - th, th, th, GAME_H - th * 2);
    }
    if (this.flight.hitFlash > 0) {
      fx.fillStyle(PAL.danger, 0.22 * this.flight.hitFlash);
      fx.fillRect(0, 0, GAME_W, GAME_H);
    }
    if (this.flight.crashFlash > 0) {
      fx.fillStyle(0xffffff, Math.min(1, this.flight.crashFlash * 1.2));
      fx.fillRect(0, 0, GAME_W, GAME_H);
    }
    // After a blackout, fade to black before the results open.
    if (s.status === 'failed' && s.failKind === 'blackout') {
      fx.fillStyle(0x000000, Math.min(1, this.endTimer * 1.2));
      fx.fillRect(0, 0, GAME_W, GAME_H);
    }

    this.drawIndicators(g);
    this.drawGunsight(g);

    // Top panel.
    g.fillStyle(PAL.panel, 0.94);
    g.fillRect(0, 0, GAME_W, HUD.topH);
    g.fillStyle(PAL.panelEdge, 1);
    g.fillRect(0, HUD.topH, GAME_W, 1);

    // Fuel bar: green above 25%, amber down to bingo, then red and blinking.
    const fuel = w.fuel.pct;
    const fuelCol = fuel > 25 ? PAL.ok : fuel > tuning.fuel.bingo ? PAL.warn : PAL.danger;
    const fuelShow = fuel > tuning.fuel.bingo || blinkOn;
    this.bar(g, 6, 16, 104, 8, fuel / 100, fuelShow ? fuelCol : PAL.ink);
    this.t.fuelV.setText(`${Math.ceil(fuel)}%`);

    // G bar: 0 to 7.5 G, ticks at the greyout and blackout limits. Green below
    // 4 G, amber up to greyout, then red; it flashes white while blackout counts down.
    const gv = w.gmeter.g;
    const gmax = 7.5;
    const gCol = gv < 4 ? PAL.ok : gv < tuning.gmeter.greyoutAbove ? PAL.warn : PAL.danger;
    const gFlash = w.gmeter.blackoutWarning !== null && !blinkOn;
    this.bar(g, 122, 16, 110, 8, gv / gmax, gFlash ? PAL.white : gCol);
    for (const [mark, col] of [[tuning.gmeter.greyoutAbove, PAL.warn], [tuning.gmeter.blackoutAt, PAL.danger]] as const) {
      const mx = Math.round(122 + (mark / gmax) * 110);
      g.fillStyle(col, 1);
      g.fillRect(mx, 13, 1, 14);
    }
    this.t.gV.setText(gv.toFixed(1));

    // Airframe pips: filled while intact, coloured by how many are left.
    const pips = w.damage.pips;
    for (let i = 0; i < w.damage.maxPips; i++) {
      const x = 246 + i * 37;
      const alive = i < pips;
      const col = pips >= 3 ? PAL.ok : pips === 2 ? PAL.warn : PAL.danger;
      g.fillStyle(PAL.ink, 1);
      g.fillRect(x, 15, 32, 10);
      if (alive) {
        g.fillStyle(col, 1);
        g.fillRect(x + 1, 16, 30, 8);
      } else {
        g.lineStyle(1, PAL.panelEdge, 1);
        g.strokeRect(x + 1.5, 16.5, 29, 7);
      }
    }

    this.t.speed.setText(`${Math.round(p.speed)} KT`);
    // Low level shows whole feet; at altitude, the nearest 100 ft.
    this.t.alt.setText(s.lowLevel ? `ALT ${Math.max(0, Math.round(p.altitude))} FT` : `ALT ${Math.round(p.altitude / 100) * 100}`);
    this.t.thr.setText(`THR ${Math.round(w.controls.throttle * 100)}%`);

    // Objective / hint strip.
    g.fillStyle(0x000000, 0.45);
    g.fillRect(0, HUD.topH + 1, GAME_W, 14);
    const act = s.objectives.find((o) => o.state === 'active' && o.progress);
    this.t.hint.setText(s.hint + (act?.progress ? `  ${act.progress}` : ''));

    // Radio.
    const msg = w.radio.current;
    if (msg) {
      g.fillStyle(0x0b0c0d, 0.72);
      g.fillRect(4, 62, GAME_W - 8, 36);
      g.lineStyle(1, PAL.panelEdge, 1);
      g.strokeRect(4.5, 62.5, GAME_W - 9, 35);
      this.t.radioFrom.setText(msg.from.toUpperCase()).setVisible(true);
      this.t.radio.setText(msg.text).setVisible(true);
    } else {
      this.t.radioFrom.setVisible(false);
      this.t.radio.setVisible(false);
    }

    // Centre warnings.
    this.drawWarnings(blinkOn);

    // Low-level gauge and radar.
    if (s.lowLevel && s instanceof Sortie3LowAndHome) this.drawLowLevel(g, s, blinkOn);

    // Bottom controls.
    this.drawControls(g);
  }

  /** A bar filled to `frac` (0..1) inside a dark frame. */
  private bar(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, frac: number, col: number): void {
    g.fillStyle(PAL.ink, 1);
    g.fillRect(x, y, w, h);
    g.fillStyle(col, 1);
    g.fillRect(x + 1, y + 1, Math.round((w - 2) * clamp(frac, 0, 1)), h - 2);
  }

  /** The big centre warning and its sub-line. Only the most urgent shows, in the order checked here. */
  private drawWarnings(blinkOn: boolean): void {
    const w = this.world;
    const s = this.flight.sortie;
    let main = '';
    let sub = '';
    let col = CSS.danger;
    // Radar and terrain state exist only in sortie 3.
    const ll = s instanceof Sortie3LowAndHome ? s.ll : null;
    if (s.restartIn > 0) {
      // The headline depends on the wording of the restart reason (softFail in Sortie3LowAndHome).
      main = s.restartReason.includes('radar') || s.restartReason.includes('Interceptors') ? 'INTERCEPTED' : 'CRASHED';
      sub = `${s.restartReason}\nRestarting from checkpoint...`;
    } else if (ll?.contact) {
      main = blinkOn ? 'RADAR CONTACT' : '';
      sub = `Get under 100 ft! ${Math.max(0, ll.interceptTimer).toFixed(1)}s`;
    } else if (ll?.warning === 'terrain') {
      main = blinkOn ? 'PULL UP' : '';
    } else if (w.gmeter.blackoutWarning !== null) {
      main = blinkOn ? 'G! EASE OFF' : '';
    } else if (w.gmeter.greyout) {
      main = 'GREYOUT';
      sub = 'Controls soft. Ease off PULL.';
      col = CSS.warn;
    } else if (ll?.warning === 'low') {
      main = 'TOO LOW';
      col = CSS.warn;
    } else if (w.fuel.empty && w.player.f.airborne) {
      main = blinkOn ? 'FLAMEOUT' : '';
    }
    this.t.warn.setText(main).setColor(col);
    this.t.warn2.setText(sub);
  }

  /** Sortie 3 altitude gauge (red below the band, green in it, amber above) and the radar dial. */
  private drawLowLevel(g: Phaser.GameObjects.Graphics, s: Sortie3LowAndHome, blinkOn: boolean): void {
    const ag = HUD.altGauge;
    const ll = tuning.lowLevel;
    const yOf = (alt: number) => ag.y + ag.h - clamp(alt / ll.gaugeMax, 0, 1) * ag.h;
    g.fillStyle(PAL.ink, 0.8);
    g.fillRect(ag.x, ag.y, ag.w, ag.h);
    g.fillStyle(PAL.danger, 0.55);
    g.fillRect(ag.x + 1, yOf(ll.bandLow), ag.w - 2, ag.y + ag.h - yOf(ll.bandLow));
    g.fillStyle(PAL.ok, 0.45);
    g.fillRect(ag.x + 1, yOf(ll.bandHigh), ag.w - 2, yOf(ll.bandLow) - yOf(ll.bandHigh));
    g.fillStyle(PAL.warn, 0.3);
    g.fillRect(ag.x + 1, ag.y + 1, ag.w - 2, yOf(ll.bandHigh) - ag.y - 1);
    const alt = this.world.player.f.altitude;
    const py = Math.round(yOf(alt));
    g.fillStyle(PAL.white, 1);
    g.fillRect(ag.x - 2, py - 1, ag.w + 4, 2);
    g.fillTriangle(ag.x + ag.w + 2, py, ag.x + ag.w + 8, py - 4, ag.x + ag.w + 8, py + 4);
    this.t.altNum.setText(`${Math.max(0, Math.round(alt))}FT`);

    // Radar fill.
    const cx = ag.x + 11;
    const cy = ag.y + ag.h + 34;
    g.fillStyle(PAL.ink, 0.85);
    g.fillCircle(cx, cy, 11);
    const r = s.ll.radar;
    if (r > 0) {
      // A pie filling clockwise from 12 o'clock. It blinks red and white once radar has contact.
      g.fillStyle(s.ll.contact ? (blinkOn ? PAL.danger : PAL.white) : PAL.warn, 1);
      g.slice(cx, cy, 10, -Math.PI / 2, -Math.PI / 2 + r * TAU, false);
      g.fillPath();
    }
    g.lineStyle(1, PAL.panelEdge, 1);
    g.strokeCircle(cx, cy, 11);
  }

  private drawControls(g: Phaser.GameObjects.Graphics): void {
    const w = this.world;
    // Pause.
    const pb = HUD.pause;
    g.fillStyle(PAL.panel, 0.85);
    g.fillRect(pb.x, pb.y, pb.w, pb.h);
    g.lineStyle(1, PAL.panelEdge, 1);
    g.strokeRect(pb.x + 0.5, pb.y + 0.5, pb.w - 1, pb.h - 1);

    // PULL.
    const pu = HUD.pull;
    const pulling = w.controls.pull;
    g.fillStyle(pulling ? PAL.signal : PAL.panel, pulling ? 0.95 : 0.7);
    g.fillCircle(pu.x, pu.y, pu.r);
    g.lineStyle(2, PAL.signal, 1);
    g.strokeCircle(pu.x, pu.y, pu.r);
    this.t.pull.setText(this.flight.sortie.lowLevel ? 'PULL\n UP' : 'PULL').setColor(pulling ? '#15171a' : CSS.signal);

    // FIRE (hold mode only).
    const showFire = this.fireVisible;
    this.t.fire.setVisible(showFire);
    if (showFire) {
      const fi = HUD.fire;
      const firing = w.controls.fire;
      g.fillStyle(firing ? PAL.danger : PAL.panel, firing ? 0.95 : 0.7);
      g.fillCircle(fi.x, fi.y, fi.r);
      g.lineStyle(2, PAL.danger, 1);
      g.strokeCircle(fi.x, fi.y, fi.r);
    }

    // Throttle slider.
    const th = HUD.throttle;
    const v = w.controls.throttle;
    const hy = Math.round(th.y + (1 - v) * th.h);
    g.fillStyle(PAL.ink, 0.75);
    g.fillRect(th.x + 11, th.y, 14, th.h);
    g.fillStyle(PAL.signal, 0.45);
    g.fillRect(th.x + 12, hy, 12, th.y + th.h - hy);
    g.lineStyle(1, PAL.panelEdge, 1);
    g.strokeRect(th.x + 11.5, th.y + 0.5, 13, th.h - 1);
    for (let i = 1; i < 4; i++) {
      g.fillStyle(PAL.panelEdge, 1);
      g.fillRect(th.x + 6, Math.round(th.y + (th.h * i) / 4), 4, 1);
    }
    g.fillStyle(PAL.ink, 1);
    g.fillRect(th.x + 1, hy - 6, th.w - 1, 13);
    g.fillStyle(this.thrId !== null ? PAL.signal : PAL.panel, 1);
    g.fillRect(th.x, hy - 7, th.w - 1, 13);
    g.lineStyle(1, PAL.signal, 1);
    g.strokeRect(th.x + 0.5, hy - 6.5, th.w - 2, 12);

    // Take-off prompt next to the throttle.
    const f = w.player.f;
    const takingOff = this.flight.sortie.objectives.some((o) => o.id === 'takeoff' && o.state === 'active');
    const showSlide = takingOff && !f.airborne && f.speed < tuning.takeoff.rotateSpeed && v < 0.7 && this.overlay === 'none';
    this.t.slideUp.setVisible(showSlide);
    if (showSlide) {
      const bob = Math.round(Math.sin(this.clock * 6) * 4);
      this.t.slideUp.setY(hy - 30 + bob);
      g.fillStyle(PAL.signal, 1);
      g.fillTriangle(th.x - 10, hy - 52 + bob, th.x - 16, hy - 44 + bob, th.x - 4, hy - 44 + bob);
    }

    // Floating stick.
    const s = this.stick;
    if (s) {
      const dx = s.x - s.ox;
      const dy = s.y - s.oy;
      const d = Math.hypot(dx, dy);
      const k = d > STICK_R ? STICK_R / d : 1;
      g.lineStyle(2, 0xffffff, 0.35);
      g.strokeCircle(s.ox, s.oy, STICK_R);
      g.fillStyle(0xffffff, 0.35);
      g.fillCircle(s.ox + dx * k, s.oy + dy * k, 14);
    }
  }

  /** World px to screen px through the flight camera (it never zooms or rotates). */
  private toScreen(wx: number, wy: number): { x: number; y: number } {
    const cam = this.flight.cameras.main;
    return { x: wx - cam.scrollX, y: wy - cam.scrollY };
  }

  /** Brackets on visible aircraft, edge arrows for anything off-screen. */
  private drawIndicators(g: Phaser.GameObjects.Graphics): void {
    const w = this.world;
    const s = this.flight.sortie;
    // The box where targets count as on screen: the playfield, clear of the throttle.
    const L = 8;
    const R = GAME_W - 50;
    const T = HUD.playTop + 4;
    const B = HUD.playBottom - 4;
    const pp = this.toScreen(w.player.f.x, w.player.f.y);

    const mark = (wx: number, wy: number, col: number, bracket: number) => {
      const { x, y } = this.toScreen(wx, wy);
      if (x >= L && x <= R && y >= T && y <= B) {
        if (bracket > 0) this.bracket(g, x, y, bracket, col);
        return;
      }
      // Off screen: the arrow goes where the line from the player to the target leaves the box.
      const dx = x - pp.x;
      const dy = y - pp.y;
      const tx = dx > 0 ? (R - pp.x) / dx : dx < 0 ? (L - pp.x) / dx : Infinity;
      const ty = dy > 0 ? (B - pp.y) / dy : dy < 0 ? (T - pp.y) / dy : Infinity;
      const t = Math.min(tx, ty);
      if (!isFinite(t) || t <= 0) return;
      const ex = pp.x + dx * t;
      const ey = pp.y + dy * t;
      const a = Math.atan2(dy, dx);
      const c = Math.cos(a);
      const sn = Math.sin(a);
      // The arrow points outward, over a slightly larger dark copy.
      g.fillStyle(PAL.ink, 0.8);
      g.fillTriangle(ex + c * 2, ey + sn * 2, ex - c * 11 - sn * 7, ey - sn * 11 + c * 7, ex - c * 11 + sn * 7, ey - sn * 11 - c * 7);
      g.fillStyle(col, 1);
      g.fillTriangle(ex, ey, ex - c * 9 - sn * 5, ey - sn * 9 + c * 5, ex - c * 9 + sn * 5, ey - sn * 9 - c * 5);
    };

    // Enemies: orange brackets, bigger for bombers. Friendlies: cyan, with a
    // bracket only for escorted aircraft. Markers: off-screen arrows only.
    for (const a of w.aircraft) {
      if (a.status !== 'active' || a.role === 'player') continue;
      if (a.side === 'enemy') mark(a.f.x, a.f.y, PAL.hostile, a.role === 'bomber' ? 14 : 11);
      else mark(a.f.x, a.f.y, PAL.friendly, a.role === 'escortee' ? 14 : 0);
    }
    for (const m of s.markers) {
      mark(m.x, m.y, m.kind === 'base' ? PAL.ok : PAL.signal, 0);
    }
  }

  /** Four corner brackets around (x, y), r px out, with 4 px arms. */
  private bracket(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, col: number): void {
    const k = 4;
    x = Math.round(x);
    y = Math.round(y);
    g.lineStyle(1, col, 0.9);
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const cx = x + sx * r;
      const cy = y + sy * r;
      g.lineBetween(cx, cy, cx - sx * k, cy);
      g.lineBetween(cx, cy, cx, cy - sy * k);
    }
  }

  /**
   * Ring on the lead point of the current gun target. Brighter, with a centre
   * dot, when that point is inside the gun cone and range (auto-fire shoots then).
   */
  private drawGunsight(g: Phaser.GameObjects.Graphics): void {
    const gt = this.world.gunTarget;
    if (!gt || !this.world.allowPlayerGuns) return;
    const { x, y } = this.toScreen(gt.lx, gt.ly);
    g.lineStyle(1, PAL.signal, gt.inCone ? 1 : 0.6);
    g.strokeCircle(Math.round(x), Math.round(y), 6);
    if (gt.inCone) {
      g.fillStyle(PAL.signal, 1);
      g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
    }
  }

  // -------------------------------------------------------------------------
  // Overlays: title card, pause, results

  /** Title card shown before each sortie. A tap, Enter or Space starts the sortie. */
  private openCard(): void {
    const s = this.flight.sortie;
    this.overlay = 'card';
    this.flight.paused = true;
    const cx = GAME_W / 2;
    const oy = Math.round(EXTRA_H / 2);
    const tips: Record<number, string> = {
      1: 'Throttle up to roll. Drag to steer.\nJoin your wingman, fly the patrol.',
      2: 'Get behind them: guns fire on target.\nWatch your G at high speed.',
      3: 'Hold PULL to climb, let go to sink.\nStay 30 to 100 ft. Then land.',
    };
    this.otexts.push(
      txt(this, cx, oy + 196, 'EPISODE 2 - SABRE SKIES', 8, CSS.dim).setOrigin(0.5),
      txt(this, cx, oy + 222, `SORTIE ${s.num}`, 16, CSS.signal).setOrigin(0.5),
      txt(this, cx, oy + 248, s.title.toUpperCase(), 16, CSS.white).setOrigin(0.5),
      txt(this, cx, oy + 274, `${s.place}`, 8, CSS.dim).setOrigin(0.5),
      txt(this, cx, oy + 288, s.date, 8, CSS.dim).setOrigin(0.5),
      txt(this, cx, oy + 318, tips[s.num], 8, CSS.white).setOrigin(0.5, 0).setAlign('center'),
      txt(this, cx, oy + 372, 'TAP TO START', 8, CSS.signal).setOrigin(0.5),
    );
    for (const t of this.otexts) t.setDepth(21);
  }

  /** Pause after a checkpoint restart so the player is ready on the controls. */
  private openCheckpointCard(): void {
    this.releaseAll();
    this.overlay = 'card';
    this.flight.paused = true;
    const cx = GAME_W / 2;
    const oy = Math.round(EXTRA_H / 2);
    const tip = this.flight.sortie.lowLevel ? 'Hold PULL to climb, let go to sink.' : '';
    this.otexts.push(
      txt(this, cx, oy + 222, 'CHECKPOINT', 16, CSS.signal).setOrigin(0.5),
      txt(this, cx, oy + 252, this.flight.sortie.restartReason, 8, CSS.white, 300).setOrigin(0.5, 0).setAlign('center'),
      txt(this, cx, oy + 300, tip, 8, CSS.dim).setOrigin(0.5),
      txt(this, cx, oy + 372, 'TAP TO CONTINUE', 8, CSS.signal).setOrigin(0.5),
    );
    for (const t of this.otexts) t.setDepth(21);
  }

  /** Pause menu with the objective list. Opens only while the sortie is running. */
  private openPause(): void {
    if (this.flight.sortie.status !== 'running') return;
    this.releaseAll();
    this.overlay = 'pause';
    this.flight.paused = true;
    const s = this.flight.sortie;
    const cx = GAME_W / 2;
    this.otexts.push(txt(this, cx, 150, 'PAUSED', 16, CSS.signal).setOrigin(0.5));
    const lines = s.objectives.map((o) => `${mark(o.state)} ${o.label}${o.progress ? ' ' + o.progress : ''}`);
    this.otexts.push(txt(this, 40, 176, lines.join('\n'), 8, CSS.white));
    let y = 260;
    const add = (label: string, fn: () => void, primary = false) => {
      this.obtns.add(new Button(this, 60, y, 240, 40, label, fn, primary));
      y += 50;
    };
    add('RESUME', () => this.closeOverlay(), true);
    add('RESTART SORTIE', () => this.flight.restartSortie());
    // The GUNS toggle changes the live world and the saved setting together.
    const gunsBtn = new Button(this, 60, y, 240, 40, `GUNS: ${this.world.gunsMode.toUpperCase()}`, () => {
      const next = this.world.gunsMode === 'auto' ? 'hold' : 'auto';
      this.world.gunsMode = next;
      updateSettings({ gunsMode: next });
      gunsBtn.setLabel(`GUNS: ${next.toUpperCase()}`);
    });
    this.obtns.add(gunsBtn);
    y += 50;
    if (this.scale.fullscreen.available) add('FULL SCREEN', () => this.scale.toggleFullscreen());
    add('SORTIE SELECT', () => this.flight.toMenu());
    for (const b of this.obtns.buttons) b.setDepth(21);
    for (const t of this.otexts) t.setDepth(21);
  }

  /** Results: objectives, time, airframe and fuel, then the buttons. A completed sortie is saved. */
  private openResult(): void {
    const s = this.flight.sortie;
    this.releaseAll();
    this.overlay = 'result';
    this.flight.paused = true;
    const ok = s.status === 'complete';
    if (ok) markSortieCleared(s.num);
    const cx = GAME_W / 2;
    this.otexts.push(
      txt(this, cx, 120, ok ? 'SORTIE COMPLETE' : 'SORTIE FAILED', 16, ok ? CSS.ok : CSS.danger).setOrigin(0.5),
      txt(this, cx, 144, `SORTIE ${s.num}: ${s.title.toUpperCase()}`, 8, CSS.dim).setOrigin(0.5),
    );
    let y = 166;
    if (!ok) {
      const reason = txt(this, cx, y, s.failReason, 8, CSS.white, 300).setOrigin(0.5, 0).setAlign('center');
      this.otexts.push(reason);
      y += reason.height + 12;
    }
    const lines = s.objectives.map((o) => `${mark(o.state)} ${o.label}`);
    const mins = Math.floor(s.elapsed / 60);
    const secs = Math.floor(s.elapsed % 60).toString().padStart(2, '0');
    lines.push('', `Time ${mins}:${secs}   Airframe ${this.world.damage.pips}/3   Fuel ${Math.ceil(this.world.fuel.pct)}%`);
    if (s.restarts > 0) lines.push(`Checkpoint restarts: ${s.restarts}`);
    const list = txt(this, 34, y, lines.join('\n'), 8, CSS.white, 300);
    this.otexts.push(list);
    y = Math.max(y + list.height + 24, 330);
    const add = (label: string, fn: () => void, primary = false) => {
      this.obtns.add(new Button(this, 60, y, 240, 40, label, fn, primary));
      y += 50;
    };
    if (ok && s.num < 3) add(`NEXT: SORTIE ${s.num + 1}`, () => this.flight.restartSortie((s.num + 1) as 2 | 3), true);
    add(ok ? 'FLY AGAIN' : 'RETRY', () => this.flight.restartSortie(), !ok);
    add('SORTIE SELECT', () => this.flight.toMenu());
    for (const b of this.obtns.buttons) b.setDepth(21);
    for (const t of this.otexts) t.setDepth(21);
  }

  /** Remove the overlay and unpause the flight. */
  private closeOverlay(): void {
    this.obtns.clear();
    for (const t of this.otexts) t.destroy();
    this.otexts = [];
    this.overlay = 'none';
    this.flight.paused = false;
  }

  /** Once the sortie ends, wait (1.6 s after a blackout, else 1.2 s), then show the results. */
  private checkEnd(dt: number): void {
    const s = this.flight.sortie;
    if (s.status === 'running') return;
    this.endTimer += dt;
    const wait = s.failKind === 'blackout' ? 1.6 : 1.2;
    if (this.overlay === 'none' && this.endTimer > wait) this.openResult();
  }

  /** Dim the screen under any overlay. Cards also get a framed panel and a blinking TAP line. */
  private drawOverlay(): void {
    const g = this.og;
    g.clear();
    if (this.overlay === 'none') return;
    // The TAP prompt blinks 0.5 s on, 0.5 s off.
    const blinkOn = Math.floor(this.clock * 2) % 2 === 0;
    g.fillStyle(0x0b0c0d, this.overlay === 'card' ? 0.6 : 0.78);
    g.fillRect(0, 0, GAME_W, GAME_H);
    if (this.overlay === 'card') {
      g.fillStyle(PAL.panel, 0.95);
      const oy = Math.round(EXTRA_H / 2);
      g.fillRect(20, oy + 176, GAME_W - 40, 214);
      g.lineStyle(1, PAL.signal, 1);
      g.strokeRect(20.5, oy + 176.5, GAME_W - 41, 213);
      // Both card builders add the TAP prompt last.
      const tap = this.otexts[this.otexts.length - 1];
      tap?.setVisible(blinkOn);
    }
    this.obtns.draw(g);
  }
}

/** Text checkbox for an objective state, for the pause and results lists. */
function mark(state: string): string {
  if (state === 'done') return '[OK]';
  if (state === 'failed') return '[X] ';
  if (state === 'active') return '[>] ';
  return '[ ] ';
}
