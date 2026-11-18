// The walk level registry: the menu's list and a factory that WalkScene and
// the tests use to create a level by id.
import { FlightLine } from './FlightLine';
import type { WalkLevel } from '../WalkLevel';

export type WalkLevelId = 'flightline';

export const WALK_LIST: { id: WalkLevelId; title: string; teaches: string }[] = [
  { id: 'flightline', title: 'The Flight Line', teaches: 'Walk, talk, reach your jet' },
];

/** A new, not yet set up level. The caller runs setup() on a fresh WalkWorld built from level.map(). */
export function makeWalkLevel(id: WalkLevelId): WalkLevel {
  switch (id) {
    case 'flightline':
      return new FlightLine();
  }
}
