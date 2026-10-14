import { resolveCircle } from "./collision";
import type { Box, Vec2 } from "./types";

export interface MoveState {
  position: Vec2;
  velocity: Vec2;
  heading: number;
}

export interface MoveIntent {
  /** Desired direction in world space; length 0..1 scales speed (analog joystick). */
  direction: Vec2;
  sprint: boolean;
}

export const MOVE_TUNING = {
  walkSpeed: 3.0,
  sprintSpeed: 5.0,
  /** m/s² — how quickly the avatar reaches target speed. */
  acceleration: 16,
  deceleration: 20,
  /** rad/s — max turn rate of the visual heading. */
  turnRate: 10,
};

export function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function headingFromDirection(d: Vec2): number {
  return Math.atan2(d.x, d.z);
}

/** Camera-relative input → world direction. forward = (sin yaw, cos yaw). */
export function cameraRelative(forwardInput: number, rightInput: number, cameraYaw: number): Vec2 {
  const fx = Math.sin(cameraYaw);
  const fz = Math.cos(cameraYaw);
  // Screen-right for a camera looking along (fx, fz) with Y up.
  const rx = -fz;
  const rz = fx;
  const x = fx * forwardInput + rx * rightInput;
  const z = fz * forwardInput + rz * rightInput;
  const len = Math.hypot(x, z);
  if (len > 1) return { x: x / len, z: z / len };
  return { x, z };
}

/**
 * Advance one simulation step: accelerate toward the intended velocity,
 * integrate, resolve collisions and turn the heading toward travel direction.
 */
export function stepMovement(
  s: MoveState,
  intent: MoveIntent,
  dt: number,
  colliders: readonly Box[],
  radius: number,
  tuning = MOVE_TUNING,
): MoveState {
  if (!(dt > 0)) return s; // zero/invalid frame time (first frame, paused clock)
  const dtc = Math.min(dt, 1 / 20); // clamp after tab switches / hitches
  const speed = intent.sprint ? tuning.sprintSpeed : tuning.walkSpeed;
  const mag = Math.min(1, Math.hypot(intent.direction.x, intent.direction.z));
  const targetVx = intent.direction.x * speed;
  const targetVz = intent.direction.z * speed;

  const rate = mag > 0.01 ? tuning.acceleration : tuning.deceleration;
  const dvx = targetVx - s.velocity.x;
  const dvz = targetVz - s.velocity.z;
  const dvLen = Math.hypot(dvx, dvz);
  const maxDv = rate * dtc;
  const k = dvLen > maxDv ? maxDv / dvLen : 1;
  let vx = s.velocity.x + dvx * k;
  let vz = s.velocity.z + dvz * k;

  const desired = { x: s.position.x + vx * dtc, z: s.position.z + vz * dtc };
  const resolved = resolveCircle(desired, radius, colliders);

  // Velocity after collision = actual displacement (enables wall sliding).
  vx = (resolved.x - s.position.x) / dtc;
  vz = (resolved.z - s.position.z) / dtc;

  let heading = s.heading;
  const horizontalSpeed = Math.hypot(vx, vz);
  if (mag > 0.01 && horizontalSpeed > 0.05) {
    const target = headingFromDirection(intent.direction);
    const diff = wrapAngle(target - heading);
    const maxTurn = tuning.turnRate * dtc;
    heading = wrapAngle(heading + Math.max(-maxTurn, Math.min(maxTurn, diff)));
  }

  return { position: resolved, velocity: { x: vx, z: vz }, heading };
}

/** Steering toward the next waypoint for click-to-move; returns null on arrival. */
export function followPath(
  position: Vec2,
  path: Vec2[],
  arriveRadius = 0.12,
): { direction: Vec2; remaining: Vec2[] } | null {
  const remaining = [...path];
  while (remaining.length) {
    const next = remaining[0]!;
    const dx = next.x - position.x;
    const dz = next.z - position.z;
    const d = Math.hypot(dx, dz);
    const isLast = remaining.length === 1;
    if (d < (isLast ? arriveRadius : 0.35)) {
      remaining.shift();
      continue;
    }
    // Ease into the final waypoint instead of overshooting.
    const scale = isLast ? Math.min(1, d / 0.6) : 1;
    return { direction: { x: (dx / d) * Math.max(scale, 0.25), z: (dz / d) * Math.max(scale, 0.25) }, remaining };
  }
  return null;
}
