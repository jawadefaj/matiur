import type { Sortie } from './Sortie';
import { Sortie1Scramble } from './Sortie1Scramble';
import { Sortie2Intercept } from './Sortie2Intercept';
import { Sortie3LowAndHome } from './Sortie3LowAndHome';

export type SortieNum = 1 | 2 | 3;

export const SORTIE_LIST: { num: SortieNum; title: string; teaches: string }[] = [
  { num: 1, title: 'Scramble', teaches: 'Take-off, steering, throttle, formation' },
  { num: 2, title: 'Intercept', teaches: 'Gunsight, G, protecting others' },
  { num: 3, title: 'Low and Home', teaches: 'Low-level flying, fuel, landing' },
];

export function makeSortie(n: SortieNum): Sortie {
  if (n === 1) return new Sortie1Scramble();
  if (n === 2) return new Sortie2Intercept();
  return new Sortie3LowAndHome();
}
