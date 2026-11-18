// Checks the game definition at boot (and in tests/game/definition.test.ts):
// unique ids, known mechanics, valid level params. Pure.
import type { EpisodeDef, MechanicDescriptor } from '../contracts';
import { TITLE_STEP } from './Flow';

/**
 * Every problem found, as readable sentences; empty if the definition is fine.
 * `runtimeIds` are the mechanics that have scenes (src/mechanics/<id>/runtime.ts).
 */
export function validateGame(
  episodes: EpisodeDef[],
  descriptors: Record<string, MechanicDescriptor>,
  runtimeIds?: string[],
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const numbers = new Set<number>();
  for (const e of episodes) {
    if (ids.has(e.id)) errors.push(`Two episodes have the id "${e.id}".`);
    if (numbers.has(e.number)) errors.push(`Two episodes have the number ${e.number}.`);
    if (e.id.includes('/')) errors.push(`Episode id "${e.id}" may not contain "/".`);
    ids.add(e.id);
    numbers.add(e.number);
  }
  for (const e of episodes) {
    if (e.unlock !== 'always' && !ids.has(e.unlock.after)) {
      errors.push(`${e.id} unlocks after "${e.unlock.after}", which is not an episode.`);
    }
    if (e.steps.length === 0) errors.push(`${e.id} has no steps.`);
    const stepIds = new Set<string>();
    for (const s of e.steps) {
      const where = `${e.id}/${s.id}`;
      if (!s.id || s.id.includes('/')) errors.push(`${where}: a step id must be non-empty and may not contain "/".`);
      if (stepIds.has(s.id)) errors.push(`${where}: two steps in ${e.id} have this id.`);
      if (e.titleCard && s.id === TITLE_STEP) errors.push(`${where}: "${TITLE_STEP}" is the title card's id; pick another.`);
      stepIds.add(s.id);
      if (s.kind === 'level') {
        const d = descriptors[s.mechanic];
        if (!d) {
          errors.push(`${where}: no mechanic "${s.mechanic}" (looked in src/mechanics/*/index.ts).`);
          continue;
        }
        if (runtimeIds && !runtimeIds.includes(s.mechanic)) errors.push(`${where}: mechanic "${s.mechanic}" has no runtime.ts.`);
        const problem = d.validate(s.params);
        if (problem) errors.push(`${where}: ${problem}`);
      } else if (s.kind === 'video' && !s.src) {
        errors.push(`${where}: video step needs a src.`);
      } else if (s.kind === 'cutscene' && !s.script) {
        errors.push(`${where}: cutscene step needs a script.`);
      }
    }
  }
  return errors;
}
