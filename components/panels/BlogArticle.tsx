import type { BlogPost } from "@/schemas/content";
import { PlaceholderBadge } from "@/components/ui/PlaceholderBadge";
import { formatDate } from "@/lib/site";
import { RichText } from "./RichText";

export function BlogArticle({ post }: { post: BlogPost }) {
  return (
    <article className="mx-auto max-w-3xl">
      <p className="eyebrow">{post.category}</p>
      <h1 className="display mt-3 text-4xl sm:text-5xl">{post.title}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted">
        <span>{post.author}</span>·<time dateTime={post.date}>{formatDate(post.date)}</time>
        <PlaceholderBadge show={post.placeholder} />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {post.cover && <img src={post.cover.src} alt={post.cover.alt} className="mt-8 aspect-[16/9] w-full rounded-xl object-cover" />}
      <div className="mt-8">
        <RichText blocks={post.body} />
      </div>
    </article>
  );
}
