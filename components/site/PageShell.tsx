import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 sm:pt-14">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}

export function PageIntro({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-10 max-w-3xl">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="display mt-3 text-5xl sm:text-6xl">{title}</h1>
      {children && <div className="mt-4 text-lg text-muted">{children}</div>}
    </div>
  );
}
