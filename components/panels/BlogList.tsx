import Link from "next/link";
import type { BlogPost } from "@/schemas/content";
import { PlaceholderBadge } from "@/components/ui/PlaceholderBadge";
import { formatDate } from "@/lib/site";

export function BlogList({ posts, onSelect }: { posts: BlogPost[]; onSelect?: (slug: string) => void }) {
  if (posts.length === 0) return <p className="text-muted">No journal posts yet.</p>;
  const categories = [...new Set(posts.map((p) => p.category))];
  return (
    <div className="space-y-10">
      {categories.map((c) => (
        <section key={c} aria-labelledby={`cat-${c}`}>
          <h2 id={`cat-${c}`} className="eyebrow mb-4">
            {c}
          </h2>
          <ul className="grid gap-6 sm:grid-cols-2">
            {posts
              .filter((p) => p.category === c)
              .map((p) => {
                const inner = (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.cover && <img src={p.cover.src} alt={p.cover.alt} loading="lazy" className="aspect-[16/9] w-full rounded-lg object-cover" />}
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                      <time dateTime={p.date}>{formatDate(p.date)}</time>
                      <PlaceholderBadge show={p.placeholder} />
                    </div>
                    <p className="display mt-1 text-2xl group-hover:text-amber-strong">{p.title}</p>
                    <p className="mt-1 text-sm text-muted">{p.excerpt}</p>
                  </>
                );
                return (
                  <li key={p.slug}>
                    {onSelect ? (
                      <button className="group block w-full text-left" onClick={() => onSelect(p.slug)}>
                        {inner}
                      </button>
                    ) : (
                      <Link href={`/blog/${p.slug}`} className="group block">
                        {inner}
                      </Link>
                    )}
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}
