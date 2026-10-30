"use client";

import type { SiteSettings } from "@/schemas/content";
import { track } from "@/lib/analytics";

/** Quick-contact choices — real, configured channels only. */
export function ContactOptions({ settings, inquiry }: { settings: SiteSettings; inquiry: React.ReactNode }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <a className="card group flex flex-col gap-1 p-5 hover:border-amber" href={`mailto:${settings.contactEmail}`} onClick={() => track("contact_clicked", { source: "email" })}>
        <span className="eyebrow">Email</span>
        <span className="break-all text-lg group-hover:text-amber-strong">{settings.contactEmail}</span>
      </a>
      {settings.publicPhone && (
        <a className="card group flex flex-col gap-1 p-5 hover:border-amber" href={`tel:${settings.publicPhone.replace(/\s/g, "")}`} onClick={() => track("contact_clicked", { source: "phone" })}>
          <span className="eyebrow">Phone</span>
          <span className="text-lg group-hover:text-amber-strong">{settings.publicPhone}</span>
        </a>
      )}
      <div className="card flex flex-col gap-2 p-5">
        <span className="eyebrow">Film project</span>
        <span className="text-sm text-muted">Planning a shoot? The inquiry form gets us everything we need to reply properly.</span>
        {inquiry}
      </div>
      {settings.socialLinks.length > 0 && (
        <div className="card p-5 sm:col-span-2">
          <span className="eyebrow">Social</span>
          <ul className="mt-2 flex flex-wrap gap-3">
            {settings.socialLinks.map((l) => (
              <li key={l.url}>
                <a className="btn btn-ghost" href={l.url} target="_blank" rel="noopener noreferrer" onClick={() => track("contact_clicked", { source: l.label })}>
                  {l.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
