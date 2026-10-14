import { describe, expect, it } from "vitest";
import { buildStations, PLAYER_RADIUS, STUDIO_LAYOUT } from "@/game/layout";
import { isBlocked, rayBox, resolveCircle } from "@/game/collision";
import { buildNavGrid, findPath } from "@/game/pathfinding";
import { cameraRelative, followPath, stepMovement, type MoveState } from "@/game/movement";
import { CAMERA_LIMITS, computeCameraPosition, lookAtAngles, lookDirection } from "@/game/camera";
import { nearestStation } from "@/game/interaction";
import { boxAt } from "@/game/layout";

const prints = [
  { slug: "a", title: "A" },
  { slug: "b", title: "B" },
  { slug: "c", title: "C" },
  { slug: "d", title: "D" },
];
const stations = buildStations(prints);
const grid = buildNavGrid(STUDIO_LAYOUT, PLAYER_RADIUS);
const occluders = STUDIO_LAYOUT.colliders.filter((c) => c.occludesCamera);

function walk(path: { x: number; z: number }[], from: { x: number; z: number }) {
  let s: MoveState = { position: from, velocity: { x: 0, z: 0 }, heading: 0 };
  let remaining = path;
  for (let i = 0; i < 60 * 40; i++) {
    const f = followPath(s.position, remaining);
    if (!f) break;
    remaining = f.remaining;
    s = stepMovement(s, { direction: f.direction, sprint: false }, 1 / 60, STUDIO_LAYOUT.colliders, PLAYER_RADIUS);
  }
  return s;
}

describe("studio layout", () => {
  it("spawn point is free", () => {
    expect(isBlocked(STUDIO_LAYOUT.spawn, PLAYER_RADIUS, STUDIO_LAYOUT.colliders)).toBe(false);
  });

  it("has unique station ids", () => {
    const ids = stations.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(stations.map((s) => [s.id, s] as const))("%s: approach point is free and within reach", (_id, s) => {
    expect(isBlocked(s.approach, PLAYER_RADIUS, STUDIO_LAYOUT.colliders)).toBe(false);
    const d = Math.hypot(s.approach.x - s.position.x, s.approach.z - s.position.z);
    expect(d).toBeLessThanOrEqual(s.radius);
  });

  it("booking desk is the closest commercial station to the entrance", () => {
    const listed = stations.filter((s) => s.listed);
    const dist = (id: string) => {
      const s = listed.find((x) => x.id === id)!;
      return Math.hypot(s.position.x - STUDIO_LAYOUT.spawn.x, s.position.z - STUDIO_LAYOUT.spawn.z);
    };
    for (const s of listed) if (s.id !== "booking" && s.id !== "noticeboard") expect(dist("booking")).toBeLessThan(dist(s.id));
  });
});

describe("collision", () => {
  const box = boxAt("b", 0, 0, 2, 2, 1);
  it("pushes a circle out of a box", () => {
    const p = resolveCircle({ x: 1.1, z: 0 }, 0.35, [box]);
    expect(p.x).toBeCloseTo(1.35, 5);
  });
  it("exits through nearest face when centre is inside", () => {
    const p = resolveCircle({ x: 0.9, z: 0 }, 0.35, [box]);
    expect(p.x).toBeCloseTo(1.35, 5);
  });
  it("ray hits box", () => {
    expect(rayBox([-5, 0.5, 0], [1, 0, 0], box, 10)).toBeCloseTo(4, 5);
    expect(rayBox([-5, 2, 0], [1, 0, 0], box, 10)).toBeNull();
  });
});

describe("pathfinding (nobody gets stuck)", () => {
  it.each(stations.map((s) => [s.id, s] as const))("spawn → %s is reachable and walkable", (_id, s) => {
    const path = findPath(grid, STUDIO_LAYOUT.spawn, s.approach);
    expect(path).not.toBeNull();
    const end = walk(path!, STUDIO_LAYOUT.spawn);
    expect(Math.hypot(end.position.x - s.approach.x, end.position.z - s.approach.z)).toBeLessThan(0.4);
  });

  it("clicking inside furniture routes to the nearest free spot", () => {
    const path = findPath(grid, STUDIO_LAYOUT.spawn, { x: 5.5, z: 5.8 });
    expect(path).not.toBeNull();
    const last = path![path!.length - 1]!;
    expect(isBlocked(last, PLAYER_RADIUS, STUDIO_LAYOUT.colliders)).toBe(false);
  });
});

describe("movement", () => {
  it("camera-relative forward follows camera yaw", () => {
    const d = cameraRelative(1, 0, Math.PI);
    expect(d.x).toBeCloseTo(0, 5);
    expect(d.z).toBeCloseTo(-1, 5);
    const r = cameraRelative(0, 1, Math.PI); // looking north, right is east
    expect(r.x).toBeCloseTo(1, 5);
  });

  it("survives a zero-length frame without NaN", () => {
    const s0: MoveState = { position: { x: 0, z: 7.4 }, velocity: { x: 0, z: 0 }, heading: 0 };
    const s1 = stepMovement(s0, { direction: { x: 0, z: -1 }, sprint: false }, 0, STUDIO_LAYOUT.colliders, PLAYER_RADIUS);
    expect(Number.isFinite(s1.position.x) && Number.isFinite(s1.position.z)).toBe(true);
  });

  it("accelerates smoothly and never passes through walls", () => {
    let s: MoveState = { position: { x: 0, z: -8 }, velocity: { x: 0, z: 0 }, heading: 0 };
    const first = stepMovement(s, { direction: { x: 0, z: -1 }, sprint: false }, 1 / 60, STUDIO_LAYOUT.colliders, PLAYER_RADIUS);
    expect(Math.abs(first.velocity.z)).toBeLessThan(1);
    for (let i = 0; i < 300; i++)
      s = stepMovement(s, { direction: { x: 0, z: -1 }, sprint: true }, 1 / 60, STUDIO_LAYOUT.colliders, PLAYER_RADIUS);
    expect(s.position.z).toBeGreaterThanOrEqual(STUDIO_LAYOUT.bounds.minZ + PLAYER_RADIUS - 1e-6);
  });
});

describe("camera", () => {
  it("pulls in when a wall is behind the avatar", () => {
    const target: [number, number, number] = [0, CAMERA_LIMITS.targetHeight, 8.2];
    const { distance, position } = computeCameraPosition(target, { yaw: Math.PI, pitch: 0.3, distance: 6 }, STUDIO_LAYOUT, occluders);
    expect(distance).toBeLessThan(6);
    expect(position[2]).toBeLessThan(STUDIO_LAYOUT.bounds.maxZ);
  });
  it("keeps full distance in open space", () => {
    const target: [number, number, number] = [0, CAMERA_LIMITS.targetHeight, 0];
    const { distance } = computeCameraPosition(target, { yaw: Math.PI, pitch: 0.3, distance: 5 }, STUDIO_LAYOUT, occluders);
    expect(distance).toBeCloseTo(5, 5);
  });
});

describe("first-person look", () => {
  it("look direction and lookAt angles agree", () => {
    const { yaw, pitch } = lookAtAngles([0, 1.6, 0], [3, 2.6, -4]);
    const d = lookDirection(yaw, pitch);
    const len = Math.hypot(3, 1, 4);
    expect(d[0]).toBeCloseTo(3 / len, 5);
    expect(d[1]).toBeCloseTo(1 / len, 5);
    expect(d[2]).toBeCloseTo(-4 / len, 5);
  });
});

describe("interaction", () => {
  it("finds the station the avatar stands at", () => {
    for (const s of stations) {
      const n = nearestStation(s.approach, s.approach.heading, stations);
      expect(n?.id, `at ${s.id}`).toBe(s.id);
    }
  });
  it("returns null in open floor space", () => {
    expect(nearestStation({ x: 2, z: -1 }, 0, stations)).toBeNull();
  });
  it("the founder greets visitors at the rug, straight ahead of the entrance", () => {
    const host = stations.find((s) => s.id === "npc-guide")!;
    // Rug spans x ∈ [-3, 3], z ∈ [-1.5, 2.5]; the host stands at its front edge.
    expect(Math.abs(host.position.x)).toBeLessThan(0.5);
    expect(host.position.z).toBeGreaterThan(2.3);
    expect(host.position.z).toBeLessThan(3.4);
    // Walking straight into the host stops at conversation distance.
    let s: MoveState = { position: { ...STUDIO_LAYOUT.spawn }, velocity: { x: 0, z: 0 }, heading: Math.PI };
    for (let i = 0; i < 240; i++) s = stepMovement(s, { direction: { x: 0, z: -1 }, sprint: false }, 1 / 60, STUDIO_LAYOUT.colliders, PLAYER_RADIUS);
    expect(s.position.z - host.position.z).toBeGreaterThan(0.85);
    // Visible but not in your face at spawn: outside interaction range.
    const d = Math.hypot(host.position.x - STUDIO_LAYOUT.spawn.x, host.position.z - STUDIO_LAYOUT.spawn.z);
    expect(d).toBeGreaterThan(host.radius);
  });
});
