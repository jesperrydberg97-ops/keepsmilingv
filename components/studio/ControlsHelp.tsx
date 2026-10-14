"use client";

const ROWS: [string, string][] = [
  ["Move", "W A S D or ↑ ↓ · on touch: joystick (bottom left)"],
  ["Walk to a spot", "Click or tap the floor"],
  ["Use something", "Walk close and press E / Enter, or click / tap it, or the Interact button"],
  ["Look around", "Drag with mouse or one finger · ← → keys turn"],
  ["Zoom", "Mouse wheel or pinch (third-person view only)"],
  ["Change view", "Settings → Camera view: first or third person"],
  ["Sprint", "Hold Shift"],
  ["Close a panel", "Esc, the Close button or your device's Back button"],
  ["Go anywhere instantly", "Stations menu (top bar)"],
];

export function ControlsHelp() {
  return (
    <div className="space-y-5">
      <dl className="divide-y divide-line">
        {ROWS.map(([k, v]) => (
          <div key={k} className="grid gap-1 py-3 sm:grid-cols-[180px_1fr]">
            <dt className="font-semibold">{k}</dt>
            <dd className="text-muted">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted">
        Prefer a regular website? Everything in the studio is also available as normal pages — use “View without 3D” in the top bar.
      </p>
    </div>
  );
}
