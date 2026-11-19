// Sortie 1 — Scramble. Take off, join Sherdil Two, fly a short patrol.
// Doubles as the tutorial: steering, throttle, formation, PULL and G.
import { t } from '../../../core/i18n';
import { tuning } from '../tuning';
import { DEG, angleDiff, dist, rotateOffset } from '../../../core/math';
import { WingmanAI } from '../systems/ai/AI';
import type { Aircraft } from '../sim/types';
import type { World } from '../sim/World';
import { Sortie, type Point } from './Sortie';
import { PESHAWAR, farmlandTerrain } from './terrain';

/** Seconds the player must hold the slot to complete the join. */
const JOIN_SECONDS = 3;
const SLOT = { x: -34, y: 22 }; // left wing of Sherdil Two

export class Sortie1Scramble extends Sortie {
  readonly num = 1 as const;
  readonly title = t('s1.title');
  readonly place = t('s1.place');

  /** Runs in order: takeoff, join, patrol, rtb (return to base). */
  private stage: 'takeoff' | 'join' | 'patrol' | 'rtb' = 'takeoff';
  /** Sherdil Two leads a loop north of the field until the join, then flies on the player's wing. */
  private two!: Aircraft;
  private twoAI = new WingmanAI();
  /** Seconds held in the slot; drains at half speed when out of it. */
  private joinTime = 0;
  /** Index of the next patrol point. */
  private wp = 0;
  private readonly patrol: Point[] = [
    { x: 1300, y: -3000 },
    { x: -500, y: -4300 },
    { x: -1500, y: -2200 },
  ];

  setup(w: World): void {
    this.terrain = farmlandTerrain(11);
    // Start at rest near the south end of the runway, facing north (runway three-six).
    w.spawn({
      kind: 'sabre', side: 'player', role: 'player', callsign: 'Sherdil One',
      x: PESHAWAR.x, y: PESHAWAR.y + PESHAWAR.length / 2 - 30, heading: 0,
      speed: 0, throttle: 0, altitude: 0, airborne: false,
    });
    w.controls.throttle = 0;
    w.allowPlayerGuns = false;

    // No threat calls or chasing in the tutorial; Two loops a route north of the field.
    this.twoAI.calls = false;
    this.twoAI.canEngage = false;
    this.twoAI.setRoute(
      [{ x: 0, y: -1300 }, { x: 0, y: -3300 }, { x: 800, y: -3300 }, { x: 800, y: -1300 }],
      300,
    );
    this.two = w.spawn({
      kind: 'sabre', side: 'friendly', role: 'wingman', callsign: 'Sherdil Two',
      x: 0, y: -1800, heading: 0, speed: 300, ai: this.twoAI, invulnerable: true,
    });

    this.objectives = [
      { id: 'takeoff', label: t('s1.obj.takeoff'), state: 'active' },
      { id: 'join', label: t('s1.obj.join'), state: 'pending' },
      { id: 'patrol', label: t('s1.obj.patrol'), state: 'pending', progress: '0/3' },
      { id: 'rtb', label: t('s1.obj.rtb'), state: 'pending' },
    ];
    w.radio.say(t('who.tower'), t('s1.cleared'));
    w.radio.say(t('who.tower'), t('s1.slideThrottle'));
  }

  protected script(w: World, dt: number): void {
    const p = w.player;
    switch (this.stage) {
      case 'takeoff': {
        this.hint = t('s1.hint.takeoff');
        this.markers = [];
        // Lift off at takeoff.rotateSpeed (kt). Sortie.climbAfterTakeoff then handles the climb.
        if (!p.f.airborne && p.f.speed >= tuning.takeoff.rotateSpeed) p.f.airborne = true;
        if (p.f.airborne) {
          this.setObj('takeoff', 'done');
          this.setObj('join', 'active');
          this.stage = 'join';
          w.radio.say(t('who.tower'), t('s1.airborne'));
          w.radio.say(t('who.sherdilTwo'), t('s1.twoNorth'));
          w.radio.say(t('who.sherdilTwo'), t('s1.dragToSteer'));
        }
        break;
      }
      case 'join': {
        const off = rotateOffset(SLOT.x, SLOT.y, this.two.f.heading);
        const sx = this.two.f.x + off.x;
        const sy = this.two.f.y + off.y;
        this.markers = [{ x: sx, y: sy, r: 16, kind: 'slot', label: 'JOIN', heading: this.two.f.heading }];
        const dd = dist(p.f.x, p.f.y, sx, sy);
        const hErr = Math.abs(angleDiff(p.f.heading, this.two.f.heading));
        const inSlot = dd < 18 && hErr < 25 * DEG;
        this.joinTime = inSlot ? this.joinTime + dt : Math.max(0, this.joinTime - dt * 0.5);
        this.setObj('join', 'active', `${Math.round((this.joinTime / JOIN_SECONDS) * 100)}%`);
        this.hint = dd > 220 ? t('s1.hint.catchUp') : inSlot ? t('s1.hint.hold') : t('s1.hint.slide');

        // Throttle coaching. `along` is px the slot lies ahead of the player along
        // Two's heading; negative means the player has passed it.
        if (dd < 320) {
          const h = this.two.f.heading;
          const along = (sx - p.f.x) * Math.sin(h) - (sy - p.f.y) * Math.cos(h);
          if (along < -20 && p.f.speed > this.two.f.speed + 15) {
            w.radio.say(t('who.sherdilTwo'), t('s1.overshoot'), { key: 'fast', cooldown: 6 });
          } else if (along > 90 && p.f.speed < this.two.f.speed + 10) {
            w.radio.say(t('who.sherdilTwo'), t('s1.moreThrottle'), { key: 'slow', cooldown: 6 });
          }
        }
        if (this.joinTime >= JOIN_SECONDS) {
          this.setObj('join', 'done', '');
          this.setObj('patrol', 'active');
          this.stage = 'patrol';
          // The player now leads; Two takes the right wing.
          this.twoAI.mode = 'form';
          this.twoAI.slot = { x: 34, y: 22 };
          w.radio.say(t('who.sherdilTwo'), t('s1.goodJoin'));
          w.radio.say(t('who.sherdilTwo'), t('s1.flyPatrol'));
        }
        break;
      }
      case 'patrol': {
        const wpt = this.patrol[this.wp];
        this.markers = [{ x: wpt.x, y: wpt.y, r: 140, kind: 'waypoint', label: `CAP ${this.wp + 1}` }];
        this.hint = t('s1.hint.patrol', { n: this.wp + 1 });
        if (dist(p.f.x, p.f.y, wpt.x, wpt.y) < 140) {
          this.wp++;
          this.setObj('patrol', 'active', `${this.wp}/3`);
          if (this.wp === 1) {
            w.radio.say(t('who.sherdilTwo'), t('s1.point1'));
          } else if (this.wp === 2) {
            w.radio.say(t('who.sherdilTwo'), t('s1.gmeter'));
            w.radio.say(t('who.sherdilTwo'), t('s1.sevenG'));
          } else {
            this.setObj('patrol', 'done');
            this.setObj('rtb', 'active');
            this.stage = 'rtb';
            w.radio.say(t('who.control'), t('s1.patrolComplete'));
          }
        }
        break;
      }
      case 'rtb': {
        this.markers = [{ x: PESHAWAR.x, y: PESHAWAR.y, r: 260, kind: 'base', label: 'BASE' }];
        this.hint = t('s1.obj.rtb');
        if (dist(p.f.x, p.f.y, PESHAWAR.x, PESHAWAR.y) < 260) {
          this.setObj('rtb', 'done');
          w.radio.say(t('who.tower'), t('s1.welcomeHome'));
          this.complete();
        }
        break;
      }
    }
  }
}
