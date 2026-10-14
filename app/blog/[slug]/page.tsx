import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/site/PageShell";
import { BlogArticle } from "@/components/panels/BlogArticle";
import { JsonLd } from "@/components/site/JsonLd";
import { getBlogPost, getBlogPosts } from "@/lib/content";
import { SITE_URL } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getBlogPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getBlogPost((await params).slug);
  if (!p) return {};
  return {
    title: p.seo?.title ?? p.title,
    description: p.seo?.description ?? p.excerpt,
    alternates: { canonical: `/blog/${p.slug}` },
    openGraph: { type: "article", publishedTime: p.date, images: p.cover ? [p.cover.src] : undefined },
    robots: p.placeholder ? { index: false } : undefined,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const p = await getBlogPost((await params).slug);
  if (!p) notFound();
  return (
    <PageShell>
      <BlogArticle post={p} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: p.title,
          datePublished: p.date,
          author: { "@type": "Organization", name: p.author },
          image: p.cover ? `${SITE_URL}${p.cover.src}` : undefined,
          mainEntityOfPage: `${SITE_URL}/blog/${p.slug}`,
        }}
      />
    </PageShell>
  );
}
