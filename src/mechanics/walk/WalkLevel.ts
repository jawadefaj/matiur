// Base class for an on-foot level: the map, goals, dialogue and scripted
// character moves. A level is like a sortie for walking: WalkScene draws it
// and feeds it the player's taps; the level decides what each goal needs.
import type { Objective } from '../flight/sortie/Sortie';
import type { Point, Rect, WalkEvent, WalkMap, WalkWorld } from './WalkWorld';

export type { Objective };

export interface DialogueLine {
  speaker: string;
  text: string;
}

/** How WalkScene draws a box on the map. Solid styles are also walls. */
export type BlockStyle =
  | 'grass'
  | 'tarmac'
  | 'floor'
  | 'line'
  | 'wall'
  | 'table'
  | 'locker'
  | 'hangar'
  | 'bowser'
  | 'crate'
  | 'sandbag'
  /** Not drawn: collision for something a prop draws (a parked jet). */
  | 'hidden';

export interface Block extends Rect {
  style: BlockStyle;
  /** Characters can't walk through it. */
  solid: boolean;
}

/** A picture placed on the map (drawn only; add a Block for its collision). */
export interface Prop {
  /** Texture key. */
  key: string;
  x: number;
  y: number;
}

/** A goal pointer: WalkScene draws a ring and an edge arrow when it is off-screen. */
export interface WalkMarker {
  x: number;
  y: number;
  label: string;
  /** Follow this character instead of staying at (x, y). */
  actor?: string;
}

/** What to start when the level is complete. */
export type NextScene = { scene: 'Flight'; sortie: 1 | 2 | 3 } | { scene: 'Menu' };

// -----------------------------------------------------------------------------
// Sequences: scripted moves that run over several steps, for "walk Two to his
// jet, then have him say this". Each step starts once and runs until done.

export interface Step {
  start?: (w: WalkWorld) => void;
  /** Return true when the step is finished. */
  done: (w: WalkWorld, dt: number) => boolean;
}

/** Walk an actor through these points (pathfinding around walls) and wait until they arrive. */
export function walk(id: string, ...points: Point[]): Step {
  return {
    start: (w) => {
      w.walkPath(id, points);
    },
    done: (w) => !w.isWalking(id),
  };
}

/** Wait this many seconds. */
export function wait(seconds: number): Step {
  let t = 0;
  return {
    start: () => {
      t = 0;
    },
    done: (_w, dt) => (t += dt) >= seconds,
  };
}

/** Wait until a condition holds. */
export function until(pred: (w: WalkWorld) => boolean): Step {
  return { done: (w) => pred(w) };
}

/** Do something once, straight away. */
export function act(fn: (w: WalkWorld) => void): Step {
  return { start: fn, done: () => true };
}

interface Running {
  steps: Step[];
  started: boolean;
  /** The player can't move while it runs. */
  lock: boolean;
}

// -----------------------------------------------------------------------------

export abstract class WalkLevel {
  abstract readonly id: string;
  abstract readonly title: string;
  abstract readonly place: string;
  abstract readonly date: string;

  /** Drawn boxes; solid ones become the map's walls (see buildMap). */
  blocks: Block[] = [];
  props: Prop[] = [];
  /** Background colour outside every block. */
  groundColor = 0x6b7a4a;

  objectives: Objective[] = [];
  status: 'running' | 'complete' = 'running';
  /** One-line instruction shown at the top. */
  hint = '';
  markers: WalkMarker[] = [];
  /** Lines waiting to be read; [0] is on screen. The player can't move while any are left. */
  dialogue: DialogueLine[] = [];
  /** Where to go after completion. */
  next: NextScene = { scene: 'Menu' };
  /** Shown on the end card. */
  doneText = '';

  private sequences: Running[] = [];

  /** The map: size, zones, and walls from the solid blocks. */
  abstract map(): WalkMap;
  /** Spawn the characters and set the first goal. Called once on a fresh WalkWorld. */
  abstract setup(w: WalkWorld): void;
  /** React to an event (talk, arrive, enter zone). */
  protected abstract onEvent(w: WalkWorld, e: WalkEvent): void;
  /** Per-step logic, after events. Optional. */
  protected script(_w: WalkWorld, _dt: number): void {}

  /** Map size and zones plus walls from every solid block. */
  protected buildMap(width: number, height: number, zones: WalkMap['zones']): WalkMap {
    const walls = this.blocks.filter((b) => b.solid).map(({ x, y, w, h }) => ({ x, y, w, h }));
    return { width, height, walls, zones };
  }

  /**
   * Call once per step after WalkWorld.step: handles this step's events,
   * advances running sequences, and locks the player during dialogue and
   * locking sequences.
   */
  update(w: WalkWorld, dt: number): void {
    if (this.status !== 'running') return;
    for (const e of w.drainEvents()) this.onEvent(w, e);
    this.tickSequences(w, dt);
    this.script(w, dt);
    w.locked = this.dialogue.length > 0 || this.sequences.some((s) => s.lock);
  }

  /** Queue lines of dialogue. The player reads them one tap at a time. */
  say(...lines: DialogueLine[]): void {
    this.dialogue.push(...lines);
  }

  /** The player tapped through the current line. */
  advance(): void {
    this.dialogue.shift();
  }

  /**
   * Run steps one after another. Dialogue steps wait for the player to read
   * them. `lock` holds the player still, like a short cutscene; without it the
   * player keeps walking while, say, an NPC heads somewhere.
   */
  run(steps: Step[], lock = false): void {
    this.sequences.push({ steps: [...steps], started: false, lock });
  }

  /** A step that shows lines and waits until they've all been read. */
  talk(...lines: DialogueLine[]): Step {
    return { start: () => this.say(...lines), done: () => this.dialogue.length === 0 };
  }

  /** True while any sequence is still running. */
  get busy(): boolean {
    return this.sequences.length > 0;
  }

  obj(id: string): Objective {
    const o = this.objectives.find((x) => x.id === id);
    if (!o) throw new Error(`No objective ${id}`);
    return o;
  }

  setObj(id: string, state: Objective['state']): void {
    this.obj(id).state = state;
  }

  complete(): void {
    this.status = 'complete';
  }

  private tickSequences(w: WalkWorld, dt: number): void {
    for (const s of this.sequences) {
      // Several instant steps may finish in one tick.
      while (s.steps.length > 0) {
        const step = s.steps[0];
        if (!s.started) {
          s.started = true;
          step.start?.(w);
        }
        if (!step.done(w, dt)) break;
        s.steps.shift();
        s.started = false;
      }
    }
    this.sequences = this.sequences.filter((s) => s.steps.length > 0);
  }
}
