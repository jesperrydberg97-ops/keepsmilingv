"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { isYouTubeId, youtubeThumbnail, youtubeWatchUrl } from "@/lib/youtube";
import { track } from "@/lib/analytics";

/**
 * Click-to-load YouTube player. Nothing is requested from YouTube until the
 * visitor presses play; then the official IFrame Player API is loaded with the
 * privacy-enhanced youtube-nocookie.com host so we can detect errors such as
 * "embedding disabled" and offer a fallback link instead of a dead frame.
 */

type YTPlayer = { destroy(): void };
type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      host: string;
      videoId: string;
      playerVars: Record<string, string | number>;
      events: { onReady?: () => void; onError?: (e: { data: number }) => void };
    },
  ) => YTPlayer;
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;
function loadApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      if (window.YT) resolve(window.YT);
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    s.onerror = () => {
      apiPromise = null;
      reject(new Error("YouTube API failed to load"));
    };
    document.head.appendChild(s);
  });
  return apiPromise;
}

const ERROR_TEXT: Record<number, string> = {
  2: "This video link looks invalid.",
  5: "This video can't be played in the browser player.",
  100: "This video is private or has been removed.",
  101: "The owner doesn't allow this video to be played here.",
  150: "The owner doesn't allow this video to be played here.",
};

export function YouTubePlayer({
  videoId,
  title,
  poster,
  analyticsProps,
  className = "",
}: {
  videoId: string | null;
  title: string;
  poster?: string;
  analyticsProps?: Record<string, string>;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string>("");
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const labelId = useId();

  useEffect(() => () => playerRef.current?.destroy(), []);
  useEffect(() => {
    playerRef.current?.destroy();
    playerRef.current = null;
    setState("idle");
  }, [videoId]);

  const play = useCallback(async () => {
    if (!isYouTubeId(videoId) || !mountRef.current) return;
    track("youtube_play_clicked", analyticsProps);
    setState("loading");
    try {
      const YT = await loadApi();
      const el = document.createElement("div");
      mountRef.current.replaceChildren(el);
      playerRef.current = new YT.Player(el, {
        host: "https://www.youtube-nocookie.com",
        videoId,
        playerVars: { autoplay: 1, rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: () => setState("ready"),
          onError: (e) => {
            setError(ERROR_TEXT[e.data] ?? "This video couldn't be played.");
            setState("error");
          },
        },
      });
    } catch {
      setError("The YouTube player couldn't load. Check your connection or open the video on YouTube.");
      setState("error");
    }
  }, [videoId, analyticsProps]);

  const valid = isYouTubeId(videoId);
  const thumb = poster ?? (valid ? youtubeThumbnail(videoId) : undefined);

  return (
    <div className={`relative aspect-video w-full overflow-hidden rounded-xl bg-black ${className}`} aria-labelledby={labelId}>
      <span id={labelId} className="sr-only">
        Video: {title}
      </span>
      <div ref={mountRef} className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full" />
      {state !== "ready" && (
        <div className="absolute inset-0">
          {thumb && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" className="h-full w-full object-cover opacity-70" loading="lazy" />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-6 text-center">
            {!valid ? (
              <p className="max-w-sm rounded-lg bg-black/60 px-4 py-3 text-sm text-muted">
                Video not available yet — a YouTube video ID hasn&apos;t been added for this item.
              </p>
            ) : state === "error" ? (
              <div className="max-w-sm rounded-lg bg-black/70 px-4 py-3 text-sm" role="alert">
                <p>{error}</p>
                <div className="mt-3 flex justify-center gap-2">
                  <button className="btn btn-ghost !min-h-9 text-xs" onClick={play}>
                    Try again
                  </button>
                  <a className="btn btn-primary !min-h-9 text-xs" href={youtubeWatchUrl(videoId)} target="_blank" rel="noopener noreferrer">
                    Watch on YouTube
                  </a>
                </div>
              </div>
            ) : (
              <>
                <button
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-amber text-amber-ink shadow-xl transition hover:scale-105 hover:bg-amber-strong disabled:opacity-60"
                  onClick={play}
                  disabled={state === "loading"}
                  aria-label={`Play ${title}`}
                >
                  {state === "loading" ? (
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-amber-ink border-t-transparent" aria-hidden />
                  ) : (
                    <svg viewBox="0 0 24 24" className="ml-1 h-8 w-8" fill="currentColor" aria-hidden>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
                <p className="text-xs text-paper/70">Plays via YouTube (privacy-enhanced mode)</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
