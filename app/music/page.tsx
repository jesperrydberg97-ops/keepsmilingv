import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { MusicPanel } from "@/components/panels/MusicPanel";
import { getSiteSettings } from "@/lib/content";

export const metadata: Metadata = {
  title: "Music — Free Music Plug",
  description: "The Free Music Plug music project, featured in the Keep Smiling Visuals studio.",
  alternates: { canonical: "/music" },
};

export default async function MusicPage() {
  const s = await getSiteSettings();
  return (
    <PageShell>
      <h1 className="sr-only">Music</h1>
      <MusicPanel music={s.music} />
    </PageShell>
  );
}
