// Typed access to tuning.json. All gameplay numbers live in the JSON, not in code.
import raw from './tuning.json';

/** Shape of tuning.json, inferred from the file, so reading a key it lacks is a type error. */
export type Tuning = typeof raw;
/** Aircraft type names: the keys of tuning.aircraft. Each one needs art in art/pixelArt.ts. */
export type AircraftKind = keyof Tuning['aircraft'];
/** Gun spec names: the keys of tuning.guns. */
export type GunKind = keyof Tuning['guns'];

/**
 * The values in tuning.json. JSON cannot hold comments, so its sections are described here:
 * - units: pxPerKnot turns knots into world px/s; g0 is the turn acceleration (px/s²) that counts as 1 G.
 * - aircraft: FlightSpec per type (units in FlightModel.ts), hit radius (px), hp (not used for the player).
 * - takeoff: rotate speed (kt), ground acceleration multiplier, automatic climb (ft/s) to cruise altitude (ft).
 * - gmeter: when greyout and blackout start and when greyout ends (G, s), greyout turn multiplier,
 *   smoothing (G/s), strain vignette start (G). `max` is unused.
 * - fuel: burn in percent per second (idle + throttle² terms), ground multiplier, bingo (%), flameout grace (s).
 * - damage: pips, hits per pip, immunity after a lost pip (s), and per-pip handling, top speed and leak penalties.
 * - guns: player, wingman and enemy GunSpec (Guns.ts): angles in degrees, range px, bulletSpeed px/s, times s.
 * - ai: enemy fighter tactics in AI.ts (ranges px, angles degrees, chances, combatFuel s), and when
 *   broken-off jets are removed (brokenOffGoneAfter s, brokenOffGoneDist px, in World.ts).
 * - lowLevel: sortie 3 altitude band and gauge (ft), climb and sink (ft/s), radar fill and drain (per s),
 *   timers (s), terrain collision radius (px).
 * - landing: sortie 3 touchdown limits (kt, degrees, ft) and flare assist (ft, px). rolloutDecel is unused.
 * - camera: FlightScene look-ahead (px) and follow rate (per s).
 */
export const tuning: Tuning = raw;
