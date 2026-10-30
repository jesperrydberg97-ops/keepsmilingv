import type { Metadata } from "next";
import { PageIntro, PageShell } from "@/components/site/PageShell";
import { PrintGrid } from "@/components/panels/PrintDetail";
import { getPrints, getSiteSettings } from "@/lib/content";

export const metadata: Metadata = {
  title: "Prints",
  description: "Photographic prints by Keep Smiling Visuals.",
  alternates: { canonical: "/prints" },
};

export default async function PrintsPage() {
  const [prints, settings] = await Promise.all([getPrints(), getSiteSettings()]);
  return (
    <PageShell>
      <PageIntro eyebrow="Photography" title="Prints">
        {settings.commerce.disclosure}
      </PageIntro>
      <PrintGrid prints={prints} />
    </PageShell>
  );
}
