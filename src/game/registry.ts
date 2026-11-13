// Finds every mechanic descriptor (src/mechanics/*/index.ts) and every
// episode (./episodes/*.ts) at build time, so adding one needs no edit here.
// Phaser-free: tests import this.
import type { EpisodeDef, MechanicDescriptor } from '../core/contracts';

const descriptorFiles = import.meta.glob<MechanicDescriptor>('../mechanics/*/index.ts', { eager: true, import: 'default' });
const episodeFiles = import.meta.glob<EpisodeDef>('./episodes/*.ts', { eager: true, import: 'default' });

/** Mechanic id -> descriptor. */
export const DESCRIPTORS: Record<string, MechanicDescriptor> = Object.fromEntries(
  Object.entries(descriptorFiles).map(([path, d]) => {
    const folder = path.split('/')[2];
    if (d?.id !== folder) throw new Error(`${path} must export default a descriptor with id '${folder}'`);
    return [d.id, d];
  }),
);

/** Every episode, in episode-number order. */
export const EPISODES: EpisodeDef[] = Object.entries(episodeFiles)
  .map(([path, e]) => {
    if (!e?.id) throw new Error(`${path} must export default defineEpisode({...})`);
    return e;
  })
  .sort((a, b) => a.number - b.number);
