"use client";

import { useEffect, useMemo, useRef } from "react";
import { fastTravel } from "@/game/actions";
import { STUDIO_LAYOUT } from "@/game/layout";
import { runtime } from "@/game/runtime";
import { useStudio } from "@/game/store";

const { bounds } = STUDIO_LAYOUT;
const W = bounds.maxX - bounds.minX;
const D = bounds.maxZ - bounds.minZ;
const SCALE = 7; // px per metre

/** Top-down minimap; station dots double as fast-travel buttons. */
export function Minimap() {
  const all = useStudio((s) => s.stations);
  const stations = useMemo(() => all.filter((x) => x.listed), [all]);
  const nearest = useStudio((s) => s.nearestStationId);
  const arrow = useRef<SVGGElement>(null);

  useEffect(() => {
    let id = 0;
    const tick = () => {
      const p = runtime.player.position;
      const deg = (-runtime.player.heading * 180) / Math.PI + 180;
      arrow.current?.setAttribute("transform", `translate(${(p.x - bounds.minX) * SCALE} ${(p.z - bounds.minZ) * SCALE}) rotate(${deg})`);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <nav aria-label="Minimap" className="pointer-events-auto rounded-xl border border-line bg-ink/70 p-2 backdrop-blur-md">
      <svg width={W * SCALE} height={D * SCALE} viewBox={`0 0 ${W * SCALE} ${D * SCALE}`} className="block">
        <rect x={0} y={0} width={W * SCALE} height={D * SCALE} rx={4} fill="#1c1813" stroke="rgba(240,232,218,0.25)" />
        {STUDIO_LAYOUT.colliders
          .filter((c) => !c.id.startsWith("wall"))
          .map((c) => (
            <rect
              key={c.id}
              x={(c.minX - bounds.minX) * SCALE}
              y={(c.minZ - bounds.minZ) * SCALE}
              width={(c.maxX - c.minX) * SCALE}
              height={(c.maxZ - c.minZ) * SCALE}
              fill="rgba(240,232,218,0.14)"
            />
          ))}
        <rect x={(W / 2 - 1.2) * SCALE} y={D * SCALE - 3} width={2.4 * SCALE} height={3} fill="#e8a955" />
        {stations.map((s) => (
          <a
            key={s.id}
            href="#"
            role="button"
            aria-label={`Go to ${s.label}`}
            onClick={(e) => {
              e.preventDefault();
              fastTravel(s);
            }}
          >
            <title>{s.label}</title>
            <circle cx={(s.position.x - bounds.minX) * SCALE} cy={(s.position.z - bounds.minZ) * SCALE} r={nearest === s.id ? 6 : 4.5} fill={nearest === s.id ? "#f5bd70" : "#b3a895"} stroke="#0f0d0b" strokeWidth={1.5} />
          </a>
        ))}
        <g ref={arrow} aria-hidden>
          <path d="M0 -7 L5 5 L0 2 L-5 5 Z" fill="#f5bd70" stroke="#0f0d0b" strokeWidth={1} />
        </g>
      </svg>
    </nav>
  );
}
