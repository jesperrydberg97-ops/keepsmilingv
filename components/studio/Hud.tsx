"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { founderBackflip, interact } from "@/game/actions";
import { useStudio } from "@/game/store";
import { HOST_AVATAR } from "@/lib/config/avatars";
import { track } from "@/lib/analytics";
import { GuideDialogue } from "./GuideDialogue";
import { Joystick } from "./Joystick";
import { Minimap } from "./Minimap";

function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const set = () => setCoarse(mq.matches);
    set();
    mq.addEventListener("change", set);
    const onTouch = () => setCoarse(true);
    window.addEventListener("touchstart", onTouch, { once: true, passive: true });
    return () => {
      mq.removeEventListener("change", set);
      window.removeEventListener("touchstart", onTouch);
    };
  }, []);
  return coarse;
}

const IconBtn = ({ label, onClick, children, pressed }: { label: string; onClick: () => void; children: React.ReactNode; pressed?: boolean }) => (
  <button
    onClick={onClick}
    aria-label={label}
    aria-pressed={pressed}
    title={label}
    className="flex h-11 w-11 items-center justify-center rounded-full border border-line-strong bg-ink/70 text-paper backdrop-blur-md transition hover:border-amber hover:text-amber-strong"
  >
    {children}
  </button>
);

export function Hud({ showHint }: { showHint: boolean }) {
  const coarse = useCoarsePointer();
  const nearestId = useStudio((s) => s.nearestStationId);
  const nearest = useStudio((s) => s.stations.find((x) => x.id === s.nearestStationId));
  const panelOpen = useStudio((s) => s.panel !== null);
  const settings = useStudio((s) => s.settings);
  const update = useStudio((s) => s.updateSettings);
  const openPanel = useStudio((s) => s.openPanel);
  const setMenu = useStudio((s) => s.setMenu);
  const toast = useStudio((s) => s.toast);
  const dismissToast = useStudio((s) => s.dismissToast);
  const flash = useStudio((s) => s.flash);
  const contextLost = useStudio((s) => s.contextLost);
  const [hint, setHint] = useState(showHint);
  const [flashOn, setFlashOn] = useState(false);

  useEffect(() => setHint(showHint), [showHint]);
  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(false), 12000);
    return () => clearTimeout(t);
  }, [hint]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(dismissToast, 7000);
    return () => clearTimeout(t);
  }, [toast, dismissToast]);
  useEffect(() => {
    if (!flash || settings.reducedMotion) return;
    setFlashOn(true);
    const t = setTimeout(() => setFlashOn(false), 120);
    return () => clearTimeout(t);
  }, [flash, settings.reducedMotion]);

  const label = nearest ? (nearest.type === "gallery-frame" ? `${nearest.label} (print)` : nearest.label) : "";

  return (
    <div className="pointer-events-none absolute inset-0 z-10 select-none" aria-hidden={panelOpen || undefined}>
      {/* Top bar */}
      <div className="flex items-start justify-between gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-5">
        <div className="pointer-events-auto rounded-2xl bg-ink/60 px-3 py-1.5 backdrop-blur-md">
          <Link href="/projects" className="display whitespace-nowrap text-lg text-paper sm:text-2xl" aria-label="Keep Smiling Visuals — view the regular website">
            Keep Smiling <em className="text-amber">Visuals</em>
          </Link>
          {!HOST_AVATAR.url && <p className="hidden font-mono text-[0.62rem] sm:block uppercase tracking-widest text-muted">Founder model: placeholder</p>}
        </div>
        <nav aria-label="Studio" className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
          <button className="btn btn-ghost !min-h-11 text-sm" onClick={() => setMenu(true)}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M4 6h16M4 12h16M4 18h10" />
            </svg>
            Stations
          </button>
          <Link href="/projects" className="btn btn-ghost hidden !min-h-11 text-sm sm:inline-flex" onClick={() => track("fallback_used", { source: "hud" })}>
            View without 3D
          </Link>
          <IconBtn label={settings.sound ? "Mute sound effects" : "Turn on sound effects"} pressed={settings.sound} onClick={() => update({ sound: !settings.sound })}>
            {settings.sound ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M11 5 6 9H3v6h3l5 4V5zM16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M11 5 6 9H3v6h3l5 4V5zM22 9l-6 6M16 9l6 6" />
              </svg>
            )}
          </IconBtn>
          <IconBtn label="Settings" onClick={() => openPanel({ id: "settings" })}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
          </IconBtn>
          <IconBtn label="Controls help" onClick={() => openPanel({ id: "help" })}>
            <span className="text-lg font-semibold" aria-hidden>
              ?
            </span>
          </IconBtn>
        </nav>
      </div>

      {/* Guide + toast (top centre) */}
      <div className="absolute inset-x-0 top-24 z-10 flex flex-col items-center gap-3 px-3">
        {toast && (
          <div role="status" className="animate-fade-up pointer-events-auto max-w-sm rounded-2xl border border-amber/40 bg-ink/90 px-4 py-3 text-center shadow-xl backdrop-blur-md">
            <p className="font-semibold text-amber-strong">{toast.title}</p>
            <p className="mt-1 text-sm text-muted">{toast.text}</p>
          </div>
        )}
      </div>
      <div className="absolute inset-x-0 top-24 flex justify-center px-3 sm:top-auto sm:bottom-28">
        <GuideDialogue />
      </div>

      {/* Interaction prompt */}
      <div className="absolute inset-x-0 bottom-6 flex justify-center px-3 pb-[env(safe-area-inset-bottom)]" aria-live="polite">
        {nearest && !panelOpen && (
          <div className="animate-fade-up flex items-center gap-3 rounded-full border border-line-strong bg-ink/80 py-2 pl-4 pr-2 text-sm shadow-xl backdrop-blur-md">
            <span>
              <span className="text-muted">{label} — </span>
              {nearest.prompt}
            </span>
            {coarse ? (
              <button className="pointer-events-auto btn btn-primary !min-h-10 !px-4 text-sm" onClick={() => interact(nearest)}>
                Interact
              </button>
            ) : (
              <button className="pointer-events-auto rounded-full border border-amber/60 px-3 py-1 font-mono text-xs text-amber-strong hover:bg-amber/10" onClick={() => interact(nearest)}>
                Press E
              </button>
            )}
          </div>
        )}
        {!nearestId && hint && !panelOpen && (
          <div className="animate-fade-up pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-line-strong bg-ink/80 px-4 py-3 text-sm backdrop-blur-md">
            <p>
              {coarse ? "Use the joystick or tap the floor to walk. Drag to look around." : "WASD to move · click the floor to walk · drag to look · E to interact."}{" "}
              <button className="text-amber underline" onClick={() => openPanel({ id: "help" })}>
                All controls
              </button>
            </p>
            <button className="text-muted hover:text-paper" aria-label="Dismiss hint" onClick={() => setHint(false)}>
              ✕
            </button>
          </div>
        )}
      </div>

      {/* The founder's party trick */}
      {!panelOpen && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <button
            onClick={() => founderBackflip()}
            className="pointer-events-auto flex flex-col items-center gap-0.5 rounded-2xl border border-amber/50 bg-ink/75 px-3 py-2 text-xs font-semibold text-amber-strong shadow-xl backdrop-blur-md transition hover:bg-amber/15 active:scale-95"
            title={coarse ? "Ask the founder for a backflip" : "Ask the founder for a backflip (B)"}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M20 12a8 8 0 1 1-2.6-5.9" />
              <path d="M20 3v4.5h-4.5" />
            </svg>
            Backflip
          </button>
        </div>
      )}

      {/* Touch controls */}
      {coarse && !panelOpen && (
        <div className="absolute bottom-24 left-4 pb-[env(safe-area-inset-bottom)] sm:bottom-8">
          <Joystick />
        </div>
      )}
      {settings.showMinimap && !panelOpen && (
        <div className="absolute bottom-6 right-4 hidden md:block">
          <Minimap />
        </div>
      )}

      {flashOn && <div className="absolute inset-0 bg-white/80" />}

      {contextLost && (
        <div role="alert" className="pointer-events-auto absolute inset-x-0 top-1/3 mx-auto w-[min(92vw,420px)] rounded-2xl border border-line-strong bg-ink p-5 text-center">
          <p className="font-semibold">The 3D view was paused by your browser.</p>
          <p className="mt-1 text-sm text-muted">This can happen when the device runs low on graphics memory.</p>
          <div className="mt-4 flex justify-center gap-2">
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Reload studio
            </button>
            <Link className="btn btn-ghost" href="/projects" onClick={() => track("fallback_used", { reason: "context_lost" })}>
              Continue without 3D
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
