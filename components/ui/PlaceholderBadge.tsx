/** Visible marker for seed content that is not factual and must be replaced. */
export function PlaceholderBadge({ show = true, label = "Placeholder" }: { show?: boolean; label?: string }) {
  if (!show) return null;
  return (
    <span
      className="inline-flex w-fit items-center rounded-full border border-dashed border-amber/60 px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-widest text-amber"
      title="Placeholder content — replace before launch"
    >
      {label}
    </span>
  );
}
