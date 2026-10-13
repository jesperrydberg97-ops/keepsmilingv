"use client";

import { useEffect, useRef } from "react";
import { fastTravel, resolveStation, tourData, tourGo } from "@/game/actions";
import { useStudio } from "@/game/store";
import { track } from "@/lib/analytics";
import { goToBooking, useContent } from "./OverlayHost";

/**
 * Scripted welcome guide. Not an AI and never speaks as the founder: it uses
 * approved copy from the CMS (NPCDialogue). Skippable at any point and can be
 * turned off permanently in settings.
 */
export function GuideDialogue() {
  const guide = useStudio((s) => s.guide);
  const setGuide = useStudio((s) => s.setGuide);
  const update = useStudio((s) => s.updateSettings);
  const { npc } = useContent();
  const headingRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    tourData.npc = npc.tour;
  }, [npc.tour]);

  const step = guide.open && guide.mode === "tour" ? guide.step : -1;
  useEffect(() => {
    if (step >= 0) tourGo(step);
  }, [step]);

  useEffect(() => {
    if (guide.open) headingRef.current?.focus({ preventScroll: true });
  }, [guide]);

  if (!guide.open) return null;
  const close = () => setGuide({ open: false });

  const choose = (id: "explore" | "work" | "book" | "tour") => {
    if (id === "explore") return close();
    if (id === "tour") {
      track("tour_started");
      return setGuide({ open: true, mode: "tour", step: 0 });
    }
    close();
    if (id === "book") return goToBooking();
    const tv = resolveStation("tv");
    if (tv) fastTravel(tv);
  };

  let body: React.ReactNode;
  if (guide.mode === "greeting") {
    body = (
      <>
        <p className="text-paper">{npc.greeting}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {npc.options.map((o) => (
            <button key={o.id} className={`btn ${o.id === "book" ? "btn-primary" : "btn-ghost"} !min-h-11 text-sm`} onClick={() => choose(o.id)}>
              {o.label}
            </button>
          ))}
        </div>
        <button
          className="mt-3 text-xs text-muted underline-offset-4 hover:text-paper hover:underline"
          onClick={() => {
            update({ guideEnabled: false });
            close();
          }}
        >
          Don&apos;t greet me on arrival
        </button>
      </>
    );
  } else if (guide.mode === "tour") {
    const s = npc.tour[guide.step]!;
    const station = resolveStation(s.stationId);
    const last = guide.step === npc.tour.length - 1;
    body = (
      <>
        <p className="text-xs text-muted" aria-live="polite">
          Stop {guide.step + 1} of {npc.tour.length}
          {station ? ` · ${station.type === "gallery-frame" ? "Gallery wall" : station.label}` : ""}
        </p>
        <p className="mt-1 text-paper">{s.text}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn btn-ghost !min-h-10 text-sm" disabled={guide.step === 0} onClick={() => setGuide({ open: true, mode: "tour", step: guide.step - 1 })}>
            Back
          </button>
          {station && station.action.kind === "panel" && (
            <button
              className="btn btn-ghost !min-h-10 text-sm"
              onClick={() => {
                close();
                fastTravel(station);
              }}
            >
              Open it
            </button>
          )}
          <button className="btn btn-primary !min-h-10 text-sm" onClick={() => (last ? close() : setGuide({ open: true, mode: "tour", step: guide.step + 1 }))}>
            {last ? "Finish tour" : "Next"}
          </button>
          {!last && (
            <button className="btn btn-ghost !min-h-10 text-sm" onClick={close}>
              End tour
            </button>
          )}
        </div>
      </>
    );
  } else {
    body = <p className="text-paper">{npc.help}</p>;
  }

  return (
    <section
      aria-label={`${npc.guideName} says`}
      className="animate-fade-up pointer-events-auto w-[min(92vw,440px)] rounded-2xl border border-sage/40 bg-ink/90 p-4 shadow-[var(--shadow-panel)] backdrop-blur-md"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          close();
        }
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <p ref={headingRef} tabIndex={-1} className="flex items-center gap-2 text-sm font-semibold text-sage outline-none">
          <span className="inline-block h-2 w-2 rounded-full bg-sage" aria-hidden />
          {npc.guideName}
          <span className="font-normal text-muted">· scripted guide</span>
        </p>
        <button className="rounded-full p-2 text-muted hover:text-paper" aria-label="Dismiss guide" onClick={close}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      {body}
    </section>
  );
}
