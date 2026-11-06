import type { AircraftKind } from '../data/tuning';
import type { FlightInput, FlightSpec, FlightState } from '../systems/flight/FlightModel';
import type { Guns } from '../systems/combat/Guns';
import type { World } from './World';

export type Side = 'player' | 'friendly' | 'enemy';
export type Kind = AircraftKind;
export type Role = 'player' | 'wingman' | 'fighter' | 'bomber' | 'escortee';
/**
 * active: flying the mission. brokenOff: hit, trailing smoke, leaving the area
 * (no explosions, by design). gone: left the area. landed: reached its airfield.
 */
export type Status = 'active' | 'brokenOff' | 'gone' | 'landed';

export interface AircraftInput extends FlightInput {
  fire: boolean;
}

export interface AI {
  update(self: Aircraft, world: World, dt: number): void;
}

export interface Aircraft {
  id: number;
  kind: Kind;
  side: Side;
  role: Role;
  callsign: string;
  f: FlightState;
  spec: FlightSpec;
  radius: number;
  hp: number;
  maxHp: number;
  status: Status;
  input: AircraftInput;
  guns: Guns | null;
  ai: AI | null;
  invulnerable: boolean;
  /** 0..1 smoke trail strength (visual). */
  smoke: number;
  /** Seconds since breaking off. */
  brokenTime: number;
  /** Free-form tag for sortie scripts (e.g. 'waveA'). */
  tag: string;
}

export type GameEvent =
  | { type: 'hit'; id: number; x: number; y: number }
  | { type: 'brokeOff'; id: number }
  | { type: 'disengaged'; id: number }
  | { type: 'playerHit'; x: number; y: number }
  | { type: 'pipLost'; pips: number }
  | { type: 'friendlyHit'; id: number; x: number; y: number }
  | { type: 'escorteeLost'; id: number }
  | { type: 'landed'; id: number }
  | { type: 'baseHit'; id: number; x: number; y: number }
  | { type: 'crash'; x: number; y: number };
