"use client";

import { create } from "zustand";
import type { PanelId, Station } from "./types";
import type { QualityTier } from "./quality";

export interface StudioSettings {
  quality: "auto" | QualityTier;
  reducedMotion: boolean;
  /** Camera orbit sensitivity multiplier (0.4 – 2). */
  sensitivity: number;
  /** Sound effects; off by default. */
  sound: boolean;
  /** Welcome guide pops up on entry. */
  guideEnabled: boolean;
  showMinimap: boolean;
}

const SETTINGS_KEY = "ksv-studio-settings";
const TUTORIAL_KEY = "ksv-studio-tutorial-seen";

export const DEFAULT_SETTINGS: StudioSettings = {
  quality: "auto",
  reducedMotion: false,
  sensitivity: 1,
  sound: false,
  guideEnabled: true,
  showMinimap: true,
};

export function loadSettings(): StudioSettings {
  const prefersReduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<StudioSettings>) : {};
    return { ...DEFAULT_SETTINGS, reducedMotion: !!prefersReduced, ...saved };
  } catch {
    return { ...DEFAULT_SETTINGS, reducedMotion: !!prefersReduced };
  }
}

function saveSettings(s: StudioSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* preferences stay in memory */
  }
}

export function tutorialSeen(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_KEY) === "1";
  } catch {
    return false;
  }
}

export interface ActivePanel {
  id: PanelId;
  params?: Record<string, string>;
  /** Station that opened it, so focus/camera can be restored. */
  stationId?: string;
}

export type GuideState =
  | { open: false }
  | { open: true; mode: "greeting" }
  | { open: true; mode: "tour"; step: number }
  | { open: true; mode: "help" };

export interface Toast {
  id: number;
  title: string;
  text: string;
}

interface StudioState {
  stations: Station[];
  nearestStationId: string | null;
  hoveredStationId: string | null;
  panel: ActivePanel | null;
  guide: GuideState;
  tutorialOpen: boolean;
  menuOpen: boolean;
  toast: Toast | null;
  flash: number;
  clapAt: number;
  settings: StudioSettings;
  quality: QualityTier;
  contextLost: boolean;
  /** 0–100 asset loading progress reported by the scene. */
  loadProgress: number;

  setStations(s: Station[]): void;
  setNearest(id: string | null): void;
  setHovered(id: string | null): void;
  openPanel(p: ActivePanel): void;
  closePanel(): void;
  setGuide(g: GuideState): void;
  setTutorial(open: boolean): void;
  setMenu(open: boolean): void;
  showToast(title: string, text: string): void;
  dismissToast(): void;
  triggerFlash(): void;
  triggerClap(): void;
  updateSettings(patch: Partial<StudioSettings>): void;
  setQuality(q: QualityTier): void;
  setContextLost(v: boolean): void;
}

let toastId = 0;

export const useStudio = create<StudioState>((set, get) => ({
  stations: [],
  nearestStationId: null,
  hoveredStationId: null,
  panel: null,
  guide: { open: false },
  tutorialOpen: false,
  menuOpen: false,
  toast: null,
  flash: 0,
  clapAt: 0,
  settings: DEFAULT_SETTINGS,
  quality: "high",
  contextLost: false,
  loadProgress: 0,

  setStations: (stations) => set({ stations }),
  setNearest: (id) => get().nearestStationId !== id && set({ nearestStationId: id }),
  setHovered: (id) => get().hoveredStationId !== id && set({ hoveredStationId: id }),
  openPanel: (panel) => set({ panel, menuOpen: false }),
  closePanel: () => set({ panel: null }),
  setGuide: (guide) => set({ guide }),
  setTutorial: (tutorialOpen) => {
    if (!tutorialOpen)
      try {
        localStorage.setItem(TUTORIAL_KEY, "1");
      } catch {}
    set({ tutorialOpen });
  },
  setMenu: (menuOpen) => set({ menuOpen }),
  showToast: (title, text) => set({ toast: { id: ++toastId, title, text } }),
  dismissToast: () => set({ toast: null }),
  triggerFlash: () => set({ flash: Date.now() }),
  triggerClap: () => set({ clapAt: Date.now() }),
  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    saveSettings(settings);
    set({ settings });
  },
  setQuality: (quality) => set({ quality }),
  setContextLost: (contextLost) => set({ contextLost }),
}));

/** Game input is suppressed while any modal UI is open. */
export function inputBlocked(s: Pick<StudioState, "panel" | "tutorialOpen" | "menuOpen">): boolean {
  return s.panel !== null || s.tutorialOpen || s.menuOpen;
}
