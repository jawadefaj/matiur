// localStorage save: progress per episode, settings, and per-mechanic settings.
// The parsing and the migration from the v1 save are pure functions (tested
// in tests/core/save.test.ts); loadSave/writeSave add the storage.
import type { SettingValue, Stats } from './contracts';

/** Player options, changed from the menu and the pause menu. */
export interface Settings {
  /** UI language. Saved, but nothing reads it yet. */
  lang: 'en' | 'bn';
  /** Phone vibration on hits and crashes (see vibrate()). */
  haptics: boolean;
}

/** One episode's progress. Step ids are the ids in the episode file. */
export interface EpisodeProgress {
  /** Steps completed at least once. */
  completed: string[];
  /** Steps started at least once (for skippable: 'afterSeen'). */
  seen: string[];
  /** Where CONTINUE starts. Unset before the first step and after the last. */
  resume?: string;
  /** Reached the end at least once. */
  finished: boolean;
  /** Stats steps reported, keyed '<step id>.<key>'. */
  stats: Stats;
}

/** The whole save, stored as one JSON string under KEY. */
export interface SaveData {
  version: 2;
  /** Episodes opened directly (besides their unlock rule). */
  unlockedEpisodes: string[];
  episodes: Record<string, EpisodeProgress>;
  /** Archive cards reached, by cardId. */
  archiveCards: string[];
  settings: Settings;
  /** Each mechanic's settings, e.g. { flight: { gunsMode: 'hold' } }. */
  mechanics: Record<string, Record<string, SettingValue>>;
}

/** The save before the game manager (Episode 2 mechanics build). */
interface SaveV1 {
  version: 1;
  unlockedEpisodes?: number[];
  ep2?: { sortiesCleared?: number[] };
  settings?: { lang?: 'en' | 'bn'; haptics?: boolean; gunsMode?: 'auto' | 'hold' };
}

// localStorage keys. Delete them in the browser's dev tools to reset progress.
const KEY = 'wof.save';
/** A copy of the old save, written once before it is first replaced. */
const BACKUP_KEY = 'wof.save.bak';

export function defaultSave(): SaveData {
  return {
    version: 2,
    unlockedEpisodes: [],
    episodes: {},
    archiveCards: [],
    settings: { lang: 'en', haptics: true },
    mechanics: {},
  };
}

/** An episode's progress, with defaults for an episode not played yet. */
export function episodeProgress(s: SaveData, ep: string): EpisodeProgress {
  const p = s.episodes[ep];
  return {
    completed: p?.completed ?? [],
    seen: p?.seen ?? [],
    resume: p?.resume,
    finished: p?.finished ?? false,
    stats: p?.stats ?? {},
  };
}

/**
 * The v1 save as a v2 save. Episode 2's sortie numbers become the step ids
 * 'sortie-1'..'sortie-3' in src/game/episodes/ep2.sabre-skies.ts, so those
 * ids must not change. The guns setting moves to the flight mechanic.
 */
export function migrateV1(d: SaveV1): SaveData {
  const s = defaultSave();
  s.unlockedEpisodes = (d.unlockedEpisodes ?? []).map((n) => `ep${n}`);
  const cleared = d.ep2?.sortiesCleared ?? [];
  if (cleared.length) {
    s.episodes.ep2 = { ...episodeProgress(s, 'ep2'), completed: cleared.map((n) => `sortie-${n}`) };
  }
  if (d.settings?.lang) s.settings.lang = d.settings.lang;
  if (typeof d.settings?.haptics === 'boolean') s.settings.haptics = d.settings.haptics;
  if (d.settings?.gunsMode) s.mechanics.flight = { gunsMode: d.settings.gunsMode };
  return s;
}

export interface ParsedSave {
  save: SaveData;
  /** What was stored: nothing, a v1 save (migrated), a v2 save, a newer save, or something unreadable. */
  source: 'none' | 'v1' | 'v2' | 'newer' | 'corrupt';
}

/** Parse a stored save. Never throws: unreadable or newer saves give the defaults. */
export function parseSave(raw: string | null): ParsedSave {
  if (!raw) return { save: defaultSave(), source: 'none' };
  let d: unknown;
  try {
    d = JSON.parse(raw);
  } catch {
    return { save: defaultSave(), source: 'corrupt' };
  }
  if (!d || typeof d !== 'object') return { save: defaultSave(), source: 'corrupt' };
  const version = (d as { version?: unknown }).version;
  if (version === 1) return { save: migrateV1(d as SaveV1), source: 'v1' };
  if (version !== 2) return { save: defaultSave(), source: typeof version === 'number' && version > 2 ? 'newer' : 'corrupt' };
  const p = d as Partial<SaveData>;
  const base = defaultSave();
  // Fill in fields a save written by an older v2 build may lack.
  return {
    save: {
      ...base,
      ...p,
      version: 2,
      episodes: { ...p.episodes },
      settings: { ...base.settings, ...p.settings },
      mechanics: { ...p.mechanics },
    },
    source: 'v2',
  };
}

// A save from a newer build is never overwritten: this build just doesn't save.
let readOnly = false;

/**
 * Read the save from localStorage on every call (no caching). A v1 or
 * unreadable save is copied to BACKUP_KEY before anything replaces it.
 */
export function loadSave(): SaveData {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return defaultSave();
  }
  const { save, source } = parseSave(raw);
  readOnly = source === 'newer';
  if ((source === 'v1' || source === 'corrupt') && raw) {
    try {
      if (localStorage.getItem(BACKUP_KEY) === null) localStorage.setItem(BACKUP_KEY, raw);
    } catch {
      // Storage full or blocked: nothing to back up to.
    }
  }
  return save;
}

/** Store the whole save. If storage is unavailable, nothing is kept. */
export function writeSave(s: SaveData): void {
  if (readOnly) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Private mode or storage full: progress just isn't kept.
  }
}

/** Save changed settings and refresh the in-memory copy. Returns the new settings. */
export function updateSettings(patch: Partial<Settings>): Settings {
  const s = loadSave();
  s.settings = { ...s.settings, ...patch };
  writeSave(s);
  cached = s.settings;
  return s.settings;
}

/** A mechanic's saved setting, or undefined if it was never changed. */
export function mechanicSetting(mechanic: string, key: string): SettingValue | undefined {
  return loadSave().mechanics[mechanic]?.[key];
}

/** Save one setting of a mechanic. */
export function setMechanicSetting(mechanic: string, key: string, value: SettingValue): void {
  const s = loadSave();
  s.mechanics[mechanic] = { ...s.mechanics[mechanic], [key]: value };
  writeSave(s);
}

/** Vibrate the phone for `ms` milliseconds if haptics are on. Does nothing without the Vibration API. */
export function vibrate(ms: number): void {
  if (!loadSettingsCached().haptics) return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    // Not supported (iOS Safari): ignore.
  }
}

// Settings kept in memory, so vibrate() does not read localStorage during
// play. updateSettings() keeps this copy current.
let cached: Settings | null = null;
/** Settings from memory, read from storage on first use. */
export function loadSettingsCached(): Settings {
  if (!cached) cached = loadSave().settings;
  return cached;
}
/** Re-read the in-memory settings from storage. */
export function refreshSettingsCache(): void {
  cached = loadSave().settings;
}
