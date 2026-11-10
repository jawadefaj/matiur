// Types shared by the simulation: aircraft records, the AI controller
// interface and the GameEvent list that sorties and scenes react to.
import type { AircraftKind } from '../data/tuning';
import type { FlightInput, FlightSpec, FlightState } from '../systems/flight/FlightModel';
import type { Guns } from '../systems/combat/Guns';
import type { World } from './World';

/** Team. Bullets only hit across the enemy / non-enemy line, so 'player' and 'friendly' are one team. */
export type Side = 'player' | 'friendly' | 'enemy';
/** Aircraft type: a key of tuning.aircraft. */
export type Kind = AircraftKind;
/** Job in the sortie. Together with side it picks the default guns (World.spawn). */
export type Role = 'player' | 'wingman' | 'fighter' | 'bomber' | 'escortee';
/**
 * active: flying the mission. brokenOff: leaving the area, either hit and
 * trailing smoke (no explosions, by design) or out of combat fuel.
 * gone: left the area. landed: reached its airfield.
 */
export type Status = 'active' | 'brokenOff' | 'gone' | 'landed';

/** One step of controls: set from World.controls for the player, by the AI otherwise. */
export interface AircraftInput extends FlightInput {
  /** Trigger held this step. */
  fire: boolean;
}

/** A pilot. World.step calls update() each step while the aircraft is active or broken off. */
export interface AI {
  update(self: Aircraft, world: World, dt: number): void;
}

export interface Aircraft {
  id: number;
  kind: Kind;
  side: Side;
  role: Role;
  callsign: string;
  /** Live flight state: position (px), heading (rad), speed (kt), altitude (ft). */
  f: FlightState;
  /** Flight limits: the tuning.aircraft entry for `kind`. */
  spec: FlightSpec;
  /** Hit radius for bullets, px. */
  radius: number;
  /** Other aircraft break off at 0. The player's jet uses World.damage instead. */
  hp: number;
  maxHp: number;
  status: Status;
  input: AircraftInput;
  /** null = unarmed. */
  guns: Guns | null;
  /** null for the player, whose input comes from World.controls. */
  ai: AI | null;
  /** Bullets pass through (Sherdil Two is spawned this way). */
  invulnerable: boolean;
  /** 0..1 smoke trail strength (visual). */
  smoke: number;
  /** Seconds since breaking off. */
  brokenTime: number;
  /** Free-form tag for sortie scripts (e.g. 'waveA'). */
  tag: string;
}

/**
 * Things that happened during a step. World, the AIs and sortie scripts push
 * them; Sortie.update reacts to them, then FlightScene drains them for effects.
 */
export type GameEvent =
  | { type: 'hit'; id: number; x: number; y: number }
  | { type: 'brokeOff'; id: number }
  // An undamaged enemy left the fight because its combat fuel ran out.
  | { type: 'disengaged'; id: number }
  | { type: 'playerHit'; x: number; y: number }
  // The player lost an airframe pip; `pips` is how many are left.
  | { type: 'pipLost'; pips: number }
  | { type: 'friendlyHit'; id: number; x: number; y: number }
  | { type: 'escorteeLost'; id: number }
  // An escorted friendly reached its airfield.
  | { type: 'landed'; id: number }
  // A bomber reached its target; x, y is the target point.
  | { type: 'baseHit'; id: number; x: number; y: number }
  // Sortie 3: the player crashed or was intercepted.
  | { type: 'crash'; x: number; y: number };
