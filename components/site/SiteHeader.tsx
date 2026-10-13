import Link from "next/link";
import { NAV } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="display text-2xl" aria-label="Keep Smiling Visuals — home">
          Keep Smiling <em className="text-amber">Visuals</em>
        </Link>
        <nav aria-label="Main">
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link className="inline-block py-2 hover:text-paper" href={n.href}>
                  {n.label}
                </Link>
              </li>
            ))}
            <li>
              <Link className="btn btn-ghost !min-h-9 !px-3 !py-1 text-xs" href="/">
                Enter 3D studio
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
