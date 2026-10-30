import Link from "next/link";
import { getSiteSettings } from "@/lib/content";

export async function SiteFooter() {
  const s = await getSiteSettings();
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-muted sm:grid-cols-3 sm:px-6">
        <div>
          <p className="display text-xl text-paper">{s.brandName}</p>
          <p className="mt-1">{s.tagline}</p>
          {s.baseLocation && <p className="mt-1">{s.baseLocation}</p>}
        </div>
        <div>
          <p className="eyebrow mb-2">Contact</p>
          <a className="hover:text-paper" href={`mailto:${s.contactEmail}`}>
            {s.contactEmail}
          </a>
          {s.socialLinks.length > 0 && (
            <ul className="mt-2 flex gap-3">
              {s.socialLinks.map((l) => (
                <li key={l.url}>
                  <a className="hover:text-paper" href={l.url} rel="noopener noreferrer" target="_blank">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <nav aria-label="Legal">
          <p className="eyebrow mb-2">Info</p>
          <ul className="space-y-1">
            <li><Link className="hover:text-paper" href="/privacy">Privacy policy</Link></li>
            <li><Link className="hover:text-paper" href="/terms">Terms</Link></li>
            <li><Link className="hover:text-paper" href="/contact">Start a project</Link></li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
