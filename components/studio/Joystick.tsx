"use client";

import { useRef, useState } from "react";
import { runtime } from "@/game/runtime";

/**
 * Virtual joystick for touch devices. Writes to runtime.input.joystick
 * (x = right, y = forward). Pointer capture keeps the drag on the stick even
 * if the thumb wanders, and its events never reach the 3D canvas.
 */
export function Joystick() {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const active = useRef<number | null>(null);
  const R = 46;

  const update = (clientX: number, clientY: number) => {
    const el = base.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let dx = clientX - (r.left + r.width / 2);
    let dy = clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > R) {
      dx = (dx / d) * R;
      dy = (dy / d) * R;
    }
    setKnob({ x: dx, y: dy });
    const m = Math.min(1, d / R);
    // dead zone, then ease for fine control
    const scale = m < 0.12 ? 0 : ((m - 0.12) / 0.88) ** 1.3 / (m || 1);
    runtime.input.joystick = { x: (dx / R) * scale, y: (-dy / R) * scale };
  };
  const end = () => {
    active.current = null;
    setKnob({ x: 0, y: 0 });
    runtime.input.joystick = { x: 0, y: 0 };
  };

  return (
    <div
      ref={base}
      role="presentation"
      className="pointer-events-auto relative h-32 w-32 touch-none select-none rounded-full border border-paper/20 bg-ink/40 backdrop-blur-sm"
      onPointerDown={(e) => {
        e.stopPropagation();
        active.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => active.current === e.pointerId && update(e.clientX, e.clientY)}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
    >
      <div
        className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full border border-amber/60 bg-amber/30 shadow-lg"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
    </div>
  );
}
