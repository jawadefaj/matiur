// The sortie registry: the menu's list of sorties and a factory that
// FlightScene and the bot-pilot tests use to create one by number.
import { t } from '../../../core/i18n';
import type { Sortie } from './Sortie';
import { Sortie1Scramble } from './Sortie1Scramble';
import { Sortie2Intercept } from './Sortie2Intercept';
import { Sortie3LowAndHome } from './Sortie3LowAndHome';

export type SortieNum = 1 | 2 | 3;

/** Menu entries: each sortie's title and what it teaches. */
export const SORTIE_LIST: { num: SortieNum; title: string; teaches: string }[] = [
  { num: 1, title: t('s1.title'), teaches: 'Take-off, steering, throttle, formation' },
  { num: 2, title: t('s2.title'), teaches: 'Gunsight, G, protecting others' },
  { num: 3, title: t('s3.title'), teaches: 'Low-level flying, fuel, landing' },
];

/** A new, not yet set up sortie. The caller runs setup() with a fresh World. */
export function makeSortie(n: SortieNum): Sortie {
  if (n === 1) return new Sortie1Scramble();
  if (n === 2) return new Sortie2Intercept();
  return new Sortie3LowAndHome();
}
