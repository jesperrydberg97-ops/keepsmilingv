import type { Metadata } from "next";
import { PageIntro, PageShell } from "@/components/site/PageShell";
import { PlaceholderBadge } from "@/components/ui/PlaceholderBadge";

export const metadata: Metadata = { title: "Terms", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <PageShell>
      <PageIntro eyebrow="Legal" title="Terms">
        <PlaceholderBadge label="Draft — requires legal review before launch" />
      </PageIntro>
      <div className="prose-ksv">
        <p>All films, photographs and other content on this site belong to Keep Smiling Visuals or the respective clients and may not be reused without permission.</p>
        <p>
          Print sales are not yet open online. Print requests are inquiries only; no purchase contract is formed and nothing is charged until price,
          shipping, taxes, delivery time and return conditions have been confirmed with you in writing.
        </p>
        <p><em>Owner to supply full terms of sale (consumer rights, right of withdrawal, delivery, returns) before enabling checkout.</em></p>
      </div>
    </PageShell>
  );
}
