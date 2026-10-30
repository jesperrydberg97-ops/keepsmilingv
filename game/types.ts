/**
 * Core game types. Everything here is plain data so the movement, collision,
 * pathfinding and interaction logic can be unit tested without WebGL.
 *
 * Coordinate system: metres, Y up. The studio floor is the XZ plane.
 * +Z points toward the entrance (south), -Z toward the back wall (north).
 */

export interface Vec2 {
  x: number;
  z: number;
}

/** Axis-aligned box on the floor plan, with a height for camera occlusion tests. */
export interface Box {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** Height of the obstacle in metres (walls ≈ ceiling height). */
  height: number;
  /** Walls occlude the camera; low furniture usually doesn't. */
  occludesCamera?: boolean;
}

export type PanelId =
  | "booking"
  | "projects"
  | "print"
  | "prints"
  | "about"
  | "blog"
  | "showreel"
  | "music"
  | "timeline"
  | "contact"
  | "settings"
  | "help";

export type StationAction =
  | { kind: "panel"; panel: PanelId; params?: Record<string, string> }
  | { kind: "easterEgg"; eggId: string }
  | { kind: "npc" };

export type StationType =
  | "booking"
  | "tv"
  | "gallery-frame"
  | "noticeboard"
  | "reading"
  | "projector"
  | "music"
  | "timeline"
  | "telephone"
  | "easter-egg"
  | "npc";

/**
 * The unified, data-driven interaction contract every station implements.
 */
export interface Station {
  id: string;
  type: StationType;
  label: string;
  /** Short verb phrase shown in the interaction prompt, e.g. "Browse projects". */
  prompt: string;
  /** Centre of the interactive prop on the floor plan. */
  position: Vec2;
  /** Height of the prop's visual centre — used for hotspot markers and focus. */
  height: number;
  /** Interaction radius measured from `position`. */
  radius: number;
  /** Where the avatar stands when it walks or fast-travels here. */
  approach: Vec2 & { heading: number };
  action: StationAction;
  analyticsEvent: string;
  /** Optional camera focus used on desktop before an overlay opens. */
  focus?: { camera: [number, number, number]; target: [number, number, number] };
  /** Listed in the fast-travel menu and minimap. */
  listed: boolean;
}

export interface StudioLayout {
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  ceilingHeight: number;
  wallThickness: number;
  spawn: Vec2 & { heading: number };
  colliders: Box[];
}
