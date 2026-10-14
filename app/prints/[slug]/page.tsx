import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/site/PageShell";
import { PrintDetail } from "@/components/panels/PrintDetail";
import { getPrint, getPrints, getSiteSettings } from "@/lib/content";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getPrints()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getPrint((await params).slug);
  if (!p) return {};
  return {
    title: p.seo?.title ?? `${p.title} — print`,
    description: p.seo?.description ?? p.story ?? `Photographic print: ${p.title}`,
    alternates: { canonical: `/prints/${p.slug}` },
    openGraph: { images: [p.image.src] },
    robots: p.placeholder ? { index: false } : undefined,
  };
}

export default async function PrintPage({ params }: Props) {
  const [p, settings] = await Promise.all([getPrint((await params).slug), getSiteSettings()]);
  if (!p) notFound();
  return (
    <PageShell>
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
        <Link href="/prints" className="hover:text-paper">
          Prints
        </Link>{" "}
        / <span className="text-paper">{p.title}</span>
      </nav>
      <h1 className="sr-only">{p.title}</h1>
      <PrintDetail print={p} settings={settings} />
    </PageShell>
  );
}
