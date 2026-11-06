// Sortie 3 — Low and Home. Damaged and short of fuel, fly home under 100 ft
// through a valley and across the plains, then land. Teaches the low-level
// flying that Episode 4 depends on.
import { tuning } from '../data/tuning';
import { DEG, angleDiff, clamp } from '../systems/math';
import { Damage } from '../systems/flight/Damage';
import { LowLevel } from '../systems/flight/LowLevel';
import type { World } from '../sim/World';
import { Sortie } from './Sortie';
import { LOW_AIRFIELD, LOW_ROUTE, corridorX, lowLevelTerrain } from './terrain';

interface Snapshot {
  x: number;
  y: number;
  heading: number;
  speed: number;
  throttle: number;
  fuel: number;
  damage: { pips: number; hits: number };
}

export class Sortie3LowAndHome extends Sortie {
  readonly num = 3 as const;
  readonly title = 'Low and Home';
  readonly place = 'Punjab plains to Peshawar';

  ll!: LowLevel;
  private stage: 'route' | 'approach' | 'rollout' = 'route';
  private cpIndex = 0;
  private snapshot!: Snapshot;
  private runwayTop = LOW_AIRFIELD.y - LOW_AIRFIELD.length / 2;
  private runwayBottom = LOW_AIRFIELD.y + LOW_AIRFIELD.length / 2;

  setup(w: World): void {
    this.lowLevel = true;
    w.lowLevel = true;
    w.allowPlayerGuns = false;
    this.terrain = lowLevelTerrain(33);
    this.ll = new LowLevel(this.terrain.obstacles);

    w.spawn({
      kind: 'sabre', side: 'player', role: 'player', callsign: 'Sherdil One',
      x: corridorX(0), y: 0, heading: 0, speed: 380, throttle: 0.5, altitude: 70,
    });
    w.controls.throttle = 0.5;
    w.fuel.pct = 32;
    w.damage = new Damage(2);
    w.player.smoke = w.damage.smoke;

    this.objectives = [
      { id: 'route', label: 'Fly home under 100 ft', state: 'active', progress: '0%' },
      { id: 'land', label: 'Land at Peshawar', state: 'pending' },
    ];
    this.saveCheckpoint(w);
    w.radio.say('Sherdil Two', "One, you're hit and leaking fuel. Stay low, under a hundred feet.");
    w.radio.say('Sherdil Two', 'Hold PULL to climb, let go to ease down. Their radar is watching above.');
    w.radio.say('Sherdil Two', 'Throttle back to stretch the fuel. Follow the valley north.');
  }

  protected script(w: World, dt: number): void {
    const p = w.player;
    const f = p.f;

    if (this.stage === 'rollout') {
      w.controls.throttle = 0;
      this.hint = 'Rolling out...';
      if (f.speed < 25) {
        this.setObj('land', 'done');
        w.radio.say('Peshawar Tower', 'Sherdil One, on the ground. Well flown.');
        this.complete();
      }
      return;
    }

    // Progress and checkpoints.
    const travelled = -f.y;
    const total = -LOW_ROUTE.runwayY;
    this.setObj('route', this.stage === 'route' ? 'active' : 'done', `${Math.round(clamp(travelled / total, 0, 1) * 100)}%`);
    const nextCp = LOW_ROUTE.checkpoints[this.cpIndex];
    if (nextCp !== undefined && travelled > nextCp) {
      this.cpIndex++;
      this.saveCheckpoint(w);
      w.radio.say('Sherdil Two', 'Checkpoint. Keep it low, One.', { key: `cp${this.cpIndex}` });
    }

    // Flare assist: lined up and slow on final, the jet holds a few feet
    // until it is over the runway, so landing is about speed and alignment.
    const onRunway = this.overRunway(f.x, f.y);
    const toThreshold = f.y - this.runwayBottom;
    const L = tuning.landing;
    if (
      this.stage === 'approach' && !onRunway && toThreshold > 0 && toThreshold < L.flareFunnel &&
      Math.abs(f.x - LOW_AIRFIELD.x) < 40 && this.landingOk(w, true) && f.altitude < L.flareAlt
    ) {
      f.altitude = L.flareAlt;
      f.vz = Math.max(0, f.vz);
    }

    // Terrain, radar and crash checks.
    const result = this.ll.update(f, dt);
    if (result === 'crash') {
      if (onRunway && this.landingOk(w)) {
        this.touchdown(w);
        return;
      }
      w.events.push({ type: 'crash', x: f.x, y: f.y });
      this.softFail(onRunway ? 'Hard landing. Slow down and line up first.' : 'You hit the ground.');
      return;
    }
    if (result === 'contact') {
      w.radio.say('Sherdil Two', "They've got you on radar! Get down before the interceptors arrive!", { urgent: true });
    } else if (result === 'cleared') {
      w.radio.say('Sherdil Two', "Good, they've lost you. Stay down.", { urgent: true });
    } else if (result === 'intercepted') {
      w.events.push({ type: 'crash', x: f.x, y: f.y });
      this.softFail('Interceptors caught you. Stay under 100 ft.');
      return;
    }
    if (this.ll.warning === 'terrain') w.radio.say('Sherdil Two', 'Pull up!', { key: 'pullup', cooldown: 4 });

    // Off the route.
    if (Math.abs(f.x - corridorX(f.y)) > LOW_ROUTE.boundary) {
      w.radio.say('Sherdil Two', "You're off the route, One. Turn back north.", { key: 'offroute', cooldown: 8 });
    }

    // Approach and landing.
    if (this.stage === 'route' && travelled > LOW_ROUTE.plainsEnd) {
      this.stage = 'approach';
      this.setObj('route', 'done');
      this.setObj('land', 'active');
      w.radio.say('Peshawar Tower', 'Sherdil One, cleared straight in, runway three-six.');
      w.radio.say('Peshawar Tower', `Line up, slow below ${tuning.landing.maxSpeed} knots, and let her settle.`);
    }
    if (this.stage === 'approach') {
      this.markers = [{ x: LOW_AIRFIELD.x, y: this.runwayBottom, r: 30, kind: 'runway', label: 'RWY' }];
      if (onRunway && f.altitude <= tuning.landing.maxAlt) {
        if (this.landingOk(w)) {
          this.touchdown(w);
          return;
        }
        if (f.speed > tuning.landing.maxSpeed) {
          w.radio.say('Peshawar Tower', 'Too fast! Throttle back and go around.', { key: 'fastland', cooldown: 6 });
        } else {
          w.radio.say('Peshawar Tower', 'Line up with the runway.', { key: 'alignland', cooldown: 6 });
        }
      }
      if (f.y < this.runwayTop - 200) {
        w.radio.say('Peshawar Tower', 'Overshot. Turn around and try again from either end.', { key: 'overshot', cooldown: 10 });
      }
      this.hint = toThreshold > 0
        ? `Land: under ${tuning.landing.maxSpeed} kt, lined up, let her sink`
        : 'Turn back to the runway';
    } else {
      this.markers = [];
      this.hint = f.altitude > tuning.lowLevel.bandHigh ? 'Too high! Let go of PULL' : 'Under 100 ft. Follow the valley north';
    }

    if (w.fuel.empty) {
      w.radio.say('Sherdil Two', "Flameout! You're gliding, One. Make it count.", { key: 'flameout' });
    }
  }

  private overRunway(x: number, y: number): boolean {
    return Math.abs(x - LOW_AIRFIELD.x) <= LOW_AIRFIELD.width / 2 + 2 && y >= this.runwayTop && y <= this.runwayBottom;
  }

  private landingOk(w: World, ignoreAltitude = false): boolean {
    const f = w.player.f;
    const err = Math.min(Math.abs(angleDiff(f.heading, 0)), Math.abs(angleDiff(f.heading, Math.PI)));
    const L = tuning.landing;
    return f.speed <= L.maxSpeed && err <= L.maxHeadingErrDeg * DEG && (ignoreAltitude || f.altitude <= L.maxAlt);
  }

  private touchdown(w: World): void {
    const f = w.player.f;
    f.airborne = false;
    f.altitude = 0;
    f.vz = 0;
    f.turnRate = 0;
    f.heading = Math.abs(angleDiff(f.heading, 0)) < Math.PI / 2 ? 0 : Math.PI;
    w.lowLevel = false;
    w.controls.throttle = 0;
    this.stage = 'rollout';
    this.markers = [];
    w.radio.say('Peshawar Tower', 'Touchdown.', { urgent: true });
  }

  private saveCheckpoint(w: World): void {
    const f = w.player.f;
    this.snapshot = {
      x: corridorX(f.y),
      y: f.y,
      heading: 0,
      speed: f.speed,
      throttle: w.controls.throttle,
      fuel: w.fuel.pct,
      damage: w.damage.snapshot(),
    };
  }

  protected restoreCheckpoint(w: World): void {
    const s = this.snapshot;
    const f = w.player.f;
    Object.assign(f, {
      x: s.x, y: s.y, heading: s.heading, speed: s.speed, throttle: s.throttle,
      altitude: 70, vz: 0, turnRate: 0, g: 1, airborne: true,
    });
    w.controls.throttle = s.throttle;
    w.controls.desiredHeading = null;
    // Never restart into a dead end: leave enough fuel to make progress.
    w.fuel.pct = Math.max(s.fuel, 12);
    w.damage.restore(s.damage);
    w.player.smoke = w.damage.smoke;
    w.gmeter.reset();
    w.flameoutTime = 0;
    w.lowLevel = true;
    w.bullets = [];
    w.radio.clear();
    this.ll.reset();
    this.stage = 'route';
    if (-s.y > LOW_ROUTE.plainsEnd) this.stage = 'approach';
    w.radio.say('Sherdil Two', 'Back on track. Low and steady, One.');
  }
}
