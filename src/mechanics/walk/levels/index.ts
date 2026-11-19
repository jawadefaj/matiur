// The walk level registry: the menu's list and a factory that WalkScene and
// the tests use to create a level by id.
import { t } from '../../../core/i18n';
import { FlightLine } from './FlightLine';
import { MasroorHospital, MasroorIntercept, MasroorSchedule } from './Masroor';
import { Orchard } from './Orchard';
import type { WalkLevel } from '../WalkLevel';

export type WalkLevelId = 'flightline' | 'orchard' | 'masroor-schedule' | 'masroor-hospital' | 'masroor-intercept';

export const WALK_LIST: { id: WalkLevelId; title: string; teaches: string }[] = [
  { id: 'flightline', title: t('fl.title'), teaches: 'Walk, talk, reach your jet' },
  { id: 'orchard', title: t('orchard.title'), teaches: 'Night stealth: pick three oranges unseen' },
  { id: 'masroor-schedule', title: t('schedule.title'), teaches: 'Night stealth: stay out of the torch beams' },
  { id: 'masroor-hospital', title: t('hospital.title'), teaches: 'Night stealth past the hospital sentry' },
  { id: 'masroor-intercept', title: t('intercept.title'), teaches: 'Reach the end of the taxiway in time and signal Bluebird' },
];

/** A new, not yet set up level. The caller runs setup() on a fresh WalkWorld built from level.map(). */
export function makeWalkLevel(id: WalkLevelId): WalkLevel {
  switch (id) {
    case 'flightline':
      return new FlightLine();
    case 'orchard':
      return new Orchard();
    case 'masroor-schedule':
      return new MasroorSchedule();
    case 'masroor-hospital':
      return new MasroorHospital();
    case 'masroor-intercept':
      return new MasroorIntercept();
  }
}
