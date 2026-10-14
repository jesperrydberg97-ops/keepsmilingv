import { deliverInquiry, type DeliveryResult } from "./delivery";
import { getInquiryLimiter, type RateLimiter } from "./rateLimit";
import { fieldErrors, parseInquiry, MAX_FILL_MS, MIN_FILL_MS, type Inquiry } from "./schema";

/**
 * Framework-agnostic inquiry handler so it can be unit tested without Next.
 * Response bodies never echo submitted content back.
 */

export const MAX_BODY_BYTES = 20_000;

export interface HandlerDeps {
  limiter?: RateLimiter;
  deliver?: (i: Inquiry) => Promise<DeliveryResult>;
  now?: () => number;
}

export type InquiryResponse =
  | { status: 200; body: { ok: true; channel: "email" | "dev-log" } }
  | { status: 400; body: { ok: false; error: "invalid"; fields: Record<string, string> } }
  | { status: 403 | 413 | 415; body: { ok: false; error: "forbidden" | "too_large" | "unsupported" } }
  | { status: 429; body: { ok: false; error: "rate_limited"; retryAfterSeconds: number } }
  | { status: 502 | 503; body: { ok: false; error: "not_configured" | "provider_error" } };

export function clientKey(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || headers.get("x-real-ip") || "unknown";
}

/** Reject cross-site posts: if an Origin header is present it must match Host. */
export function sameOrigin(headers: Headers): boolean {
  const origin = headers.get("origin");
  if (!origin) return true;
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function handleInquiry(req: Request, deps: HandlerDeps = {}): Promise<InquiryResponse> {
  const now = deps.now ?? Date.now;
  if (!sameOrigin(req.headers)) return { status: 403, body: { ok: false, error: "forbidden" } };
  if (!(req.headers.get("content-type") ?? "").includes("application/json"))
    return { status: 415, body: { ok: false, error: "unsupported" } };

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return { status: 413, body: { ok: false, error: "too_large" } };

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { status: 400, body: { ok: false, error: "invalid", fields: { form: "Malformed request" } } };
  }

  const limiter = deps.limiter ?? getInquiryLimiter();
  try {
    const rl = await limiter.check(clientKey(req.headers));
    if (!rl.ok) return { status: 429, body: { ok: false, error: "rate_limited", retryAfterSeconds: rl.retryAfterSeconds } };
  } catch (err) {
    // Fail open on a limiter outage so real clients can still reach KSV;
    // validation and the honeypot still apply. Logged for monitoring.
    console.error("[inquiry] rate limiter error", err instanceof Error ? err.message : err);
  }

  const parsed = parseInquiry(json);
  if (!parsed.success) {
    const fields = fieldErrors(parsed.error);
    // Bots that fill the honeypot get a generic answer, not a hint.
    if (fields.website) return { status: 400, body: { ok: false, error: "invalid", fields: { form: "Could not send" } } };
    return { status: 400, body: { ok: false, error: "invalid", fields } };
  }

  const age = now() - parsed.data.startedAt;
  if (age < MIN_FILL_MS || age > MAX_FILL_MS) {
    return {
      status: 400,
      body: { ok: false, error: "invalid", fields: { form: "That was quick! Please review your details and send again." } },
    };
  }

  const result = await (deps.deliver ?? deliverInquiry)(parsed.data);
  if (!result.ok) {
    return result.reason === "not_configured"
      ? { status: 503, body: { ok: false, error: "not_configured" } }
      : { status: 502, body: { ok: false, error: "provider_error" } };
  }
  return { status: 200, body: { ok: true, channel: result.channel } };
}
