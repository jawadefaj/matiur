// Content found at build time: videos in assets/video/ and cutscene scripts
// in src/data/cutscenes/. Adding a file is enough; no list to edit.
import type { DialogueLine } from '../contracts';

// '?url&no-inline' keeps even tiny clips as files: iOS Safari often refuses
// a video given as a data: URL.
const VIDEO_FILES = import.meta.glob<string>('/assets/video/*.{mp4,webm}', {
  eager: true,
  query: '?url&no-inline',
  import: 'default',
});

/** File name without extension -> URL. If both .mp4 and .webm exist, .mp4 wins (it plays everywhere). */
export const VIDEOS: Record<string, string> = {};
for (const [path, url] of Object.entries(VIDEO_FILES).sort(([a], [b]) => (a.endsWith('.mp4') ? 1 : 0) - (b.endsWith('.mp4') ? 1 : 0))) {
  VIDEOS[path.slice(path.lastIndexOf('/') + 1, path.lastIndexOf('.'))] = url;
}

/** A shot in a cutscene script (GDD §6.9). Only 'line' shots are played so far. */
export interface Shot {
  type: string;
  speaker?: string;
  text?: string;
  text_key?: string;
  [k: string]: unknown;
}
export interface CutsceneScript {
  id?: string;
  shots: Shot[];
}

const SCRIPT_FILES = import.meta.glob<CutsceneScript>('/src/data/cutscenes/*.json', { eager: true, import: 'default' });

/** Script name (file name without .json) -> script. */
export const CUTSCENES: Record<string, CutsceneScript> = Object.fromEntries(
  Object.entries(SCRIPT_FILES).map(([path, s]) => [path.slice(path.lastIndexOf('/') + 1, -'.json'.length), s]),
);

/** The dialogue lines of a script. Other shot types are skipped until the full cutscene player exists. */
export function scriptLines(s: CutsceneScript): DialogueLine[] {
  return s.shots.filter((sh) => sh.type === 'line').map((sh) => ({ speaker: sh.speaker, text: sh.text ?? sh.text_key ?? '' }));
}
