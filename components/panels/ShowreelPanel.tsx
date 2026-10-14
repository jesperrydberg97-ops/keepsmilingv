"use client";

import { YouTubePlayer } from "@/components/ui/YouTubePlayer";
import type { SiteSettings } from "@/schemas/content";

/**
 * Showreel: never autoplays. The YouTube player's own controls provide
 * volume and full-screen once the visitor presses play.
 */
export function ShowreelPanel({ showreel, cta }: { showreel: SiteSettings["showreel"]; cta: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Showreel</p>
        <h2 className="display mt-2 text-4xl">{showreel.title}</h2>
      </div>
      <YouTubePlayer videoId={showreel.youtubeId} title={showreel.title} analyticsProps={{ source: "showreel" }} />
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted">Like what you see? Let&apos;s make something together.</p>
        {cta}
      </div>
    </div>
  );
}
