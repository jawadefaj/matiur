// Helpers for writing the game definition (src/game/) and mechanic
// descriptors. They fill in defaults so the definition stays short.
import type {
  ArchiveCard,
  CardStep,
  CutsceneStep,
  DialogueLine,
  EpisodeDef,
  GameDef,
  MechanicDescriptor,
  SettingDef,
  StepOptions,
  VideoStep,
} from './contracts';

/** The game-wide settings. */
export function defineGame(g: Pick<GameDef, 'title'> & Partial<GameDef>): GameDef {
  return {
    subtitle: '',
    menuBackground: null,
    chapters: 'open',
    dev: { unlockAll: false, skipKey: false },
    ...g,
  };
}

/** One episode: its heading, unlock rule and steps, in play order. */
export function defineEpisode(e: Omit<EpisodeDef, 'titleCard' | 'notes'> & Partial<Pick<EpisodeDef, 'titleCard' | 'notes'>>): EpisodeDef {
  return { titleCard: true, notes: [], ...e };
}

/** A mechanic's descriptor. Adds level(), which makes typed level steps. */
export function defineMechanic<P>(
  d: Omit<MechanicDescriptor<P>, 'level' | 'settings'> & { settings?: readonly SettingDef[] },
): MechanicDescriptor<P> {
  return {
    ...d,
    settings: d.settings ?? [],
    level: (id, params, opts = {}) => ({ kind: 'level', id, mechanic: d.id, params, opts }),
  };
}

/** Play assets/video/<src>.mp4 (or .webm). */
export function video(
  id: string,
  v: { src: string; fit?: VideoStep['fit']; muted?: boolean; fallback?: string[] },
  opts: StepOptions = {},
): VideoStep {
  return { kind: 'video', id, src: v.src, fit: v.fit ?? 'contain', muted: v.muted ?? false, fallback: v.fallback, opts };
}

/** Play src/data/cutscenes/<script>.json; shows `placeholder` lines until that file exists. */
export function cutscene(id: string, c: { script: string; placeholder?: DialogueLine[] }, opts: StepOptions = {}): CutsceneStep {
  return { kind: 'cutscene', id, script: c.script, placeholder: c.placeholder, opts };
}

/** The archive card that closes an episode. */
export function archiveCard(id: string, c: Omit<ArchiveCard, 'type'>, opts: StepOptions = {}): CardStep {
  return { kind: 'card', id, card: { type: 'archive', ...c }, opts };
}
