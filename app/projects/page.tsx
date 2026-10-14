import type { Metadata } from "next";
import { PageIntro, PageShell } from "@/components/site/PageShell";
import { ProjectBrowser } from "@/components/panels/ProjectBrowser";
import { getProjects } from "@/lib/content";

export const metadata: Metadata = {
  title: "Projects",
  description: "Films by Keep Smiling Visuals — commercials, events, music videos, documentaries and more.",
  alternates: { canonical: "/projects" },
};

export default async function ProjectsPage() {
  const projects = await getProjects();
  return (
    <PageShell>
      <PageIntro eyebrow="Portfolio" title="Projects">
        Films, aftermovies, music videos and stories — browse by category or search.
      </PageIntro>
      <ProjectBrowser projects={projects} mode="page" />
    </PageShell>
  );
}
