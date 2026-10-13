import type { Metadata } from "next";
import { PageIntro, PageShell } from "@/components/site/PageShell";
import { BlogList } from "@/components/panels/BlogList";
import { getBlogPosts } from "@/lib/content";

export const metadata: Metadata = {
  title: "Journal",
  description: "Stories, behind-the-scenes notes and thoughts on visual storytelling from Keep Smiling Visuals.",
  alternates: { canonical: "/blog" },
};

export default async function BlogPage() {
  const posts = await getBlogPosts();
  return (
    <PageShell>
      <PageIntro eyebrow="Reading lounge" title="Journal" />
      <BlogList posts={posts} />
    </PageShell>
  );
}
