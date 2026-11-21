// The flight mechanic's descriptor: top-down jet flying (the 1965 sorties,
// which stand in for the flight chapters (4, 5, 11) until their own levels exist).
// Every level has the same controls and HUD (design/design.md, Flight > Controls);
// guns fire on their own, so the mechanic has no settings.
// Phaser-free, so the game definition and tests can import it. The scenes are in runtime.ts.
import { defineMechanic } from '../../core/define';
import { t } from '../../core/i18n';
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
    return { title: t('flight.sortieTitle', { n: p.sortie, title: s?.title ?? '?' }), nextLabel: t('flight.flySortie', { n: p.sortie }) };
  },
});

export default flight;
