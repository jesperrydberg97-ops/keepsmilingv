import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro, PageShell } from "@/components/site/PageShell";
import { AboutContent } from "@/components/panels/AboutContent";
import { getAbout } from "@/lib/content";

export const metadata: Metadata = {
  title: "About",
  description: "About Keep Smiling Visuals — mission, founder, creative approach and services.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const about = await getAbout();
  return (
    <PageShell>
      <PageIntro eyebrow="About" title="Keep Smiling Visuals" />
      <AboutContent
        about={about}
        cta={
          <Link className="btn btn-primary" href="/contact">
            Start a project
          </Link>
        }
      />
    </PageShell>
  );
}
