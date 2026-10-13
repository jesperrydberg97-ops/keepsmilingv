import { CAMERA_LIMITS } from "./camera";
import { STUDIO_LAYOUT } from "./layout";
import type { Vec2 } from "./types";

/**
 * Per-frame mutable game state. Kept outside React so 60 fps updates never
 * trigger re-renders; React/HUD code reads it in rAF loops when needed.
 */
export const runtime = {
  player: {
    position: { x: STUDIO_LAYOUT.spawn.x, z: STUDIO_LAYOUT.spawn.z } as Vec2,
    velocity: { x: 0, z: 0 } as Vec2,
    heading: STUDIO_LAYOUT.spawn.heading,
  },
  /** Click-to-move waypoints. */
  path: null as Vec2[] | null,
  /** Final facing once the path completes (fast travel / station approach). */
  pathEndHeading: null as number | null,
  /** Station to interact with on arrival. */
  pendingStationId: null as string | null,
  /** Sprint the current auto-walk (used by the guided tour). */
  autoSprint: false,
  orbit: { yaw: STUDIO_LAYOUT.spawn.heading, pitch: CAMERA_LIMITS.defaultPitch, distance: CAMERA_LIMITS.defaultDistance },
  input: {
    keys: new Set<string>(),
    /** Virtual joystick: x = right, y = forward, magnitude 0..1. */
    joystick: { x: 0, y: 0 },
  },
  /** Camera focus target while a station overlay is opening/open. */
  focus: null as null | { camera: [number, number, number]; target: [number, number, number] },
  /** Set to snap the camera behind the avatar on the next frame. */
  snapCamera: true,
  /** performance.now()/1000 of the last interaction — drives the avatar gesture. */
  lastInteractAt: -10,
};

export function resetRuntime() {
  runtime.player.position = { x: STUDIO_LAYOUT.spawn.x, z: STUDIO_LAYOUT.spawn.z };
  runtime.player.velocity = { x: 0, z: 0 };
  runtime.player.heading = STUDIO_LAYOUT.spawn.heading;
  runtime.path = null;
  runtime.pathEndHeading = null;
  runtime.pendingStationId = null;
  runtime.autoSprint = false;
  runtime.orbit = { yaw: STUDIO_LAYOUT.spawn.heading, pitch: CAMERA_LIMITS.defaultPitch, distance: CAMERA_LIMITS.defaultDistance };
  runtime.input.keys.clear();
  runtime.input.joystick = { x: 0, y: 0 };
  runtime.focus = null;
  runtime.snapCamera = true;
}

export function teleport(p: Vec2 & { heading: number }) {
  runtime.player.position = { x: p.x, z: p.z };
  runtime.player.velocity = { x: 0, z: 0 };
  runtime.player.heading = p.heading;
  runtime.path = null;
  runtime.pendingStationId = null;
  runtime.orbit.yaw = p.heading;
  runtime.snapCamera = true;
}
