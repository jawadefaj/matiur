// Typed access to the walk mechanic's tuning.json. All gameplay numbers live in the JSON, not in code.
import raw from './tuning.json';

/** Shape of tuning.json, inferred from the file, so reading a key it lacks is a type error. */
export type WalkTuning = typeof raw;

/**
 * The values in tuning.json. JSON cannot hold comments, so they are described here:
 * - walk: on-foot scenes. speed px/s; cell is the pathfinding grid size and radius the
 *   character's collision radius (px); talkRange is how close to stand to talk, tapRadius how near a
 *   tap must land on a character (px); animFps for the walk cycle; cameraFollow per s; stickDeadZone
 *   and stickMax are drag distances (px) for walking by dragging.
 * - stealth: guards' vision cones. angle is the cone's width (degrees) and range its reach
 *   (world px); turnRate how fast a guard's look turns (degrees/s); fill and drain are detection per
 *   second while seen and unseen; nearBoost the extra fill at point-blank range; suspicious the
 *   detection level where a guard turns to look; nightRange multiplies every range in a night level;
 *   guardSpeed is a patrolling guard's walking speed (px/s).
 */
export const tuning: WalkTuning = raw;
