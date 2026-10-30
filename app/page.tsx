import type { Metadata } from "next";
import { StudioApp } from "@/components/studio/StudioApp";
import { JsonLd } from "@/components/site/JsonLd";
import { getStudioContent } from "@/lib/content";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const content = await getStudioContent();
  const s = content.settings;
  return (
    <>
      <StudioApp content={content} />
      <noscript>
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "#0f0d0b", padding: 24 }}>
          The interactive studio needs JavaScript. Browse the <a href="/projects">projects</a>, <a href="/prints">prints</a>,{" "}
          <a href="/about">about</a>, <a href="/blog">journal</a> or <a href="/contact">contact</a> pages instead.
        </div>
      </noscript>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: s.brandName,
          url: SITE_URL,
          email: s.contactEmail,
          description: s.description,
          ...(s.baseLocation ? { address: { "@type": "PostalAddress", addressLocality: "Gothenburg", addressCountry: "SE" } } : {}),
          sameAs: s.socialLinks.map((l) => l.url),
        }}
      />
    </>
  );
}
