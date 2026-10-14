"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PROJECT_CATEGORIES, type Project } from "@/schemas/content";
import { YouTubePlayer } from "@/components/ui/YouTubePlayer";
import { PlaceholderBadge } from "@/components/ui/PlaceholderBadge";
import { track } from "@/lib/analytics";
import { formatDate } from "@/lib/site";

/**
 * Streaming-style portfolio browser with a KSV identity: featured hero,
 * category rails (only populated ones), search and filters, detail view.
 * `mode="page"` links to /projects/[slug]; `mode="overlay"` shows details
 * in place (used by the in-studio TV).
 */

const categoryLabel = (id: string) => PROJECT_CATEGORIES.find((c) => c.id === id)?.label ?? id;

export function ProjectBrowser({
  projects,
  mode,
  onBook,
  initialSlug,
}: {
  projects: Project[];
  mode: "page" | "overlay";
  onBook?: () => void;
  initialSlug?: string;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [selected, setSelected] = useState<string | null>(initialSlug ?? null);

  const populated = useMemo(() => PROJECT_CATEGORIES.filter((c) => projects.some((p) => p.category === c.id)), [projects]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter(
      (p) =>
        (category === "all" || p.category === category) &&
        (!q || [p.title, p.summary, p.client ?? "", ...p.tags, ...p.roles].some((t) => t.toLowerCase().includes(q))),
    );
  }, [projects, query, category]);

  const featured = projects.find((p) => p.featured) ?? projects[0];
  const current = selected ? projects.find((p) => p.slug === selected) : undefined;

  if (projects.length === 0) {
    return <p className="text-muted">No projects have been published yet.</p>;
  }

  if (current && mode === "overlay") {
    return (
      <ProjectDetail
        project={current}
        related={projects.filter((p) => p.category === current.category && p.slug !== current.slug).slice(0, 4)}
        onBack={() => setSelected(null)}
        onSelect={setSelected}
        onBook={onBook}
      />
    );
  }

  const open = (p: Project) => {
    track("project_opened", { project: p.slug, category: p.category });
    setSelected(p.slug);
  };
  const searching = query.trim() !== "" || category !== "all";

  return (
    <div className="space-y-10">
      {featured && !searching && (
        <section aria-label="Featured project" className="relative overflow-hidden rounded-2xl border border-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {featured.thumbnail && <img src={featured.thumbnail.src} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />}
          <div className="relative flex min-h-[280px] flex-col justify-end gap-3 bg-gradient-to-r from-ink via-ink/80 to-transparent p-6 sm:min-h-[340px] sm:p-10">
            <p className="eyebrow">Featured · {categoryLabel(featured.category)}</p>
            <h2 className="display max-w-xl text-4xl sm:text-5xl">{featured.title}</h2>
            <PlaceholderBadge show={featured.placeholder} />
            <p className="max-w-lg text-muted">{featured.summary}</p>
            <div className="mt-2 flex flex-wrap gap-3">
              <ProjectAction project={featured} mode={mode} onOpen={open} primary label="Watch" />
            </div>
          </div>
        </section>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-xs">
          <span className="sr-only">Search projects</span>
          <input type="search" className="field pl-10" placeholder="Search projects" value={query} onChange={(e) => setQuery(e.target.value)} />
          <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </label>
        <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
          {[{ id: "all", label: "All Projects" }, ...populated].map((c) => (
            <button
              key={c.id}
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${category === c.id ? "border-amber bg-amber/15 text-amber-strong" : "border-line-strong text-muted hover:text-paper"}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {searching ? (
        <section aria-label="Results">
          <p className="mb-4 text-sm text-muted" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "project" : "projects"}
          </p>
          {filtered.length === 0 ? (
            <p className="text-muted">Nothing matches that search yet.</p>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <li key={p.slug}>
                  <ProjectCard project={p} mode={mode} onOpen={open} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        populated.map((c) => {
          const items = projects.filter((p) => p.category === c.id);
          return (
            <section key={c.id} aria-labelledby={`rail-${c.id}`}>
              <h2 id={`rail-${c.id}`} className="mb-3 text-lg font-semibold">
                {c.label}
              </h2>
              <ul className="scrollbar-thin -mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-3">
                {items.map((p) => (
                  <li key={p.slug} className="w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-[31%]">
                    <ProjectCard project={p} mode={mode} onOpen={open} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}

function ProjectAction({ project, mode, onOpen, label, primary }: { project: Project; mode: "page" | "overlay"; onOpen: (p: Project) => void; label: string; primary?: boolean }) {
  const cls = `btn ${primary ? "btn-primary" : "btn-ghost"}`;
  if (mode === "page")
    return (
      <Link href={`/projects/${project.slug}`} className={cls} onClick={() => track("project_opened", { project: project.slug })}>
        {label}
      </Link>
    );
  return (
    <button className={cls} onClick={() => onOpen(project)}>
      {label}
    </button>
  );
}

function ProjectCard({ project: p, mode, onOpen }: { project: Project; mode: "page" | "overlay"; onOpen: (p: Project) => void }) {
  const inner = (
    <>
      <div className="relative aspect-video overflow-hidden rounded-lg bg-surface-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {p.thumbnail && <img src={p.thumbnail.src} alt={p.thumbnail.alt} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />}
        {!p.youtubeId && <span className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-0.5 text-[0.7rem] text-muted">No video yet</span>}
      </div>
      <div className="mt-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold group-hover:text-amber-strong">{p.title}</p>
          <p className="text-sm text-muted">
            {categoryLabel(p.category)}
            {p.date ? ` · ${formatDate(p.date)}` : ""}
          </p>
        </div>
        <PlaceholderBadge show={p.placeholder} />
      </div>
    </>
  );
  if (mode === "page")
    return (
      <Link href={`/projects/${p.slug}`} className="group block">
        {inner}
      </Link>
    );
  return (
    <button className="group block w-full text-left" onClick={() => onOpen(p)}>
      {inner}
    </button>
  );
}

export function ProjectDetail({
  project: p,
  related,
  onBack,
  onSelect,
  onBook,
}: {
  project: Project;
  related: Project[];
  onBack?: () => void;
  onSelect?: (slug: string) => void;
  onBook?: () => void;
}) {
  return (
    <article className="space-y-6">
      {onBack && (
        <button className="btn btn-ghost !min-h-9 text-sm" onClick={onBack}>
          ← All projects
        </button>
      )}
      <YouTubePlayer videoId={p.youtubeId} title={p.title} poster={p.thumbnail?.src} analyticsProps={{ project: p.slug }} />
      <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
        <div>
          <p className="eyebrow">{categoryLabel(p.category)}</p>
          <h2 className="display mt-2 text-4xl">{p.title}</h2>
          <div className="mt-2">
            <PlaceholderBadge show={p.placeholder} />
          </div>
          <p className="mt-4 text-lg text-muted">{p.summary}</p>
          {p.description && <p className="prose-ksv mt-4">{p.description}</p>}
        </div>
        <dl className="card h-fit space-y-3 p-5 text-sm">
          {p.client && (
            <div>
              <dt className="text-muted">Client</dt>
              <dd>{p.client}</dd>
            </div>
          )}
          {p.roles.length > 0 && (
            <div>
              <dt className="text-muted">KSV roles</dt>
              <dd>{p.roles.join(", ")}</dd>
            </div>
          )}
          {p.date && (
            <div>
              <dt className="text-muted">Date</dt>
              <dd>{formatDate(p.date)}</dd>
            </div>
          )}
          <div className="pt-2">
            {onBook ? (
              <button className="btn btn-primary w-full" onClick={onBook}>
                Start a project like this
              </button>
            ) : (
              <Link className="btn btn-primary w-full" href="/contact">
                Start a project like this
              </Link>
            )}
          </div>
        </dl>
      </div>
      {related.length > 0 && (
        <section aria-labelledby="related-heading">
          <h3 id="related-heading" className="mb-3 text-lg font-semibold">
            Related work
          </h3>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((r) => (
              <li key={r.slug}>
                {onSelect ? (
                  <button className="group w-full text-left" onClick={() => onSelect(r.slug)}>
                    <RelatedInner p={r} />
                  </button>
                ) : (
                  <Link href={`/projects/${r.slug}`} className="group block">
                    <RelatedInner p={r} />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

function RelatedInner({ p }: { p: Project }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {p.thumbnail && <img src={p.thumbnail.src} alt={p.thumbnail.alt} loading="lazy" className="aspect-video w-full rounded-lg object-cover" />}
      <p className="mt-2 text-sm font-semibold group-hover:text-amber-strong">{p.title}</p>
    </>
  );
}
