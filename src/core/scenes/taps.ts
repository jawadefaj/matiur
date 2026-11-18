// Tap and hold handling shared by the manager's card, video and cutscene scenes.
import Phaser from 'phaser';

export interface TapHandlers {
  /** A tap: press and release in this scene (a release left over from the previous scene is ignored). */
  tap: () => void;
  /** Called once when a press is held for `holdMs`. */
  hold?: () => void;
  holdMs?: number;
}

/**
 * Wire taps, holds and keys (Space/Enter tap, Esc holds) on `scene`.
 * Returns a function that reports how far a hold has got, 0..1, for a progress bar.
 */
export function onTaps(scene: Phaser.Scene, h: TapHandlers): () => number {
  const holdMs = h.holdMs ?? 800;
  let downAt = -1;
  let held = false;
  scene.input.on(Phaser.Input.Events.POINTER_DOWN, () => {
    downAt = scene.time.now;
    held = false;
  });
  scene.input.on(Phaser.Input.Events.POINTER_UP, () => {
    const wasDown = downAt >= 0;
    downAt = -1;
    if (wasDown && !held) h.tap();
  });
  const onUpdate = () => {
    if (downAt >= 0 && !held && h.hold && scene.time.now - downAt >= holdMs) {
      held = true;
      h.hold();
    }
  };
  // Phaser clears input listeners when a scene stops, but not scene events.
  scene.events.on(Phaser.Scenes.Events.UPDATE, onUpdate);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, onUpdate));
  const kb = scene.input.keyboard;
  kb?.on('keydown-SPACE', h.tap);
  kb?.on('keydown-ENTER', h.tap);
  if (h.hold) kb?.on('keydown-ESC', h.hold);
  return () => (downAt >= 0 && h.hold && !held ? Math.min(1, (scene.time.now - downAt) / holdMs) : 0);
}
