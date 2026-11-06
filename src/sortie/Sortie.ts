// Base class for an Episode 2 sortie: objectives, markers, terrain and
// the shared failure rules (airframe lost, blackout, flameout).
import { tuning } from '../data/tuning';
import type { Obstacle } from '../systems/flight/LowLevel';
import type { World } from '../sim/World';

export interface Point {
  x: number;
  y: number;
}

export interface Objective {
  id: string;
  label: string;
  state: 'pending' | 'active' | 'done' | 'failed';
  progress?: string;
}

export interface Marker {
  x: number;
  y: number;
  r: number;
  kind: 'waypoint' | 'base' | 'slot' | 'runway';
  label: string;
  /** Heading for 'slot' ghosts. */
  heading?: number;
}

export interface Airfield {
  name: string;
  x: number;
  y: number;
  /** Runway length (north–south), px. */
  length: number;
  width: number;
}

export interface Line {
  points: Point[];
  width: number;
}

export interface Cloud {
  x: number;
  y: number;
  variant: number;
}

export interface TerrainSpec {
  ground: 'farmland' | 'plains';
  rivers: Line[];
  roads: Line[];
  airfields: Airfield[];
  villages: Point[];
  obstacles: Obstacle[];
  clouds: Cloud[];
}

export type FailKind = 'damage' | 'blackout' | 'fuel' | 'other';

export function emptyTerrain(): TerrainSpec {
  return { ground: 'farmland', rivers: [], roads: [], airfields: [], villages: [], obstacles: [], clouds: [] };
}

export abstract class Sortie {
  abstract readonly num: 1 | 2 | 3;
  abstract readonly title: string;
  abstract readonly place: string;
  readonly date = 'September 1965';

  objectives: Objective[] = [];
  status: 'running' | 'complete' | 'failed' = 'running';
  failReason = '';
  failKind: FailKind = 'other';
  /** One-line instruction shown under the HUD. */
  hint = '';
  markers: Marker[] = [];
  terrain: TerrainSpec = emptyTerrain();
  /** Low-level mode: altitude gauge, PULL climbs. */
  lowLevel = false;
  /** Seconds until a checkpoint restart (soft failure); 0 = none. */
  restartIn = 0;
  restartReason = '';
  restarts = 0;
  /** Set after a checkpoint restore; the UI shows a "tap to continue" card. */
  justRestored = false;
  elapsed = 0;

  private bingoCalled = false;
  private hitCalled = false;
  private breakLines = 0;

  abstract setup(w: World): void;
  protected abstract script(w: World, dt: number): void;

  /** True while the world should not advance (restart pause or sortie over). */
  get freezeWorld(): boolean {
    return this.restartIn > 0 || this.status === 'failed';
  }

  update(w: World, dt: number): void {
    if (this.status !== 'running') return;
    if (this.restartIn > 0) {
      this.restartIn -= dt;
      if (this.restartIn <= 0) {
        this.restartIn = 0;
        this.restoreCheckpoint(w);
        this.justRestored = true;
      }
      return;
    }
    this.elapsed += dt;
    this.reactToEvents(w);
    this.climbAfterTakeoff(w, dt);
    this.checkCommonFailures(w);
    if (this.status === 'running') this.script(w, dt);
  }

  /** Override in sorties that have checkpoints. */
  protected restoreCheckpoint(_w: World): void {}

  protected softFail(reason: string): void {
    this.restartIn = 2.2;
    this.restartReason = reason;
    this.restarts++;
  }

  obj(id: string): Objective {
    const o = this.objectives.find((x) => x.id === id);
    if (!o) throw new Error(`No objective ${id}`);
    return o;
  }

  setObj(id: string, state: Objective['state'], progress?: string): void {
    const o = this.obj(id);
    if (o.state === 'failed' && state !== 'failed') return;
    o.state = state;
    if (progress !== undefined) o.progress = progress;
  }

  complete(): void {
    if (this.status === 'running') this.status = 'complete';
  }

  fail(reason: string, kind: FailKind = 'other'): void {
    if (this.status !== 'running') return;
    this.status = 'failed';
    this.failReason = reason;
    this.failKind = kind;
  }

  private climbAfterTakeoff(w: World, dt: number): void {
    const f = w.player.f;
    const cruise = tuning.takeoff.cruiseAltitude;
    if (!this.lowLevel && f.airborne && f.altitude < cruise) {
      f.altitude = Math.min(cruise, f.altitude + tuning.takeoff.climbRate * dt);
    }
  }

  private reactToEvents(w: World): void {
    const lines = ["He's hit! Smoking and breaking off.", 'Good hits, One. He\'s turning for home.', "That one's out of the fight."];
    for (const e of w.events) {
      if (e.type === 'brokeOff') {
        const said = w.radio.say('Sherdil Two', lines[this.breakLines % lines.length], { key: 'brk', cooldown: 3 });
        if (said) this.breakLines++;
      } else if (e.type === 'disengaged') {
        w.radio.say('Sherdil Two', "That one's low on fuel. He's breaking off for home.", { key: 'bingoE', cooldown: 4 });
      } else if (e.type === 'pipLost') {
        const text = e.pips === 1 ? "One, you're badly hit! Get out of the fight!" : "One, you're hit! Airframe damage.";
        w.radio.say('Sherdil Two', text, { urgent: true });
      } else if (e.type === 'playerHit' && !this.hitCalled) {
        this.hitCalled = true;
        w.radio.say('Sherdil Two', 'Taking hits, One! Shake him!', { key: 'hit1', urgent: true });
      }
    }
  }

  private checkCommonFailures(w: World): void {
    if (w.damage.destroyed) {
      this.fail('Your Sabre was too badly damaged to fly. You ejected safely.', 'damage');
    } else if (w.gmeter.blackout) {
      this.fail('You blacked out (G-LOC). Ease off PULL at high speed, or slow down first.', 'blackout');
    } else if (!this.lowLevel && w.flameoutTime > tuning.fuel.flameoutGrace) {
      this.fail('Flameout: the tanks ran dry. Throttle back to save fuel.', 'fuel');
    }
    if (!this.bingoCalled && w.fuel.bingo) {
      this.bingoCalled = true;
      w.radio.say('Sherdil Two', 'Bingo fuel, One. Watch your throttle.', { key: 'bingo' });
    }
  }
}
