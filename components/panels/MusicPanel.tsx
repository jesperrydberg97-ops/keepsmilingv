"use client";

import { useState } from "react";
import type { SiteSettings } from "@/schemas/content";
import { PlaceholderBadge } from "@/components/ui/PlaceholderBadge";

/**
 * Free Music Plug corner. Uses only authorized platform embeds (allow-listed
 * hosts, validated in the schema), each loaded on click. No direct audio
 * streaming and no autoplay.
 */
export function MusicPanel({ music }: { music: SiteSettings["music"] }) {
  const [active, setActive] = useState<number | null>(null);
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Music corner</p>
        <h2 className="display mt-2 text-4xl">{music.projectName}</h2>
        <div className="mt-2">
          <PlaceholderBadge show={music.placeholder} label="Draft copy" />
        </div>
        <p className="mt-3 max-w-2xl text-muted">{music.description}</p>
      </div>
      {music.embeds.length > 0 && (
        <ul className="space-y-3">
          {music.embeds.map((e, i) => (
            <li key={e.url} className="card p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{e.title}</p>
                {active !== i && (
                  <button className="btn btn-ghost !min-h-9 text-sm" onClick={() => setActive(i)}>
                    Load player
                  </button>
                )}
              </div>
              {active === i && (
                <iframe
                  title={e.title}
                  src={e.url}
                  height={e.height}
                  className="mt-3 w-full rounded-lg border-0"
                  loading="lazy"
                  allow="encrypted-media; clipboard-write"
                  sandbox="allow-scripts allow-same-origin allow-popups"
                />
              )}
            </li>
          ))}
          <li className="text-xs text-muted">Players are provided by the streaming platform and load only when you choose to.</li>
        </ul>
      )}
      {music.links.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {music.links.map((l) => (
            <li key={l.url}>
              <a className="btn btn-ghost" href={l.url} target="_blank" rel="noopener noreferrer">
                {l.label} ↗
              </a>
            </li>
          ))}
        </ul>
      )}
      {music.embeds.length === 0 && music.links.length === 0 && (
        <p className="rounded-lg border border-dashed border-line-strong p-4 text-sm text-muted">Playlists and platform links haven&apos;t been added yet.</p>
      )}
    </div>
  );
}
