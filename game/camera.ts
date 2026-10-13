import { rayBox } from "./collision";
import type { Box, StudioLayout } from "./types";

export interface OrbitState {
  /** Direction the camera looks, same convention as avatar heading. */
  yaw: number;
  /** Elevation above the horizon, radians. */
  pitch: number;
  distance: number;
}

export const CAMERA_LIMITS = {
  minPitch: 0.12,
  maxPitch: 1.05,
  minDistance: 2.2,
  maxDistance: 8,
  defaultDistance: 5.2,
  defaultPitch: 0.38,
  /** Look-at height above the avatar's feet. */
  targetHeight: 1.45,
  /** Gap kept between camera and an occluding surface. */
  wallMargin: 0.3,
};

export function clampOrbit(o: OrbitState): OrbitState {
  return {
    yaw: o.yaw,
    pitch: Math.min(CAMERA_LIMITS.maxPitch, Math.max(CAMERA_LIMITS.minPitch, o.pitch)),
    distance: Math.min(CAMERA_LIMITS.maxDistance, Math.max(CAMERA_LIMITS.minDistance, o.distance)),
  };
}

/** Unit vector from the look-at target toward the camera. */
export function orbitOffsetDir(o: OrbitState): [number, number, number] {
  const cp = Math.cos(o.pitch);
  return [-Math.sin(o.yaw) * cp, Math.sin(o.pitch), -Math.cos(o.yaw) * cp];
}

function castDistance(
  target: [number, number, number],
  dir: [number, number, number],
  wanted: number,
  layout: StudioLayout,
  occluders: readonly Box[],
): number {
  let dist = wanted;
  for (const b of occluders) {
    const t = rayBox(target, dir, b, dist + CAMERA_LIMITS.wallMargin);
    if (t !== null) dist = Math.min(dist, t - CAMERA_LIMITS.wallMargin);
  }
  if (dir[1] > 1e-6) {
    const tc = (layout.ceilingHeight - 0.25 - target[1]) / dir[1];
    if (tc > 0) dist = Math.min(dist, tc);
  }
  return Math.max(0.15, dist);
}

/**
 * Desired camera position with obstruction handling: cast from the target
 * toward the ideal camera position and stop short of the first occluder
 * (walls, full-height columns, ceiling). When the avatar is backed against a
 * wall, the camera rises over its shoulder instead of clipping through.
 */
export function computeCameraPosition(
  target: [number, number, number],
  o: OrbitState,
  layout: StudioLayout,
  occluders: readonly Box[],
): { position: [number, number, number]; distance: number; pitch: number } {
  const comfortable = Math.min(o.distance, 1.8);
  let best = { dist: -1, pitch: o.pitch, dir: orbitOffsetDir(o) };
  for (const extra of [0, 0.25, 0.5, 0.8]) {
    const pitch = Math.min(1.35, o.pitch + extra);
    const dir = orbitOffsetDir({ ...o, pitch });
    const dist = castDistance(target, dir, o.distance, layout, occluders);
    if (dist > best.dist) best = { dist, pitch, dir };
    if (dist >= comfortable) break;
  }
  const { dist, dir, pitch } = best;
  return {
    position: [target[0] + dir[0] * dist, target[1] + dir[1] * dist, target[2] + dir[2] * dist],
    distance: dist,
    pitch,
  };
}

/** Frame-rate independent exponential damping. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return target + (current - target) * Math.exp(-lambda * dt);
}
