"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { founderBackflip, interact, navGrid } from "@/game/actions";
import { buildStations } from "@/game/layout";
import { detectQuality, hasWebGL, type QualityTier } from "@/game/quality";
import { resetRuntime, runtime } from "@/game/runtime";
import { inputBlocked, loadSettings, tutorialSeen, useStudio } from "@/game/store";
import type { StudioContent } from "@/lib/content";
import { NAV } from "@/lib/site";
import { track } from "@/lib/analytics";
import { ContentContext, OverlayHost } from "./OverlayHost";
import { Hud } from "./Hud";
import { StationMenu } from "./StationMenu";
import { ConsentBanner } from "./ConsentBanner";

const Scene = dynamic(() => import("@/components/world/Scene"), { ssr: false });

type Phase = "checking" | "unsupported" | "entry" | "playing";

const GAME_KEYS = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ShiftLeft", "ShiftRight"]);

function isTypingTarget(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
}

export function StudioApp({ content }: { content: StudioContent }) {
  const [phase, setPhase] = useState<Phase>("checking");
  const [mountScene, setMountScene] = useState(false);
  const [ready, setReady] = useState(false);
  const [wantsEnter, setWantsEnter] = useState(false);
  const [detected, setDetected] = useState<QualityTier>("high");
  const [firstVisit, setFirstVisit] = useState(false);
  const settings = useStudio((s) => s.settings);
  const blocked = useStudio((s) => inputBlocked(s));
  const rootRef = useRef<HTMLDivElement>(null);

  const quality: QualityTier = settings.quality === "auto" ? detected : settings.quality;

  // One-time setup: settings, capability detection, stations from content.
  useEffect(() => {
    resetRuntime();
    const s = loadSettings();
    const visible = content.settings.stations;
    const stations = buildStations(content.prints).filter(
      (st) => visible[st.id] !== false && (st.type !== "easter-egg" || content.settings.features.easterEggs) && (st.type !== "npc" || content.settings.features.welcomeGuide),
    );
    useStudio.setState({ settings: s, stations, panel: null, guide: { open: false }, menuOpen: false });
    setFirstVisit(!tutorialSeen());
    if (!hasWebGL()) {
      setPhase("unsupported");
      track("fallback_used", { reason: "no_webgl" });
      return;
    }
    const q = detectQuality();
    setDetected(q);
    navGrid(); // bake the navmesh up front
    setPhase("entry");
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    // Preload the studio in the background unless the visitor asked to save data.
    if (!saveData) setMountScene(true);
  }, [content]);

  useEffect(() => useStudio.getState().setQuality(quality), [quality]);

  const enter = useCallback(() => {
    setPhase("playing");
    track("studio_entered", { quality });
    const st = useStudio.getState();
    if (st.settings.guideEnabled && content.settings.features.welcomeGuide) st.setGuide({ open: true, mode: "greeting" });
    if (firstVisit) {
      try {
        localStorage.setItem("ksv-studio-tutorial-seen", "1");
      } catch {}
    }
    requestAnimationFrame(() => rootRef.current?.focus({ preventScroll: true }));
  }, [quality, content.settings.features.welcomeGuide, firstVisit]);

  useEffect(() => {
    if (wantsEnter && ready && phase === "entry") enter();
  }, [wantsEnter, ready, phase, enter]);

  // Keyboard input (only while playing, never while typing or in a dialog).
  useEffect(() => {
    if (phase !== "playing") return;
    const down = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const st = useStudio.getState();
      if (inputBlocked(st)) return;
      if (GAME_KEYS.has(e.code)) {
        runtime.input.keys.add(e.code);
        if (e.code.startsWith("Arrow")) e.preventDefault();
        return;
      }
      const onWorld = e.target === rootRef.current || e.target === document.body;
      if (e.code === "KeyB" && !e.repeat) {
        founderBackflip();
        return;
      }
      if (e.code === "KeyE" || (e.key === "Enter" && onWorld) || (e.code === "Space" && onWorld)) {
        const near = st.stations.find((s) => s.id === st.nearestStationId);
        if (near) {
          e.preventDefault();
          interact(near);
        }
      }
    };
    const up = (e: KeyboardEvent) => runtime.input.keys.delete(e.code);
    const clear = () => runtime.input.keys.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", clear);
    };
  }, [phase]);

  // Releasing held keys when a dialog opens prevents "stuck walking".
  useEffect(() => {
    if (blocked) {
      runtime.input.keys.clear();
      runtime.input.joystick = { x: 0, y: 0 };
    }
  }, [blocked]);

  const notes = useMemo(() => content.about.noticeboardNotes, [content.about.noticeboardNotes]);
  const onReady = useCallback(() => setReady(true), []);

  return (
    <ContentContext.Provider value={content}>
      <div className="fixed inset-0 overflow-hidden bg-ink">
        <div ref={rootRef} tabIndex={-1} className="absolute inset-0 outline-none" inert={blocked || phase !== "playing" ? true : undefined} aria-label="Keep Smiling Visuals 3D studio">
          {mountScene && phase !== "unsupported" && (
            <Scene quality={quality} prints={content.prints} settings={content.settings} timeline={content.timeline} notes={notes} guideName={content.npc.guideName} onReady={onReady} />
          )}
          {phase === "playing" && <Hud showHint={firstVisit} />}
        </div>
        {phase === "playing" && (
          <>
            <OverlayHost />
            <StationMenu />
          </>
        )}
        {phase !== "playing" && (
          <EntryScreen
            content={content}
            phase={phase}
            ready={ready}
            loading={mountScene}
            waiting={wantsEnter}
            onExplore={() => {
              setMountScene(true);
              setWantsEnter(true);
            }}
          />
        )}
        <ConsentBanner />
      </div>
    </ContentContext.Provider>
  );
}

function LoadProgress() {
  const progress = useStudio((s) => s.loadProgress);
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-label="Loading the studio" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
      <div className="h-full bg-amber transition-[width] duration-300" style={{ width: `${Math.max(8, progress)}%` }} />
    </div>
  );
}

/**
 * Branded entry. Server-rendered with real text and links, so the home page is
 * meaningful without JavaScript or WebGL and indexable by search engines.
 */
function EntryScreen({
  content,
  phase,
  ready,
  loading,
  waiting,
  onExplore,
}: {
  content: StudioContent;
  phase: Phase;
  ready: boolean;
  loading: boolean;
  waiting: boolean;
  onExplore: () => void;
}) {
  const s = content.settings;
  return (
    <div className="absolute inset-0 z-20 overflow-y-auto bg-[radial-gradient(ellipse_at_70%_20%,rgba(232,169,85,0.16),transparent_55%),linear-gradient(to_bottom,rgba(15,13,11,0.75),#0f0d0b)]">
      <main id="main" className="mx-auto flex min-h-full max-w-5xl flex-col justify-center px-5 py-16 sm:px-8">
        <p className="eyebrow">{s.baseLocation ?? "Studio"} · Film · Photography · Stories</p>
        <h1 className="display mt-4 text-6xl sm:text-8xl">
          Keep Smiling <em className="text-amber">Visuals</em>
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted">
          {s.tagline} Step into the studio — walk around, press play on the TV, browse the gallery and start your project at the booking desk.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {phase === "unsupported" ? (
            <p role="alert" className="max-w-md rounded-xl border border-line-strong bg-surface p-4 text-sm">
              Your browser or device can&apos;t show the 3D studio (WebGL is unavailable). Everything is available on the regular website below.
            </p>
          ) : (
            <button className="btn btn-primary !min-h-12 !px-6 text-base" onClick={onExplore} disabled={phase === "checking" || (waiting && !ready)} aria-describedby="studio-status">
              {waiting && !ready ? "Loading the studio…" : "Explore the studio"}
            </button>
          )}
          <Link className="btn btn-ghost !min-h-12 !px-6 text-base" href="/projects" onClick={() => track("fallback_used", { source: "entry" })}>
            View work without 3D
          </Link>
        </div>
        <div id="studio-status" className="mt-4 h-6 max-w-xs text-xs text-muted">
          {phase !== "unsupported" && loading && !ready && <LoadProgress />}
          {ready && <span>Studio ready. Sound is off — turn it on any time.</span>}
        </div>

        <nav aria-label="Site" className="mt-12 border-t border-line pt-6">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link className="hover:text-paper" href={n.href}>
                  {n.label}
                </Link>
              </li>
            ))}
            <li>
              <a className="hover:text-paper" href={`mailto:${s.contactEmail}`}>
                {s.contactEmail}
              </a>
            </li>
          </ul>
        </nav>
      </main>
    </div>
  );
}
