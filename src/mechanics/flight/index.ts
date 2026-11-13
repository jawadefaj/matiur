// The flight mechanic's descriptor: top-down jet flying (Episode 2's sorties;
// later Episode 4 phase 3). Phaser-free, so the game definition and tests can
// import it. The scenes are in runtime.ts.
import { defineMechanic } from '../../core/define';
import { SORTIE_LIST, type SortieNum } from './sortie';

/** What a flight level step sets. */
export interface FlightParams {
  /** Which sortie to fly (src/mechanics/flight/sortie/). */
  sortie: SortieNum;
}

const isSortie = (n: unknown): n is SortieNum => SORTIE_LIST.some((s) => s.num === n);

export const flight = defineMechanic<FlightParams>({
  id: 'flight',
  parseParams: (q) => {
    const n = Number(q.get('sortie'));
    return isSortie(n) ? { sortie: n } : null;
  },
  validate: (p) => (isSortie(p.sortie) ? null : `no sortie ${p.sortie}; sorties are ${SORTIE_LIST.map((s) => s.num).join(', ')}`),
  describe: (p) => {
    const s = SORTIE_LIST.find((x) => x.num === p.sortie);
    return { title: `Sortie ${p.sortie}: ${s?.title ?? '?'}`, nextLabel: `FLY SORTIE ${p.sortie}` };
  },
  // Guns fire on their own when the sight is on target, or only while FIRE is held.
  settings: [{ key: 'gunsMode', label: 'GUNS', values: ['auto', 'hold'], default: 'auto' }],
});

export default flight;
