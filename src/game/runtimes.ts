// Finds every mechanic's Phaser side (src/mechanics/*/runtime.ts) at build
// time. Kept apart from registry.ts because it pulls in Phaser; only main.ts
// imports it.
import type { MechanicRuntime } from '../core/runtime';

const runtimeFiles = import.meta.glob<MechanicRuntime>('../mechanics/*/runtime.ts', { eager: true, import: 'default' });

/** Mechanic id -> runtime. */
export const RUNTIMES: Record<string, MechanicRuntime> = Object.fromEntries(
  Object.entries(runtimeFiles).map(([path, r]) => {
    const folder = path.split('/')[2];
    if (r?.id !== folder) throw new Error(`${path} must export default a runtime with id '${folder}'`);
    return [r.id, r];
  }),
);
