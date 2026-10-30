import type { About } from "@/schemas/content";
import { PlaceholderBadge } from "@/components/ui/PlaceholderBadge";

export function AboutContent({ about, cta }: { about: About; cta: React.ReactNode }) {
  return (
    <div className="space-y-12">
      <section>
        <p className="eyebrow">Mission</p>
        <p className="display mt-3 max-w-3xl text-3xl sm:text-4xl">{about.mission}</p>
        {about.placeholder && (
          <div className="mt-3">
            <PlaceholderBadge label="Draft copy — owner to confirm" />
          </div>
        )}
      </section>
      <section aria-labelledby="founder-heading" className="grid gap-8 md:grid-cols-[1fr_2fr]">
        <h2 id="founder-heading" className="display text-3xl">
          The founder
        </h2>
        <div className="prose-ksv">
          {about.founderIntro.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </section>
      <section aria-labelledby="approach-heading">
        <h2 id="approach-heading" className="display mb-5 text-3xl">
          Creative approach
        </h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {about.approach.map((a) => (
            <li key={a.title} className="card p-5">
              <p className="font-semibold">{a.title}</p>
              <p className="mt-2 text-sm text-muted">{a.text}</p>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="services-heading">
        <h2 id="services-heading" className="display mb-5 text-3xl">
          Services
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {about.services.map((s) => (
            <li key={s.title} className="border-t border-line pt-4">
              <p className="font-semibold">{s.title}</p>
              <p className="mt-1 text-sm text-muted">{s.text}</p>
            </li>
          ))}
        </ul>
      </section>
      {about.collaborations.length > 0 && (
        <section aria-labelledby="collab-heading">
          <h2 id="collab-heading" className="display mb-4 text-3xl">
            Selected collaborations
          </h2>
          <ul className="flex flex-wrap gap-3">
            {about.collaborations.map((c) => (
              <li key={c.name} className="rounded-full border border-line-strong px-4 py-2 text-sm">
                {c.url ? (
                  <a href={c.url} target="_blank" rel="noopener noreferrer">
                    {c.name}
                  </a>
                ) : (
                  c.name
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="card flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="display text-2xl">Have a story worth telling?</p>
          <p className="text-sm text-muted">Tell us about your project — it takes two minutes.</p>
        </div>
        {cta}
      </section>
    </div>
  );
}
