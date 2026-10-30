"use client";

import { track, type AnalyticsEvent } from "@/lib/analytics";
import { sfx } from "./audio";
import { isWithinReach } from "./interaction";
import { BACKFLIP, isFlipping } from "./founderMoves";
import { PLAYER_RADIUS, PROPS, STUDIO_LAYOUT } from "./layout";
import { buildNavGrid, findPath, type NavGrid } from "./pathfinding";
import { FIRST_PERSON, lookAtAngles } from "./camera";
import { FP_DEFAULT_PITCH, runtime, teleport } from "./runtime";
import { useStudio } from "./store";
import type { Station, Vec2 } from "./types";

let grid: NavGrid | null = null;
export function navGrid(): NavGrid {
  grid ??= buildNavGrid(STUDIO_LAYOUT, PLAYER_RADIUS);
  return grid;
}

const EGGS: Record<string, { title: string; text: string }> = {
  shutter: { title: "Click.", text: "Every frame is a chance to catch a smile. You just took one." },
  clapper: { title: "Scene 1, take 1 — action!", text: "Behind the scenes note: the best takes usually happen right after someone laughs." },
  polaroid: { title: "A forgotten polaroid", text: "On the back, in pencil: “Keep smiling.” Placeholder note — the owner can swap in a real behind-the-scenes story." },
};

function isMobileLike() {
  return typeof window !== "undefined" && (window.matchMedia?.("(pointer: coarse)").matches || window.innerWidth < 768);
}

/** Resolve the tour/guide alias "gallery" to the first gallery frame. */
export function resolveStation(id: string): Station | undefined {
  const { stations } = useStudio.getState();
  if (id === "gallery") return stations.find((s) => s.type === "gallery-frame");
  return stations.find((s) => s.id === id);
}

export function interact(station: Station) {
  const st = useStudio.getState();
  runtime.path = null;
  runtime.pendingStationId = null;
  runtime.lastInteractAt = performance.now() / 1000;
  // Face the prop (and in first person, turn the view toward it).
  runtime.player.heading = Math.atan2(station.position.x - runtime.player.position.x, station.position.z - runtime.player.position.z);
  if (useStudio.getState().settings.cameraMode === "first") {
    const p = runtime.player.position;
    runtime.turnTo = lookAtAngles([p.x, FIRST_PERSON.eyeHeight, p.z], [station.position.x, station.height, station.position.z]);
  }
  const a = station.action;
  if (a.kind === "npc") {
    st.setGuide({ open: true, mode: "greeting" });
    return;
  }
  if (a.kind === "easterEgg") {
    const egg = EGGS[a.eggId];
    if (st.settings.sound) {
      if (a.eggId === "shutter") sfx.shutter();
      else if (a.eggId === "clapper") sfx.clap();
      else sfx.chime();
    }
    if (a.eggId === "shutter") st.triggerFlash();
    if (a.eggId === "clapper") st.triggerClap();
    if (egg) st.showToast(egg.title, egg.text);
    track("easter_egg_found", { egg: a.eggId });
    return;
  }
  track(station.analyticsEvent as AnalyticsEvent, { station: station.id, panel: a.panel });
  const open = () => st.openPanel({ id: a.panel, params: a.params, stationId: station.id });
  if (station.focus && !st.settings.reducedMotion && !isMobileLike()) {
    runtime.focus = station.focus;
    window.setTimeout(open, 420);
  } else {
    open();
  }
}

/** Walk to a point (click-to-move). Returns false if unreachable. */
/**
 * Ask the founder for a backflip. In first person the view turns toward them
 * so it isn't missed. Ignored while a flip is already in progress.
 */
export function founderBackflip(now = performance.now() / 1000): boolean {
  if (isFlipping(now - runtime.founderFlipAt)) return false;
  runtime.founderFlipAt = now;
  const st = useStudio.getState();
  if (st.settings.cameraMode === "first") {
    const p = runtime.player.position;
    runtime.turnTo = lookAtAngles([p.x, FIRST_PERSON.eyeHeight, p.z], [PROPS.npc.x, BACKFLIP.pivot + 0.2, PROPS.npc.z]);
  }
  if (st.settings.sound) sfx.flip();
  track("easter_egg_found", { egg: "backflip" });
  return true;
}

export function walkTo(target: Vec2, opts: { heading?: number; stationId?: string; sprint?: boolean } = {}): boolean {
  const path = findPath(navGrid(), runtime.player.position, target);
  if (!path) return false;
  runtime.path = path;
  runtime.pathEndHeading = opts.heading ?? null;
  runtime.pendingStationId = opts.stationId ?? null;
  runtime.autoSprint = !!opts.sprint;
  return true;
}

/** Clicking/tapping a station: interact if close, otherwise walk there first. */
export function requestStation(station: Station) {
  if (isWithinReach(runtime.player.position, station)) {
    interact(station);
    return;
  }
  walkTo(station.approach, { heading: station.approach.heading, stationId: station.id });
}

/** Fast travel from the menu / minimap: instant, then open. */
export function fastTravel(station: Station, open = true) {
  teleport(station.approach);
  useStudio.getState().setMenu(false);
  if (open) interact(station);
}

/** Called every frame by the player controller when a path finishes. */
export function arrive() {
  const id = runtime.pendingStationId;
  runtime.pendingStationId = null;
  if (runtime.pathEndHeading !== null) {
    runtime.player.heading = runtime.pathEndHeading;
    runtime.turnTo = { yaw: runtime.pathEndHeading, pitch: FP_DEFAULT_PITCH };
  }
  runtime.pathEndHeading = null;
  runtime.autoSprint = false;
  if (!id) return;
  const station = resolveStation(id);
  if (station) interact(station);
}

export function tourGo(step: number) {
  const { npc } = tourData;
  const s = npc[step];
  if (!s) return;
  const station = resolveStation(s.stationId);
  if (!station) return;
  const reduced = useStudio.getState().settings.reducedMotion;
  if (reduced) teleport(station.approach);
  else walkTo(station.approach, { heading: station.approach.heading, sprint: true });
  // No pendingStationId: the tour narrates without opening overlays.
  runtime.pendingStationId = null;
}

/** Tour steps are injected once from CMS content. */
export const tourData: { npc: { stationId: string; text: string }[] } = { npc: [] };
