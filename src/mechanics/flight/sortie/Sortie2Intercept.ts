// Sortie 2 — Intercept. Turn back bombers before they reach the base while
// keeping a slower friendly formation (Bulldog flight) safe.
// Score comes from objectives only. There is no kill counter.
import { t } from '../../../core/i18n';
import { DEG, dist } from '../../../core/math';
import { BomberAI, EscorteeAI, FighterAI, WingmanAI, type Point } from '../systems/ai/AI';
import type { Aircraft } from '../sim/types';
import type { World } from '../sim/World';
import { Sortie } from './Sortie';
import { PESHAWAR, farmlandTerrain } from './terrain';

const BASE: Point = { x: PESHAWAR.x, y: PESHAWAR.y };
/** Beyond this distance from the base (px), Control tells the player to turn back. Nothing else happens. */
const ARENA_RADIUS = 2800;

export class Sortie2Intercept extends Sortie {
  readonly num = 2 as const;
  readonly title = t('s2.title');
  readonly place = t('s2.place');

  /** Seconds of script time; drives the wave timeline. */
  private t = 0;
  /** Waves spawned so far: 1 raid A, 2 Bulldog flight, 3 Gnats, 4 raid C. */
  private wave = 0;
  private bombers: Aircraft[] = [];
  /** Each bomber's AI by aircraft id, to check whether it has bombed. */
  private bombAI = new Map<number, BomberAI>();
  /** The friendly B-57s to escort home. */
  private bulldog: Aircraft[] = [];
  private gnats: Aircraft[] = [];
  /** -1 until every wave is resolved, then counts down to completion. */
  private endTimer = -1;

  setup(w: World): void {
    this.terrain = farmlandTerrain(22);
    w.spawn({
      kind: 'sabre', side: 'player', role: 'player', callsign: 'Sherdil One',
      x: 0, y: 320, heading: 0, speed: 450, throttle: 0.66, altitude: 12000,
    });
    w.controls.throttle = 0.66;
    const two = new WingmanAI();
    w.spawn({
      kind: 'sabre', side: 'friendly', role: 'wingman', callsign: 'Sherdil Two',
      x: 34, y: 342, heading: 0, speed: 450, ai: two, invulnerable: true,
    });
    this.objectives = [
      { id: 'base', label: t('s2.obj.base'), state: 'active' },
      { id: 'escort', label: t('s2.obj.escort'), state: 'pending' },
    ];
    w.radio.say(t('who.control'), t('s2.inbound'));
    w.radio.say(t('who.sherdilTwo'), t('s2.gunsAuto'));
  }

  protected script(w: World, dt: number): void {
    this.t += dt;
    const p = w.player;

    // Wave timeline. Raid C comes at 120 s, or from 75 s once raid A's bombers
    // and the Gnats are dealt with.
    if (this.wave === 0 && this.t > 3) this.spawnWaveA(w);
    if (this.wave === 1 && this.t > 35) this.spawnBulldog(w);
    if (this.wave === 2 && this.t > 47) this.spawnGnats(w);
    if (this.wave === 3 && (this.t > 120 || (this.t > 75 && this.resolved(this.bombers) && this.resolved(this.gnats)))) {
      this.spawnWaveC(w);
    }

    for (const e of w.events) {
      if (e.type === 'baseHit') {
        this.setObj('base', 'failed');
        w.radio.say(t('who.control'), t('s2.baseHit'), { urgent: true });
      } else if (e.type === 'escorteeLost') {
        this.setObj('escort', 'failed');
        w.radio.say(t('who.bulldogLead'), t('s2.bulldogLost'), { urgent: true });
      } else if (e.type === 'landed') {
        w.radio.say(t('who.bulldogLead'), t('s2.bulldogLanded'), { key: 'bdland' });
      } else if (e.type === 'friendlyHit') {
        w.radio.say(t('who.bulldogLead'), t('s2.bulldogHit'), { key: 'bdhit', cooldown: 12 });
      }
    }

    // Bombers that dropped and are heading home leave the area.
    for (const b of this.bombers) {
      const ai = this.bombAI.get(b.id);
      if (ai?.bombed && b.status === 'active' && dist(b.f.x, b.f.y, BASE.x, BASE.y) > 1500) b.status = 'gone';
    }

    // Escort objective.
    if (this.bulldog.length > 0 && this.obj('escort').state === 'active') {
      if (this.bulldog.every((a) => a.status === 'landed')) this.setObj('escort', 'done');
    }

    // Leaving the arena.
    if (dist(p.f.x, p.f.y, BASE.x, BASE.y) > ARENA_RADIUS) {
      w.radio.say(t('who.control'), t('s2.leavingArea'), { key: 'arena', cooldown: 10 });
    }

    this.updateMarkersAndHint();

    // End once every wave is resolved.
    if (this.wave >= 4 && this.endTimer < 0) {
      // Bombers that already dropped are heading home, so they no longer count.
      const threats = w.activeEnemies().filter((a) => !this.bombAI.get(a.id)?.bombed);
      const bulldogDone = this.bulldog.every((a) => a.status !== 'active');
      if (threats.length === 0 && bulldogDone) {
        this.endTimer = 4;
        if (this.obj('base').state === 'active') this.setObj('base', 'done');
        w.radio.say(t('who.control'), t('s2.allClear'));
      }
    }
    if (this.endTimer > 0) {
      this.endTimer -= dt;
      if (this.endTimer <= 0) this.complete();
    }
  }

  /** Every aircraft in `list` is out of the fight or has already bombed. */
  private resolved(list: Aircraft[]): boolean {
    return list.every((a) => a.status !== 'active' || this.bombAI.get(a.id)?.bombed);
  }

  /** Base marker, plus a hint for the most urgent job. */
  private updateMarkersAndHint(): void {
    this.markers = [{ x: BASE.x, y: BASE.y, r: 240, kind: 'base', label: 'BASE' }];
    const inbound = this.bombers.filter((b) => b.status === 'active' && !this.bombAI.get(b.id)?.bombed);
    const gnatsActive = this.gnats.some((g) => g.status === 'active');
    if (inbound.length > 0) this.hint = t('s2.hint.bombers', { n: inbound.length });
    else if (gnatsActive) this.hint = t('s2.hint.gnats');
    else if (this.bulldog.some((a) => a.status === 'active')) this.hint = t('s2.hint.cover');
    else if (this.wave < 4) this.hint = t('s2.hint.patrol');
    else this.hint = t('s2.hint.clear');
  }

  /** Raid A: two Canberras from the north-east, each with a Hunter escort on alternate sides. */
  private spawnWaveA(w: World): void {
    this.wave = 1;
    const home = { x: 2600, y: -3800 };
    for (const [i, pos] of [{ x: 1800, y: -2500 }, { x: 1870, y: -2450 }].entries()) {
      const ai = new BomberAI(BASE, home, 330);
      const b = w.spawn({
        kind: 'canberra', side: 'enemy', role: 'bomber', x: pos.x, y: pos.y,
        heading: 225 * DEG, speed: 330, ai, tag: 'A',
      });
      this.bombAI.set(b.id, ai);
      this.bombers.push(b);
      w.spawn({
        kind: 'hunter', side: 'enemy', role: 'fighter', x: pos.x + 60, y: pos.y + 40,
        heading: 225 * DEG, speed: 330,
        ai: new FighterAI({ prefer: 'player', escortId: b.id, home, skill: 0.55, escortSide: i === 0 ? -1 : 1 }),
        tag: 'A',
      });
    }
  }

  /** Bulldog flight: two friendly B-57s from the south-east that land at the base, or divert if hit hard. */
  private spawnBulldog(w: World): void {
    this.wave = 2;
    this.setObj('escort', 'active');
    const divert = { x: 2600, y: 3200 };
    for (const off of [0, 1]) {
      const a = w.spawn({
        kind: 'b57', side: 'friendly', role: 'escortee', callsign: `Bulldog ${off + 1}`,
        x: 2300 + off * 40, y: 1500 + off * 40, heading: 300 * DEG, speed: 300,
        ai: new EscorteeAI({ x: BASE.x + off * 30, y: BASE.y + off * 30 }, divert, 300),
      });
      this.bulldog.push(a);
    }
    w.radio.say(t('who.control'), t('s2.bulldogInbound'));
  }

  /** Two Gnats from the east that go after Bulldog flight. */
  private spawnGnats(w: World): void {
    this.wave = 3;
    const home = { x: 3800, y: -600 };
    for (const off of [0, 1]) {
      const g = w.spawn({
        kind: 'gnat', side: 'enemy', role: 'fighter', x: 3000 + off * 40, y: -200 + off * 50,
        heading: 250 * DEG, speed: 420,
        ai: new FighterAI({ prefer: 'escortee', home, skill: 0.5 }),
        tag: 'B',
      });
      this.gnats.push(g);
    }
    w.radio.say(t('who.control'), t('s2.gnats'));
  }

  /** Raid C: one Canberra from the north-west with a Mystère on each side. */
  private spawnWaveC(w: World): void {
    this.wave = 4;
    const home = { x: -3000, y: -3600 };
    const ai = new BomberAI(BASE, home, 340);
    const b = w.spawn({
      kind: 'canberra', side: 'enemy', role: 'bomber', x: -2200, y: -2300,
      heading: 135 * DEG, speed: 340, ai, tag: 'C',
    });
    this.bombAI.set(b.id, ai);
    this.bombers.push(b);
    for (const side of [-1, 1] as const) {
      w.spawn({
        kind: 'mystere', side: 'enemy', role: 'fighter', x: -2200 + side * 50, y: -2350,
        heading: 135 * DEG, speed: 340,
        ai: new FighterAI({ prefer: 'player', escortId: b.id, home, skill: 0.65, escortSide: side }),
        tag: 'C',
      });
    }
    w.radio.say(t('who.control'), t('s2.raidC'));
  }
}
