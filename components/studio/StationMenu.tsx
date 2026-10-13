"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { fastTravel } from "@/game/actions";
import { useStudio } from "@/game/store";
import { useContent } from "./OverlayHost";

/** Accessible fast-travel list of every station — the non-spatial way through the studio. */
export function StationMenu() {
  const open = useStudio((s) => s.menuOpen);
  const setMenu = useStudio((s) => s.setMenu);
  const all = useStudio((s) => s.stations);
  const stations = useMemo(() => all.filter((x) => x.listed), [all]);
  const setGuide = useStudio((s) => s.setGuide);
  const { npc } = useContent();
  if (!open) return null;
  return (
    <Dialog title="Stations" onClose={() => setMenu(false)} size="md">
      <ul className="grid gap-2 sm:grid-cols-2">
        {stations.map((s) => (
          <li key={s.id}>
            <button className="card flex w-full flex-col items-start gap-0.5 p-4 text-left hover:border-amber" onClick={() => fastTravel(s)}>
              <span className="font-semibold">{s.type === "gallery-frame" ? "Gallery wall" : s.label}</span>
              <span className="text-sm text-muted">{npc.stationDescriptions[s.id] ?? (s.type === "gallery-frame" ? "View photographs & request prints" : s.prompt)}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          className="btn btn-ghost"
          onClick={() => {
            setMenu(false);
            setGuide({ open: true, mode: "greeting" });
          }}
        >
          Talk to the guide
        </button>
        <Link className="btn btn-ghost" href="/projects">
          View without 3D
        </Link>
      </div>
    </Dialog>
  );
}
