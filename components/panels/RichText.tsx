import type { RichBlock } from "@/schemas/content";
import { YouTubePlayer } from "@/components/ui/YouTubePlayer";

/** Renders structured rich text as React elements — never as raw HTML. */
export function RichText({ blocks }: { blocks: RichBlock[] }) {
  return (
    <div className="prose-ksv">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "paragraph":
            return <p key={i}>{b.text}</p>;
          case "heading":
            return b.level === 3 ? <h3 key={i}>{b.text}</h3> : <h2 key={i}>{b.text}</h2>;
          case "quote":
            return (
              <blockquote key={i}>
                <p>{b.text}</p>
                {b.cite && <cite className="mt-2 block font-sans text-sm not-italic text-muted">— {b.cite}</cite>}
              </blockquote>
            );
          case "list":
            return (
              <ul key={i}>
                {b.items.map((t, j) => (
                  <li key={j}>{t}</li>
                ))}
              </ul>
            );
          case "image":
            return (
              <figure key={i} className="my-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.image.src} alt={b.image.alt} loading="lazy" className="w-full rounded-xl" />
                {b.caption && <figcaption className="mt-2 text-sm text-muted">{b.caption}</figcaption>}
              </figure>
            );
          case "youtube":
            return (
              <div key={i} className="my-8">
                <YouTubePlayer videoId={b.youtubeId} title={b.title} />
              </div>
            );
        }
      })}
    </div>
  );
}
