import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/site/PageShell";
import { ProjectDetail } from "@/components/panels/ProjectBrowser";
import { JsonLd } from "@/components/site/JsonLd";
import { getProject, getProjects } from "@/lib/content";
import { SITE_URL } from "@/lib/site";
import { youtubeThumbnail } from "@/lib/youtube";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getProjects()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProject((await params).slug);
  if (!p) return {};
  return {
    title: p.seo?.title ?? p.title,
    description: p.seo?.description ?? p.summary,
    alternates: { canonical: `/projects/${p.slug}` },
    openGraph: { title: p.title, description: p.summary, images: p.thumbnail ? [p.thumbnail.src] : undefined },
    robots: p.placeholder ? { index: false } : undefined,
  };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const all = await getProjects();
  const p = all.find((x) => x.slug === slug);
  if (!p) notFound();
  return (
    <PageShell>
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
        <Link href="/projects" className="hover:text-paper">
          Projects
        </Link>{" "}
        / <span className="text-paper">{p.title}</span>
      </nav>
      <h1 className="sr-only">{p.title}</h1>
      <ProjectDetail project={p} related={all.filter((r) => r.category === p.category && r.slug !== p.slug).slice(0, 4)} />
      {p.youtubeId && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "VideoObject",
            name: p.title,
            description: p.summary,
            thumbnailUrl: p.thumbnail ? `${SITE_URL}${p.thumbnail.src}` : youtubeThumbnail(p.youtubeId),
            embedUrl: `https://www.youtube-nocookie.com/embed/${p.youtubeId}`,
            ...(p.date ? { uploadDate: p.date } : {}),
          }}
        />
      )}
    </PageShell>
  );
}
