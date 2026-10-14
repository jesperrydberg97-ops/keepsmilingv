import type { Metadata } from "next";
import { PageIntro, PageShell } from "@/components/site/PageShell";
import { InquiryForm } from "@/components/panels/InquiryForm";
import { ContactOptions } from "@/components/panels/ContactOptions";
import { getSiteSettings } from "@/lib/content";

export const metadata: Metadata = {
  title: "Contact & project inquiry",
  description: "Start a film or photography project with Keep Smiling Visuals.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const settings = await getSiteSettings();
  return (
    <PageShell>
      <PageIntro eyebrow="Booking desk" title="Start a project">
        Tell us what you&apos;re dreaming up. Every inquiry gets a personal reply.
      </PageIntro>
      <div className="grid gap-12 lg:grid-cols-[3fr_2fr]">
        <section aria-label="Project inquiry form" className="card p-5 sm:p-8">
          <InquiryForm settings={settings} />
        </section>
        <aside aria-label="Other ways to reach us">
          <ContactOptions settings={settings} inquiry={<span className="text-sm text-amber">← Use the form on this page</span>} />
        </aside>
      </div>
    </PageShell>
  );
}
