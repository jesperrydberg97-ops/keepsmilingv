import type { Metadata } from "next";
import { PageIntro, PageShell } from "@/components/site/PageShell";
import { TimelineList } from "@/components/panels/TimelineList";
import { getTimeline } from "@/lib/content";

export const metadata: Metadata = {
  title: "Timeline",
  description: "Milestones and stories behind the work of Keep Smiling Visuals.",
  alternates: { canonical: "/timeline" },
};

export default async function TimelinePage() {
  return (
    <PageShell>
      <PageIntro eyebrow="Project history" title="Timeline" />
      <TimelineList items={await getTimeline()} />
    </PageShell>
  );
}
