// localStorage save, following the save shape in design/init_design.md §10.

/** Player options, changed from the sortie menu and the pause menu. */
export interface Settings {
  /** UI language. Saved, but nothing reads it yet. */
  lang: 'en' | 'bn';
  /** Phone vibration on hits and crashes (see vibrate()). */
  haptics: boolean;
  /** Episode 2 guns: fire automatically on target, or hold the FIRE button. */
  gunsMode: 'auto' | 'hold';
}

/** The whole save, stored as one JSON string under KEY. */
export interface SaveData {
  version: 1;
  /** Only Episode 2 exists so far; nothing reads this yet. */
  unlockedEpisodes: number[];
  /** Episode 2: the sortie numbers (1-3) completed at least once. The menu marks them DONE. */
  ep2: { sortiesCleared: number[] };
  settings: Settings;
}

// localStorage key. Delete it in the browser's dev tools to reset progress.
const KEY = 'wof.save';

function defaults(): SaveData {
  return {
    version: 1,
    unlockedEpisodes: [2],
    ep2: { sortiesCleared: [] },
    settings: { lang: 'en', haptics: true, gunsMode: 'auto' },
  };
}

/**
 * Read the save from localStorage on every call (no caching). A missing or
 * unreadable save gives the defaults, so this never throws.
 */
export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const d = JSON.parse(raw) as Partial<SaveData>;
    const base = defaults();
    return {
      ...base,
      ...d,
      // Merge the nested objects too, so a save written before a field
      // existed still gets that field's default.
      ep2: { ...base.ep2, ...d.ep2 },
      settings: { ...base.settings, ...d.settings },
    } as SaveData;
  } catch {
    return defaults();
  }
}

/** Store the whole save. If storage is unavailable, nothing is kept. */
export function writeSave(s: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Private mode or storage full: progress just isn't kept.
  }
}

/** Record Episode 2 sortie `n` as cleared. Called when a sortie is completed. */
export function markSortieCleared(n: number): void {
  const s = loadSave();
  if (!s.ep2.sortiesCleared.includes(n)) s.ep2.sortiesCleared.push(n);
  writeSave(s);
}

/** Save changed settings and refresh the in-memory copy. Returns the new settings. */
export function updateSettings(patch: Partial<Settings>): Settings {
  const s = loadSave();
  s.settings = { ...s.settings, ...patch };
  writeSave(s);
  cached = s.settings;
  return s.settings;
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
