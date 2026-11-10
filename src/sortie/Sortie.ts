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
  /** Short text such as '2/3' or '45%', shown after the hint and in the pause menu. */
  progress?: string;
}

/** A world-space marker that FlightScene draws; the HUD adds an edge arrow when it is off-screen. */
export interface Marker {
  x: number;
  y: number;
  /** Radius, px. */
  r: number;
  kind: 'waypoint' | 'base' | 'slot' | 'runway';
  label: string;
  /** Heading for 'slot' ghosts. */
  heading?: number;
}

export interface Airfield {
  name: string;
  /** Runway centre, world px. */
  x: number;
  y: number;
  /** Runway length (north–south), px. */
  length: number;
  /** Runway width, px. */
  width: number;
}

/** A river or road: a polyline drawn `width` px wide. */
export interface Line {
  points: Point[];
  width: number;
}

export interface Cloud {
  x: number;
  y: number;
  /** Which of the cloud textures (0..2) to draw. */
  variant: number;
}

/** A sortie's map. FlightScene draws it; sortie 3 also uses `obstacles` for collisions. */
export interface TerrainSpec {
  ground: 'farmland' | 'plains';
  rivers: Line[];
  roads: Line[];
  airfields: Airfield[];
  villages: Point[];
  obstacles: Obstacle[];
  clouds: Cloud[];
}

/** Why a sortie failed. UIScene fades to black for 'blackout'. */
export type FailKind = 'damage' | 'blackout' | 'fuel' | 'other';

/** A blank farmland map, filled in by the generators in terrain.ts. */
export function emptyTerrain(): TerrainSpec {
  return { ground: 'farmland', rivers: [], roads: [], airfields: [], villages: [], obstacles: [], clouds: [] };
}

export abstract class Sortie {
  // Shown on the title card.
  abstract readonly num: 1 | 2 | 3;
  abstract readonly title: string;
  abstract readonly place: string;
  readonly date = 'September 1965';

  objectives: Objective[] = [];
  status: 'running' | 'complete' | 'failed' = 'running';
  /** Shown on the results screen. */
  failReason = '';
  failKind: FailKind = 'other';
  /** One-line instruction shown under the HUD. */
  hint = '';
  markers: Marker[] = [];
  /** Set in setup(); FlightScene builds the map from it once. */
  terrain: TerrainSpec = emptyTerrain();
  /** Low-level mode: altitude gauge, PULL climbs. */
  lowLevel = false;
  /** Seconds until a checkpoint restart (soft failure); 0 = none. */
  restartIn = 0;
  /** Shown while restarting and on the checkpoint card. */
  restartReason = '';
  /** Checkpoint restarts so far (shown on the results screen). */
  restarts = 0;
  /** Set after a checkpoint restore; the UI shows a "tap to continue" card. */
  justRestored = false;
  /** Seconds of sortie time, not counting restart pauses. */
  elapsed = 0;

  // One-time radio calls, and which break-off line to use next.
  private bingoCalled = false;
  private hitCalled = false;
  private breakLines = 0;

  /** Spawn aircraft and set up terrain, objectives and opening radio calls. Called once on a fresh World. */
  abstract setup(w: World): void;
  /** Sortie-specific logic, run each step after the shared rules while the sortie is running. */
  protected abstract script(w: World, dt: number): void;

  /** True while the world should not advance (restart pause or sortie failed). */
  get freezeWorld(): boolean {
    return this.restartIn > 0 || this.status === 'failed';
  }

  /**
   * Call once per step, after World.step and before the world's events are
   * drained: the sortie reacts to this step's events. During a restart pause
   * it only counts down, then restores the checkpoint.
   */
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

  /** A setback that costs a checkpoint, not the sortie: freeze for 2.2 s, then restore. */
  protected softFail(reason: string): void {
    this.restartIn = 2.2;
    this.restartReason = reason;
    this.restarts++;
  }

  /** Look up an objective by id; throws if there is none. */
  obj(id: string): Objective {
    const o = this.objectives.find((x) => x.id === id);
    if (!o) throw new Error(`No objective ${id}`);
    return o;
  }

  /** Set an objective's state and, optionally, its progress text. A failed objective stays failed. */
  setObj(id: string, state: Objective['state'], progress?: string): void {
    const o = this.obj(id);
    if (o.state === 'failed' && state !== 'failed') return;
    o.state = state;
    if (progress !== undefined) o.progress = progress;
  }

  complete(): void {
    if (this.status === 'running') this.status = 'complete';
  }

  /** End the sortie as failed. Only the first failure counts. */
  fail(reason: string, kind: FailKind = 'other'): void {
    if (this.status !== 'running') return;
    this.status = 'failed';
    this.failReason = reason;
    this.failKind = kind;
  }

  /**
   * Away from low level, altitude is scripted rather than flown: once airborne
   * the jet climbs at takeoff.climbRate ft/s up to takeoff.cruiseAltitude.
   */
  private climbAfterTakeoff(w: World, dt: number): void {
    const f = w.player.f;
    const cruise = tuning.takeoff.cruiseAltitude;
    if (!this.lowLevel && f.airborne && f.altitude < cruise) {
      f.altitude = Math.min(cruise, f.altitude + tuning.takeoff.climbRate * dt);
    }
  }

  /** Sherdil Two's radio reactions to this step's events. */
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

  /**
   * Failures shared by every sortie, plus the one-time bingo fuel call.
   * In low-level mode a flameout is not a failure: the jet glides down instead.
   */
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
