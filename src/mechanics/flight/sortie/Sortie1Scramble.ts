// Sortie 1 — Scramble. Take off, join Sherdil Two, fly a short patrol.
// Doubles as the tutorial: steering, throttle, formation, PULL and G.
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
  readonly title = 'Scramble';
  readonly place = 'PAF Base Peshawar';

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
      { id: 'takeoff', label: 'Take off', state: 'active' },
      { id: 'join', label: 'Join on Sherdil Two', state: 'pending' },
      { id: 'patrol', label: 'Fly the patrol', state: 'pending', progress: '0/3' },
      { id: 'rtb', label: 'Return to base', state: 'pending' },
    ];
    w.radio.say('Peshawar Tower', 'Sherdil One, cleared for take-off, runway three-six.');
    w.radio.say('Peshawar Tower', 'Slide the THROTTLE up to start your roll.');
  }

  protected script(w: World, dt: number): void {
    const p = w.player;
    switch (this.stage) {
      case 'takeoff': {
        this.hint = 'Slide THROTTLE up to take off';
        this.markers = [];
        // Lift off at takeoff.rotateSpeed (kt). Sortie.climbAfterTakeoff then handles the climb.
        if (!p.f.airborne && p.f.speed >= tuning.takeoff.rotateSpeed) p.f.airborne = true;
        if (p.f.airborne) {
          this.setObj('takeoff', 'done');
          this.setObj('join', 'active');
          this.stage = 'join';
          w.radio.say('Peshawar Tower', 'Sherdil One, airborne. Good luck.');
          w.radio.say('Sherdil Two', "Two here, north of the field. Join on my left wing.");
          w.radio.say('Sherdil Two', 'Drag anywhere to steer. The jet turns toward your drag.');
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
        this.hint = dd > 220 ? 'Catch up with Sherdil Two' : inSlot ? 'Hold position...' : 'Slide into the marked slot';

        // Throttle coaching. `along` is px the slot lies ahead of the player along
        // Two's heading; negative means the player has passed it.
        if (dd < 320) {
          const h = this.two.f.heading;
          const along = (sx - p.f.x) * Math.sin(h) - (sy - p.f.y) * Math.cos(h);
          if (along < -20 && p.f.speed > this.two.f.speed + 15) {
            w.radio.say('Sherdil Two', "You're overshooting, One. Throttle back.", { key: 'fast', cooldown: 6 });
          } else if (along > 90 && p.f.speed < this.two.f.speed + 10) {
            w.radio.say('Sherdil Two', 'A bit more throttle to close up.', { key: 'slow', cooldown: 6 });
          }
        }
        if (this.joinTime >= JOIN_SECONDS) {
          this.setObj('join', 'done', '');
          this.setObj('patrol', 'active');
          this.stage = 'patrol';
          // The player now leads; Two takes the right wing.
          this.twoAI.mode = 'form';
          this.twoAI.slot = { x: 34, y: 22 };
          w.radio.say('Sherdil Two', "Good join! You have the lead. I'll take your wing.");
          w.radio.say('Sherdil Two', 'Fly the patrol points. Hold PULL for a tighter turn.');
        }
        break;
      }
      case 'patrol': {
        const wpt = this.patrol[this.wp];
        this.markers = [{ x: wpt.x, y: wpt.y, r: 140, kind: 'waypoint', label: `CAP ${this.wp + 1}` }];
        this.hint = `Fly to patrol point ${this.wp + 1} of 3`;
        if (dist(p.f.x, p.f.y, wpt.x, wpt.y) < 140) {
          this.wp++;
          this.setObj('patrol', 'active', `${this.wp}/3`);
          if (this.wp === 1) {
            w.radio.say('Sherdil Two', 'Point one. Now try a hard turn: hold PULL while you steer.');
          } else if (this.wp === 2) {
            w.radio.say('Sherdil Two', 'Mind the G-meter. Past 5.5 G too long and you grey out.');
            w.radio.say('Sherdil Two', 'Seven G for more than a second and you black out.');
          } else {
            this.setObj('patrol', 'done');
            this.setObj('rtb', 'active');
            this.stage = 'rtb';
            w.radio.say('Peshawar Control', 'Sherdil flight, patrol complete. Return to base.');
          }
        }
        break;
      }
      case 'rtb': {
        this.markers = [{ x: PESHAWAR.x, y: PESHAWAR.y, r: 260, kind: 'base', label: 'BASE' }];
        this.hint = 'Return to base';
        if (dist(p.f.x, p.f.y, PESHAWAR.x, PESHAWAR.y) < 260) {
          this.setObj('rtb', 'done');
          w.radio.say('Peshawar Tower', 'Sherdil flight, welcome home.');
          this.complete();
        }
        break;
      }
    }
  }
}
