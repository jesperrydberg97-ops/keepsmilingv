import type { Metadata } from "next";
import { PageIntro, PageShell } from "@/components/site/PageShell";
import { PlaceholderBadge } from "@/components/ui/PlaceholderBadge";
import { getSiteSettings } from "@/lib/content";

export const metadata: Metadata = { title: "Privacy policy", alternates: { canonical: "/privacy" } };

export default async function PrivacyPage() {
  const s = await getSiteSettings();
  return (
    <PageShell>
      <PageIntro eyebrow="Legal" title="Privacy policy">
        <PlaceholderBadge label="Draft — requires legal review before launch" />
      </PageIntro>
      <div className="prose-ksv">
        <p>
          This draft describes how the Keep Smiling Visuals website handles personal data. It reflects how the site is built, but it has not been
          reviewed by a lawyer and must be checked against GDPR and Swedish requirements before launch.
        </p>
        <h2>Who is responsible</h2>
        <p>
          Keep Smiling Visuals ({s.baseLocation}). Contact: {s.contactEmail}. <em>Owner to add legal entity name and organisation number.</em>
        </p>
        <h2>Inquiries and print requests</h2>
        <p>
          When you send an inquiry we receive the details you enter (name, email and the optional fields you choose to fill in). They are delivered
          to our inbox via a transactional email provider and used only to reply to you and plan your project. Legal basis: your consent and steps
          taken at your request prior to entering a contract. <em>Owner to set a retention period.</em>
        </p>
        <p>
          While you fill in the inquiry form, a draft is kept in your browser&apos;s session storage so you don&apos;t lose it if you close the
          panel. It never leaves your device unless you send it and is deleted when you close the tab or after sending.
        </p>
        <h2>Videos and music players</h2>
        <p>
          Videos are hosted on YouTube and shown in privacy-enhanced mode. Nothing is loaded from YouTube until you press play. When you do,
          YouTube (Google) receives technical data such as your IP address. Music players from streaming platforms likewise load only when you
          choose to open them.
        </p>
        <h2>Analytics</h2>
        <p>
          Analytics are off unless enabled by the site owner. If enabled, they are only sent after you accept them, contain no form contents, and
          record only anonymous events such as which studio station was opened.
        </p>
        <h2>Local preferences</h2>
        <p>Your studio settings (sound, graphics quality, tutorial seen) are stored in your browser&apos;s local storage and never sent to us.</p>
        <h2>Your rights</h2>
        <p>You can ask for access to, correction of or deletion of your data by emailing {s.contactEmail}. You may also complain to IMY (Integritetsskyddsmyndigheten).</p>
      </div>
    </PageShell>
  );
}
