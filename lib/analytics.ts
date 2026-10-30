/**
 * Privacy-first analytics. Events carry only an event name and a few
 * whitelisted, non-personal properties (ids, categories) — never form text.
 * Nothing is sent unless NEXT_PUBLIC_ANALYTICS_ENDPOINT is configured AND the
 * visitor has accepted analytics.
 */

export type AnalyticsEvent =
  | "studio_entered"
  | "station_visited"
  | "project_opened"
  | "youtube_play_clicked"
  | "inquiry_started"
  | "inquiry_submitted"
  | "print_viewed"
  | "print_request_submitted"
  | "checkout_started"
  | "contact_clicked"
  | "fallback_used"
  | "easter_egg_found"
  | "tour_started";

const ALLOWED_PROPS = new Set(["station", "project", "print", "category", "panel", "reason", "source", "egg", "quality"]);
const CONSENT_KEY = "ksv-analytics-consent";

export function sanitizeProps(props: Record<string, unknown> = {}): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(props)) {
    if (!ALLOWED_PROPS.has(k)) continue;
    if (typeof v === "number" || typeof v === "boolean") out[k] = v;
    else if (typeof v === "string") out[k] = v.slice(0, 80);
  }
  return out;
}

export function analyticsEndpoint(): string | undefined {
  return process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT || undefined;
}

export function getConsent(): "granted" | "denied" | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(v: "granted" | "denied") {
  try {
    localStorage.setItem(CONSENT_KEY, v);
  } catch {
    /* storage unavailable — consent stays session-only (i.e. not granted) */
  }
}

export function track(event: AnalyticsEvent, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const payload = { event, props: sanitizeProps(props), path: window.location.pathname, ts: Date.now() };
  window.dispatchEvent(new CustomEvent("ksv:analytics", { detail: payload }));
  const endpoint = analyticsEndpoint();
  if (!endpoint || getConsent() !== "granted") {
    if (process.env.NODE_ENV === "development") console.debug("[analytics]", payload);
    return;
  }
  try {
    const body = JSON.stringify(payload);
    if (!navigator.sendBeacon?.(endpoint, new Blob([body], { type: "application/json" })))
      void fetch(endpoint, { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
  } catch {
    /* analytics must never break the experience */
  }
}
