const ID = /^[A-Za-z0-9_-]{11}$/;

export function isYouTubeId(id: string | null | undefined): id is string {
  return typeof id === "string" && ID.test(id);
}

/**
 * Privacy-enhanced embed URL (youtube-nocookie.com). Only built after the
 * visitor presses play, so no YouTube request happens before consent-by-click.
 */
export function youtubeEmbedUrl(id: string, opts: { autoplay?: boolean; start?: number } = {}): string {
  if (!isYouTubeId(id)) throw new Error("invalid YouTube id");
  const params = new URLSearchParams({ rel: "0", modestbranding: "1", playsinline: "1" });
  if (opts.autoplay) params.set("autoplay", "1");
  if (opts.start) params.set("start", String(Math.max(0, Math.floor(opts.start))));
  return `https://www.youtube-nocookie.com/embed/${id}?${params}`;
}

export function youtubeThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function youtubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}
