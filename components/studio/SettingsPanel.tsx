"use client";

import { useStudio } from "@/game/store";

export function SettingsPanel() {
  const s = useStudio((x) => x.settings);
  const quality = useStudio((x) => x.quality);
  const update = useStudio((x) => x.updateSettings);
  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
      <fieldset>
        <legend className="field-label">Graphics quality</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["auto", `Auto (${quality})`],
              ["high", "High"],
              ["low", "Low — faster, saves battery"],
            ] as const
          ).map(([v, label]) => (
            <label key={v} className={`cursor-pointer rounded-full border px-3 py-2 text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-amber-strong ${s.quality === v ? "border-amber bg-amber/15 text-amber-strong" : "border-line-strong"}`}>
              <input type="radio" name="quality" className="sr-only" checked={s.quality === v} onChange={() => update({ quality: v })} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="field-label">Camera view</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["first", "First person"],
              ["third", "Third person"],
            ] as const
          ).map(([v, label]) => (
            <label key={v} className={`cursor-pointer rounded-full border px-3 py-2 text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-amber-strong ${s.cameraMode === v ? "border-amber bg-amber/15 text-amber-strong" : "border-line-strong"}`}>
              <input type="radio" name="cameraMode" className="sr-only" checked={s.cameraMode === v} onChange={() => update({ cameraMode: v })} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <Toggle label="Reduced motion" hint="Snappier camera, no ambient animation, instant travel." checked={s.reducedMotion} onChange={(v) => update({ reducedMotion: v })} />
      <Toggle label="Sound effects" hint="Off by default. Videos and music only play when you press play." checked={s.sound} onChange={(v) => update({ sound: v })} />
      <Toggle label="Show minimap" checked={s.showMinimap} onChange={(v) => update({ showMinimap: v })} />
      <Toggle label="Welcome guide on arrival" checked={s.guideEnabled} onChange={(v) => update({ guideEnabled: v })} />
      <div>
        <label htmlFor="sens" className="field-label">
          Camera sensitivity <span className="font-normal text-muted">({s.sensitivity.toFixed(1)}×)</span>
        </label>
        <input id="sens" type="range" min={0.4} max={2} step={0.1} value={s.sensitivity} onChange={(e) => update({ sensitivity: Number(e.target.value) })} className="w-full accent-[var(--color-amber)]" />
      </div>
      <p className="text-xs text-muted">Preferences are saved in this browser only.</p>
    </form>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block font-semibold">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
      <input type="checkbox" role="switch" className="mt-1 h-6 w-6 shrink-0 accent-[var(--color-amber)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
