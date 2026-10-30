/**
 * The founder's backflip, triggered from the on-screen button (or the B key).
 * Pure timing maths so it can be unit tested; Guide.tsx applies the pose to
 * the whole character, so it works for a static (unrigged) model too.
 */

/** Crouch, take off, rotate a full turn backwards, land and recover. */
export const BACKFLIP = {
  duration: 1.25,
  crouch: 0.22,
  air: 0.72,
  /** Peak height of the jump in metres. */
  height: 0.85,
  /** Height of the rotation pivot (roughly the hips/centre of mass). */
  pivot: 0.95,
} as const;

export interface FlipPose {
  /** Vertical lift of the whole body (m). */
  lift: number;
  /** Rotation about the character's local X axis (rad). Negative = backwards. */
  angle: number;
  /** Vertical squash/stretch factor (1 = neutral). */
  squash: number;
}

const LEAN = -0.1;
const REST: FlipPose = { lift: 0, angle: 0, squash: 1 };
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

/** Pose `t` seconds after the flip started. Outside 0..duration it is the rest pose. */
export function backflipPose(t: number): FlipPose {
  if (!(t >= 0) || t >= BACKFLIP.duration) return REST;
  const { crouch, air, height } = BACKFLIP;
  if (t < crouch) {
    // Dip down and sit back slightly to load the jump.
    const k = Math.sin((t / crouch) * Math.PI * 0.5);
    return { lift: 0, angle: LEAN * k, squash: 1 - 0.1 * k };
  }
  if (t < crouch + air) {
    const u = (t - crouch) / air;
    return { lift: 4 * height * u * (1 - u), angle: LEAN * (1 - u) - Math.PI * 2 * easeInOut(u), squash: 1 + 0.06 * Math.sin(u * Math.PI) };
  }
  // Land: absorb the impact, then stand up.
  const r = (t - crouch - air) / (BACKFLIP.duration - crouch - air);
  return { lift: 0, angle: 0, squash: 1 - 0.12 * Math.sin(r * Math.PI) };
}

export function isFlipping(t: number) {
  return t >= 0 && t < BACKFLIP.duration;
}
