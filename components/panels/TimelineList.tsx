import Link from "next/link";
import type { TimelineItem } from "@/schemas/content";
import { PlaceholderBadge } from "@/components/ui/PlaceholderBadge";
import { formatDate } from "@/lib/site";

export function TimelineList({ items, onProject }: { items: TimelineItem[]; onProject?: (slug: string) => void }) {
  if (items.length === 0) return <p className="text-muted">The timeline is empty for now.</p>;
  return (
    <ol className="relative space-y-8 border-l border-line-strong pl-6">
      {items.map((t) => (
        <li key={t.id} className="relative">
          <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-amber bg-ink" aria-hidden />
          <p className="eyebrow">{t.date ? <time dateTime={t.date}>{formatDate(t.date)}</time> : "Undated"}</p>
          <h3 className="mt-1 text-xl font-semibold">{t.title}</h3>
          <PlaceholderBadge show={t.placeholder} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {t.image && <img src={t.image.src} alt={t.image.alt} loading="lazy" className="mt-3 max-w-sm rounded-lg" />}
          <p className="mt-2 max-w-2xl text-muted">{t.description}</p>
          {t.project &&
            (onProject ? (
              <button className="mt-2 text-sm text-amber underline" onClick={() => onProject(t.project!)}>
                See the project
              </button>
            ) : (
              <Link className="mt-2 inline-block text-sm text-amber underline" href={`/projects/${t.project}`}>
                See the project
              </Link>
            ))}
        </li>
      ))}
    </ol>
  );
}
