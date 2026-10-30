import type { Box, Vec2 } from "./types";

/**
 * Lightweight collision for a single-storey studio: the avatar is a circle on
 * the floor plan, obstacles are axis-aligned boxes. This is deterministic,
 * dependency-free and cheap enough for low-end phones. If the studio ever
 * needs stairs, ramps or dynamic props, swap this module for Rapier's
 * kinematic character controller behind the same `resolveCircle` signature.
 */

export function circleIntersectsBox(p: Vec2, r: number, b: Box): boolean {
  const cx = Math.max(b.minX, Math.min(p.x, b.maxX));
  const cz = Math.max(b.minZ, Math.min(p.z, b.maxZ));
  const dx = p.x - cx;
  const dz = p.z - cz;
  return dx * dx + dz * dz < r * r;
}

/** Push a circle out of every overlapping box. Iterates to settle corners. */
export function resolveCircle(p: Vec2, r: number, boxes: readonly Box[], iterations = 4): Vec2 {
  let x = p.x;
  let z = p.z;
  for (let it = 0; it < iterations; it++) {
    let moved = false;
    for (const b of boxes) {
      const cx = Math.max(b.minX, Math.min(x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
      let dx = x - cx;
      let dz = z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      moved = true;
      if (d2 > 1e-10) {
        const d = Math.sqrt(d2);
        const push = r - d;
        x += (dx / d) * push;
        z += (dz / d) * push;
      } else {
        // Centre is inside the box: exit through the nearest face.
        const left = x - b.minX;
        const right = b.maxX - x;
        const top = z - b.minZ;
        const bottom = b.maxZ - z;
        const m = Math.min(left, right, top, bottom);
        if (m === left) x = b.minX - r;
        else if (m === right) x = b.maxX + r;
        else if (m === top) z = b.minZ - r;
        else z = b.maxZ + r;
        dx = dz = 0;
      }
    }
    if (!moved) break;
  }
  return { x, z };
}

export function isBlocked(p: Vec2, r: number, boxes: readonly Box[]): boolean {
  for (const b of boxes) if (circleIntersectsBox(p, r, b)) return true;
  return false;
}

/**
 * Slab-method ray vs 3D AABB (box spans y ∈ [0, height]).
 * Returns the hit distance along the normalised direction, or null.
 */
export function rayBox(
  origin: [number, number, number],
  dir: [number, number, number],
  b: Box,
  maxDist: number,
): number | null {
  const min = [b.minX, 0, b.minZ];
  const max = [b.maxX, b.height, b.maxZ];
  let tmin = 0;
  let tmax = maxDist;
  for (let i = 0; i < 3; i++) {
    const o = origin[i]!;
    const d = dir[i]!;
    const lo = min[i]!;
    const hi = max[i]!;
    if (Math.abs(d) < 1e-9) {
      if (o < lo || o > hi) return null;
      continue;
    }
    let t1 = (lo - o) / d;
    let t2 = (hi - o) / d;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  return tmin;
}

/** 2D segment clearance test used by path smoothing. */
export function segmentClear(a: Vec2, b: Vec2, r: number, boxes: readonly Box[], step = 0.15): boolean {
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  const n = Math.max(1, Math.ceil(len / step));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (isBlocked({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }, r, boxes)) return false;
  }
  return true;
}
