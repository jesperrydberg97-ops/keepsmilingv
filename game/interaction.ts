import type { Station, Vec2 } from "./types";

/**
 * Pick the station the avatar can interact with right now: inside its radius,
 * preferring stations in front of the avatar, then the closest.
 */
export function nearestStation(position: Vec2, heading: number, stations: readonly Station[]): Station | null {
  let best: Station | null = null;
  let bestScore = Infinity;
  const fx = Math.sin(heading);
  const fz = Math.cos(heading);
  for (const s of stations) {
    const dx = s.position.x - position.x;
    const dz = s.position.z - position.z;
    const d = Math.hypot(dx, dz);
    if (d > s.radius) continue;
    // Facing factor in [0, 2]: 0 when looking straight at it.
    const facing = d > 1e-3 ? 1 - (dx * fx + dz * fz) / d : 0;
    const score = d / s.radius + facing * 0.35;
    if (score < bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return best;
}

export function isWithinReach(position: Vec2, station: Station): boolean {
  return Math.hypot(station.position.x - position.x, station.position.z - position.z) <= station.radius;
}
