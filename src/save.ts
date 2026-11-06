// localStorage save, following the save shape in design/init_design.md §10.

export interface Settings {
  lang: 'en' | 'bn';
  haptics: boolean;
  /** Episode 2 guns: fire automatically on target, or hold the FIRE button. */
  gunsMode: 'auto' | 'hold';
}

export interface SaveData {
  version: 1;
  unlockedEpisodes: number[];
  ep2: { sortiesCleared: number[] };
  settings: Settings;
}

const KEY = 'wof.save';

function defaults(): SaveData {
  return {
    version: 1,
    unlockedEpisodes: [2],
    ep2: { sortiesCleared: [] },
    settings: { lang: 'en', haptics: true, gunsMode: 'auto' },
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const d = JSON.parse(raw) as Partial<SaveData>;
    const base = defaults();
    return {
      ...base,
      ...d,
      ep2: { ...base.ep2, ...d.ep2 },
      settings: { ...base.settings, ...d.settings },
    } as SaveData;
  } catch {
    return defaults();
  }
}

export function writeSave(s: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Private mode or storage full: progress just isn't kept.
  }
}

export function markSortieCleared(n: number): void {
  const s = loadSave();
  if (!s.ep2.sortiesCleared.includes(n)) s.ep2.sortiesCleared.push(n);
  writeSave(s);
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const s = loadSave();
  s.settings = { ...s.settings, ...patch };
  writeSave(s);
  cached = s.settings;
  return s.settings;
}

export function vibrate(ms: number): void {
  if (!loadSettingsCached().haptics) return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    // Not supported (iOS Safari): ignore.
  }
}

let cached: Settings | null = null;
export function loadSettingsCached(): Settings {
  if (!cached) cached = loadSave().settings;
  return cached;
}
export function refreshSettingsCache(): void {
  cached = loadSave().settings;
}
