// Typed access to tuning.json. All gameplay numbers live in the JSON, not in code.
import raw from './tuning.json';

export type Tuning = typeof raw;
export type AircraftKind = keyof Tuning['aircraft'];
export type GunKind = keyof Tuning['guns'];

export const tuning: Tuning = raw;
