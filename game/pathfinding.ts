import { isBlocked, segmentClear } from "./collision";
import type { Box, StudioLayout, Vec2 } from "./types";

/**
 * Grid navmesh for click-to-move. The walkable grid is baked from the same
 * collider list used for movement, inflated by the avatar radius, so a path
 * found here is always a path the controller can actually walk.
 *
 * Tradeoff: a uniform grid + A* + string-pulling is simple, testable and fast
 * for one open-plan room (~7k cells). A polygon navmesh (recast-navigation)
 * becomes worthwhile only with multiple floors or very large spaces.
 */

export interface NavGrid {
  cell: number;
  cols: number;
  rows: number;
  originX: number;
  originZ: number;
  walkable: Uint8Array;
  radius: number;
  colliders: readonly Box[];
}

export function buildNavGrid(layout: StudioLayout, radius: number, cell = 0.25): NavGrid {
  const { minX, maxX, minZ, maxZ } = layout.bounds;
  const cols = Math.ceil((maxX - minX) / cell);
  const rows = Math.ceil((maxZ - minZ) / cell);
  const walkable = new Uint8Array(cols * rows);
  // Small safety margin so smoothed paths don't graze corners.
  const r = radius + 0.05;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const p = { x: minX + (i + 0.5) * cell, z: minZ + (j + 0.5) * cell };
      walkable[j * cols + i] = isBlocked(p, r, layout.colliders) ? 0 : 1;
    }
  }
  return { cell, cols, rows, originX: minX, originZ: minZ, walkable, radius: r, colliders: layout.colliders };
}

export function toCell(g: NavGrid, p: Vec2): [number, number] {
  return [Math.floor((p.x - g.originX) / g.cell), Math.floor((p.z - g.originZ) / g.cell)];
}

export function cellCentre(g: NavGrid, i: number, j: number): Vec2 {
  return { x: g.originX + (i + 0.5) * g.cell, z: g.originZ + (j + 0.5) * g.cell };
}

function inGrid(g: NavGrid, i: number, j: number) {
  return i >= 0 && j >= 0 && i < g.cols && j < g.rows;
}

export function isWalkableCell(g: NavGrid, i: number, j: number) {
  return inGrid(g, i, j) && g.walkable[j * g.cols + i] === 1;
}

/** Nearest walkable cell (BFS ring search) — lets visitors click on furniture. */
export function nearestWalkable(g: NavGrid, p: Vec2, maxRing = 24): [number, number] | null {
  const [ci, cj] = toCell(g, p);
  if (isWalkableCell(g, ci, cj)) return [ci, cj];
  let best: [number, number] | null = null;
  let bestD = Infinity;
  for (let ring = 1; ring <= maxRing; ring++) {
    for (let dj = -ring; dj <= ring; dj++) {
      for (let di = -ring; di <= ring; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== ring) continue;
        const i = ci + di;
        const j = cj + dj;
        if (!isWalkableCell(g, i, j)) continue;
        const c = cellCentre(g, i, j);
        const d = (c.x - p.x) ** 2 + (c.z - p.z) ** 2;
        if (d < bestD) {
          bestD = d;
          best = [i, j];
        }
      }
    }
    if (best) return best;
  }
  return null;
}

class MinHeap {
  private items: { k: number; f: number }[] = [];
  get size() {
    return this.items.length;
  }
  push(k: number, f: number) {
    const a = this.items;
    a.push({ k, f });
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p]!.f <= a[i]!.f) break;
      [a[p], a[i]] = [a[i]!, a[p]!];
      i = p;
    }
  }
  pop(): number {
    const a = this.items;
    const top = a[0]!;
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l]!.f < a[m]!.f) m = l;
        if (r < a.length && a[r]!.f < a[m]!.f) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i]!, a[m]!];
        i = m;
      }
    }
    return top.k;
  }
}

const SQRT2 = Math.SQRT2;
const NEIGHBOURS: [number, number, number][] = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, SQRT2],
  [1, -1, SQRT2],
  [-1, 1, SQRT2],
  [-1, -1, SQRT2],
];

/**
 * A* on the grid followed by line-of-sight smoothing.
 * Returns world-space waypoints (excluding the start), or null if unreachable.
 */
export function findPath(g: NavGrid, start: Vec2, goal: Vec2): Vec2[] | null {
  const s = nearestWalkable(g, start);
  const t = nearestWalkable(g, goal);
  if (!s || !t) return null;
  const sk = s[1] * g.cols + s[0];
  const tk = t[1] * g.cols + t[0];
  const goalPoint = toCell(g, goal)[0] === t[0] && toCell(g, goal)[1] === t[1] ? goal : cellCentre(g, t[0], t[1]);

  if (sk === tk) return [goalPoint];

  const n = g.cols * g.rows;
  const gScore = new Float32Array(n).fill(Infinity);
  const came = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const open = new MinHeap();
  const h = (k: number) => {
    const i = k % g.cols;
    const j = (k / g.cols) | 0;
    const dx = Math.abs(i - t[0]);
    const dz = Math.abs(j - t[1]);
    return dx + dz + (SQRT2 - 2) * Math.min(dx, dz);
  };
  gScore[sk] = 0;
  open.push(sk, h(sk));

  let found = false;
  while (open.size) {
    const k = open.pop();
    if (closed[k]) continue;
    if (k === tk) {
      found = true;
      break;
    }
    closed[k] = 1;
    const i = k % g.cols;
    const j = (k / g.cols) | 0;
    for (const [di, dj, cost] of NEIGHBOURS) {
      const ni = i + di;
      const nj = j + dj;
      if (!isWalkableCell(g, ni, nj)) continue;
      // No corner cutting through blocked cells.
      if (di !== 0 && dj !== 0 && (!isWalkableCell(g, i + di, j) || !isWalkableCell(g, i, j + dj))) continue;
      const nk = nj * g.cols + ni;
      if (closed[nk]) continue;
      const tentative = gScore[k]! + cost;
      if (tentative < gScore[nk]!) {
        gScore[nk] = tentative;
        came[nk] = k;
        open.push(nk, tentative + h(nk));
      }
    }
  }
  if (!found) return null;

  const cells: Vec2[] = [];
  for (let k = tk; k !== -1; k = came[k]!) {
    cells.push(cellCentre(g, k % g.cols, (k / g.cols) | 0));
    if (k === sk) break;
  }
  cells.reverse();
  cells[cells.length - 1] = goalPoint;
  return smoothPath(g, start, cells);
}

/** String-pulling: skip waypoints while there is a clear straight line. */
export function smoothPath(g: NavGrid, start: Vec2, points: Vec2[]): Vec2[] {
  const out: Vec2[] = [];
  let anchor = start;
  let i = 0;
  while (i < points.length) {
    let far = i;
    for (let k = points.length - 1; k > i; k--) {
      if (segmentClear(anchor, points[k]!, g.radius - 0.05, g.colliders)) {
        far = k;
        break;
      }
    }
    out.push(points[far]!);
    anchor = points[far]!;
    i = far + 1;
  }
  return out;
}
