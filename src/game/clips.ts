// Which video file a scene plays. Real clips go in assets/videos/ named after
// the scene (e.g. ch01_childhood.mp4) and are picked up on their own. Until a
// scene's clip exists, the dummy clip of the nearest length plays instead.
import { VIDEOS } from '../core/media/content';

/** The dummy clips in assets/videos/, by length in seconds. */
export type DummyLength = 15 | 30 | 60;

/** `name` if assets/videos/<name>.mp4 (or .webm) exists, else demo-<seconds>sec. */
export function clip(name: string, seconds: DummyLength): string {
  return VIDEOS[name] ? name : `demo-${seconds}sec`;
}
