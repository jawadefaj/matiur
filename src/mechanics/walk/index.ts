// The walk mechanic's descriptor: on-foot scenes where the player walks and
// talks (Episode 2's flight line; later Episode 4 phase 1). Phaser-free, so the
// game definition and tests can import it. The scene is in runtime.ts.
import { defineMechanic } from '../../core/define';
import { WALK_LIST, type WalkLevelId } from './levels';

/** What a walk level step sets. */
export interface WalkParams {
  /** Which walk level to play (src/mechanics/walk/levels/). */
  map: WalkLevelId;
}

const find = (id: unknown) => WALK_LIST.find((l) => l.id === id);

export const walk = defineMechanic<WalkParams>({
  id: 'walk',
  parseParams: (q) => {
    const l = find(q.get('map'));
    return l ? { map: l.id } : null;
  },
  validate: (p) => (find(p.map) ? null : `no walk map "${p.map}"; maps are ${WALK_LIST.map((l) => l.id).join(', ')}`),
  describe: (p) => {
    const title = find(p.map)?.title ?? p.map;
    return { title, nextLabel: `ON FOOT: ${title.toUpperCase()}` };
  },
});

export default walk;
