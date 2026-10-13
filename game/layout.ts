import type { Box, Station, StudioLayout, Vec2 } from "./types";

/**
 * Greybox floor plan of the KSV studio — the single source of truth used by
 * rendering, collision, pathfinding, the minimap and fast travel.
 *
 * Heading convention: forward = (sin h, cos h). h = 0 faces +Z (toward the
 * entrance), h = π faces the back wall, h = π/2 faces east (+X).
 *
 *            N (back wall, z = -9)
 *   ┌───────────────────────────────────────────┐
 *   │ Reading   crate  [ SHOWREEL ]  Timeline  Music│
 *   │ lounge           projector     shelf    corner│
 *   │──divider          poufs                      │
 *   │                                         Gallery
 *   │TV ▌ sofa     col           col          wall │
 * W │                    rug                   ▐▐▐ │ E
 *   │windows                              camera   │
 *   │                                              │
 *   │           Guide        Booking desk          │
 *   │   About board  [door]                 Phone  │
 *   └───────────────────────────────────────────┘
 *            S (entrance, z = +9)
 */

export const HALF_PI = Math.PI / 2;
export const PLAYER_RADIUS = 0.35;

const W = 24;
const D = 18;
const CEILING = 4.6;
const WALL_T = 0.3;

const bounds = { minX: -W / 2, maxX: W / 2, minZ: -D / 2, maxZ: D / 2 };

/** Helper: box from centre + size. */
export function boxAt(
  id: string,
  cx: number,
  cz: number,
  sx: number,
  sz: number,
  height: number,
  occludesCamera = false,
): Box {
  return {
    id,
    minX: cx - sx / 2,
    maxX: cx + sx / 2,
    minZ: cz - sz / 2,
    maxZ: cz + sz / 2,
    height,
    occludesCamera,
  };
}

/** Prop placements shared by the renderer and the collider list. */
export const PROPS = {
  bookingDesk: { x: 5.5, z: 5.8, w: 2.4, d: 1.0, rot: 0 },
  tvConsole: { x: -11.35, z: -0.5, w: 0.6, d: 2.8 },
  tvScreen: { x: -11.78, y: 1.75, z: -0.5, w: 2.6, h: 1.5 },
  sofa: { x: -7.6, z: -0.5, w: 1.0, d: 2.6 },
  aboutBoard: { x: -6, y: 1.65, z: 8.82, w: 2.4, h: 1.5 },
  armchair: { x: -9.9, z: -6.7, w: 1.0, d: 1.0 },
  sideTable: { x: -8.6, z: -7.3, r: 0.32 },
  bookshelf: { x: -9.6, z: -8.6, w: 3.2, d: 0.45, h: 2.4 },
  divider: { x: -10.6, z: -3.6, w: 2.8, d: 0.35, h: 1.2 },
  projectorScreen: { x: 0, y: 2.35, z: -8.82, w: 5.2, h: 2.9 },
  poufs: [
    { x: -1.6, z: -5.2 },
    { x: 1.6, z: -5.2 },
  ],
  timelineShelf: { x: 5.6, z: -8.65, w: 4.0, d: 0.4, h: 1.9 },
  musicCabinet: { x: 9.7, z: -8.45, w: 2.0, d: 0.6, h: 0.75 },
  speakers: [
    { x: 8.3, z: -8.5 },
    { x: 11.1, z: -8.5 },
  ],
  galleryFrames: [
    { x: 11.82, y: 1.7, z: -5.6 },
    { x: 11.82, y: 1.7, z: -3.4 },
    { x: 11.82, y: 1.7, z: -1.2 },
    { x: 11.82, y: 1.7, z: 1.0 },
  ],
  phoneTable: { x: 10.9, z: 7.7, r: 0.35 },
  columns: [
    { x: -4.5, z: -3 },
    { x: 4.5, z: -3 },
  ],
  plants: [
    { x: -11.1, z: 7.9 },
    { x: 11.2, z: 4.4 },
    { x: -6.4, z: -8.2 },
    { x: 2.3, z: 7.9 },
  ],
  cameraTripod: { x: 8.4, z: 2.6 },
  clapperCrate: { x: -4.4, z: -8.3 },
  door: { x: 0, z: 8.85, w: 2.4, h: 2.8 },
  westWindows: { z0: 2, z1: 8.2 },
  npc: { x: -2.2, z: 6.1 },
} as const;

function wallColliders(): Box[] {
  const { minX, maxX, minZ, maxZ } = bounds;
  const t = WALL_T;
  return [
    { id: "wall-n", minX: minX - t, maxX: maxX + t, minZ: minZ - t, maxZ: minZ, height: CEILING, occludesCamera: true },
    { id: "wall-s", minX: minX - t, maxX: maxX + t, minZ: maxZ, maxZ: maxZ + t, height: CEILING, occludesCamera: true },
    { id: "wall-w", minX: minX - t, maxX: minX, minZ: minZ - t, maxZ: maxZ + t, height: CEILING, occludesCamera: true },
    { id: "wall-e", minX: maxX, maxX: maxX + t, minZ: minZ - t, maxZ: maxZ + t, height: CEILING, occludesCamera: true },
  ];
}

function propColliders(): Box[] {
  const p = PROPS;
  const list: Box[] = [
    boxAt("booking-desk", p.bookingDesk.x, p.bookingDesk.z, p.bookingDesk.w, p.bookingDesk.d, 0.76),
    boxAt("tv-console", p.tvConsole.x, p.tvConsole.z, p.tvConsole.w, p.tvConsole.d, 0.55),
    boxAt("sofa", p.sofa.x, p.sofa.z, p.sofa.w, p.sofa.d, 0.85),
    boxAt("armchair", p.armchair.x, p.armchair.z, p.armchair.w, p.armchair.d, 1.0),
    boxAt("side-table", p.sideTable.x, p.sideTable.z, p.sideTable.r * 2, p.sideTable.r * 2, 0.55),
    boxAt("bookshelf", p.bookshelf.x, p.bookshelf.z, p.bookshelf.w, p.bookshelf.d, p.bookshelf.h),
    boxAt("divider", p.divider.x, p.divider.z, p.divider.w, p.divider.d, p.divider.h),
    boxAt("timeline-shelf", p.timelineShelf.x, p.timelineShelf.z, p.timelineShelf.w, p.timelineShelf.d, p.timelineShelf.h),
    boxAt("music-cabinet", p.musicCabinet.x, p.musicCabinet.z, p.musicCabinet.w, p.musicCabinet.d, p.musicCabinet.h),
    boxAt("phone-table", p.phoneTable.x, p.phoneTable.z, p.phoneTable.r * 2, p.phoneTable.r * 2, 0.7),
    boxAt("tripod", p.cameraTripod.x, p.cameraTripod.z, 0.6, 0.6, 1.5),
    boxAt("clapper-crate", p.clapperCrate.x, p.clapperCrate.z, 0.7, 0.5, 0.5),
    boxAt("npc-guide", p.npc.x, p.npc.z, 0.6, 0.6, 1.8),
  ];
  p.poufs.forEach((q, i) => list.push(boxAt(`pouf-${i}`, q.x, q.z, 0.6, 0.6, 0.4)));
  p.speakers.forEach((q, i) => list.push(boxAt(`speaker-${i}`, q.x, q.z, 0.45, 0.4, 1.05)));
  // Columns reach the ceiling, so they may hide the avatar from the camera.
  p.columns.forEach((q, i) => list.push(boxAt(`column-${i}`, q.x, q.z, 0.36, 0.36, CEILING, true)));
  p.plants.forEach((q, i) => list.push(boxAt(`plant-${i}`, q.x, q.z, 0.55, 0.55, 1.4)));
  return list;
}

export const STUDIO_LAYOUT: StudioLayout = {
  bounds,
  ceilingHeight: CEILING,
  wallThickness: WALL_T,
  spawn: { x: 0, z: 6.3, heading: Math.PI },
  colliders: [...wallColliders(), ...propColliders()],
};

/** Station definitions that don't depend on CMS content. */
export function baseStations(): Station[] {
  const p = PROPS;
  return [
    {
      id: "npc-guide",
      type: "npc",
      label: "Studio guide",
      prompt: "Talk to the guide",
      position: { x: p.npc.x, z: p.npc.z },
      height: 1.2,
      radius: 1.8,
      approach: { x: p.npc.x + 1.0, z: p.npc.z + 0.6, heading: -2.1 },
      action: { kind: "npc" },
      analyticsEvent: "station_visited",
      listed: false,
    },
    {
      id: "booking",
      type: "booking",
      label: "Booking desk",
      prompt: "Start a film project inquiry",
      position: { x: p.bookingDesk.x, z: p.bookingDesk.z },
      height: 0.9,
      radius: 2.2,
      approach: { x: p.bookingDesk.x, z: p.bookingDesk.z - 1.25, heading: 0 },
      action: { kind: "panel", panel: "booking" },
      analyticsEvent: "inquiry_started",
      focus: { camera: [5.5, 2.0, 3.3], target: [5.5, 0.9, 5.9] },
      listed: true,
    },
    {
      id: "tv",
      type: "tv",
      label: "Project TV",
      prompt: "Browse projects",
      position: { x: -11.0, z: p.tvScreen.z },
      height: p.tvScreen.y,
      radius: 2.6,
      approach: { x: -9.6, z: p.tvScreen.z, heading: -HALF_PI },
      action: { kind: "panel", panel: "projects" },
      analyticsEvent: "station_visited",
      focus: { camera: [-8.6, 1.9, -0.5], target: [-11.8, 1.75, -0.5] },
      listed: true,
    },
    {
      id: "noticeboard",
      type: "noticeboard",
      label: "About noticeboard",
      prompt: "Read about KSV",
      position: { x: p.aboutBoard.x, z: 8.3 },
      height: p.aboutBoard.y,
      radius: 2.0,
      approach: { x: p.aboutBoard.x, z: 7.3, heading: 0 },
      action: { kind: "panel", panel: "about" },
      analyticsEvent: "station_visited",
      focus: { camera: [-6, 1.8, 5.8], target: [-6, 1.65, 8.8] },
      listed: true,
    },
    {
      id: "reading",
      type: "reading",
      label: "Reading lounge",
      prompt: "Read the journal",
      position: { x: p.sideTable.x, z: p.sideTable.z },
      height: 0.65,
      radius: 2.1,
      approach: { x: -8.2, z: -5.9, heading: Math.PI },
      action: { kind: "panel", panel: "blog" },
      analyticsEvent: "station_visited",
      listed: true,
    },
    {
      id: "showreel",
      type: "projector",
      label: "Showreel wall",
      prompt: "Play the showreel",
      position: { x: 0, z: -7.4 },
      height: p.projectorScreen.y,
      radius: 3.0,
      approach: { x: 0, z: -5.4, heading: Math.PI },
      action: { kind: "panel", panel: "showreel" },
      analyticsEvent: "station_visited",
      focus: { camera: [0, 2.0, -3.2], target: [0, 2.35, -8.8] },
      listed: true,
    },
    {
      id: "timeline",
      type: "timeline",
      label: "Project timeline",
      prompt: "Explore the timeline",
      position: { x: p.timelineShelf.x, z: -8.2 },
      height: 1.2,
      radius: 2.4,
      approach: { x: p.timelineShelf.x, z: -7.0, heading: Math.PI },
      action: { kind: "panel", panel: "timeline" },
      analyticsEvent: "station_visited",
      listed: true,
    },
    {
      id: "music",
      type: "music",
      label: "Music corner",
      prompt: "Listen to Free Music Plug",
      position: { x: p.musicCabinet.x, z: -8.1 },
      height: 0.85,
      radius: 2.1,
      approach: { x: p.musicCabinet.x, z: -6.9, heading: Math.PI },
      action: { kind: "panel", panel: "music" },
      analyticsEvent: "station_visited",
      listed: true,
    },
    {
      id: "telephone",
      type: "telephone",
      label: "Contact phone",
      prompt: "Get in touch",
      position: { x: p.phoneTable.x, z: p.phoneTable.z },
      height: 0.8,
      radius: 1.9,
      approach: { x: 10.0, z: 6.8, heading: 0.8 },
      action: { kind: "panel", panel: "contact" },
      analyticsEvent: "contact_clicked",
      listed: true,
    },
    {
      id: "egg-shutter",
      type: "easter-egg",
      label: "Cinema camera",
      prompt: "Take a picture",
      position: { x: p.cameraTripod.x, z: p.cameraTripod.z },
      height: 1.45,
      radius: 1.5,
      approach: { x: p.cameraTripod.x - 0.9, z: p.cameraTripod.z, heading: HALF_PI },
      action: { kind: "easterEgg", eggId: "shutter" },
      analyticsEvent: "easter_egg_found",
      listed: false,
    },
    {
      id: "egg-clapper",
      type: "easter-egg",
      label: "Clapperboard",
      prompt: "Snap the clapper",
      position: { x: p.clapperCrate.x, z: p.clapperCrate.z },
      height: 0.6,
      radius: 1.5,
      approach: { x: p.clapperCrate.x, z: p.clapperCrate.z + 1.0, heading: Math.PI },
      action: { kind: "easterEgg", eggId: "clapper" },
      analyticsEvent: "easter_egg_found",
      listed: false,
    },
    {
      id: "egg-polaroid",
      type: "easter-egg",
      label: "Forgotten polaroid",
      prompt: "Pick up the polaroid",
      position: { x: -10.5, z: 7.9 },
      height: 0.05,
      radius: 1.3,
      approach: { x: -10.0, z: 7.3, heading: -0.9 },
      action: { kind: "easterEgg", eggId: "polaroid" },
      analyticsEvent: "easter_egg_found",
      listed: false,
    },
  ];
}

/** One station per framed print, filled from content in display order. */
export function galleryStations(prints: { slug: string; title: string }[]): Station[] {
  return PROPS.galleryFrames.slice(0, prints.length).map((f, i) => {
    const print = prints[i]!;
    return {
      id: `print-${print.slug}`,
      type: "gallery-frame" as const,
      label: print.title,
      prompt: "View print",
      position: { x: 11.2, z: f.z },
      height: f.y,
      radius: 1.45,
      approach: { x: 10.2, z: f.z, heading: HALF_PI },
      action: { kind: "panel" as const, panel: "print" as const, params: { slug: print.slug } },
      analyticsEvent: "print_viewed",
      focus: { camera: [9.4, 1.75, f.z], target: [11.8, 1.7, f.z] },
      // Only the first frame represents the gallery in menus.
      listed: i === 0,
    };
  });
}

export function buildStations(prints: { slug: string; title: string }[]): Station[] {
  return [...baseStations(), ...galleryStations(prints)];
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}
