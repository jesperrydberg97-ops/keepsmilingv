/**
 * Rate limiting for the inquiry endpoint.
 *
 * - With UPSTASH_REDIS_REST_URL/TOKEN set, a fixed-window counter in Redis is
 *   shared across all serverless instances (recommended in production).
 * - Otherwise an in-memory sliding window is used. It is per-instance, so it
 *   is a best-effort guard only — fine for development and low traffic.
 */

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export interface RateLimiter {
  check(key: string): Promise<RateLimitResult>;
}

export function createMemoryLimiter(limit: number, windowMs: number, now: () => number = Date.now): RateLimiter {
  const hits = new Map<string, number[]>();
  return {
    async check(key) {
      const t = now();
      const list = (hits.get(key) ?? []).filter((x) => t - x < windowMs);
      if (list.length >= limit) {
        hits.set(key, list);
        return { ok: false, remaining: 0, retryAfterSeconds: Math.ceil((windowMs - (t - list[0]!)) / 1000) };
      }
      list.push(t);
      hits.set(key, list);
      // Opportunistic cleanup so the map can't grow without bound.
      if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((x) => t - x < windowMs)) hits.delete(k);
      return { ok: true, remaining: limit - list.length, retryAfterSeconds: 0 };
    },
  };
}

export function createUpstashLimiter(url: string, token: string, limit: number, windowSeconds: number): RateLimiter {
  return {
    async check(key) {
      const bucket = Math.floor(Date.now() / 1000 / windowSeconds);
      const redisKey = `ksv:inquiry:${key}:${bucket}`;
      const res = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify([
          ["INCR", redisKey],
          ["EXPIRE", redisKey, String(windowSeconds)],
        ]),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`rate limiter unavailable (${res.status})`);
      const data = (await res.json()) as { result: number }[];
      const count = Number(data[0]?.result ?? 0);
      const ok = count <= limit;
      return {
        ok,
        remaining: Math.max(0, limit - count),
        retryAfterSeconds: ok ? 0 : windowSeconds - (Math.floor(Date.now() / 1000) % windowSeconds),
      };
    },
  };
}

let shared: RateLimiter | null = null;
export function getInquiryLimiter(): RateLimiter {
  if (shared) return shared;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  shared = url && token ? createUpstashLimiter(url, token, 5, 600) : createMemoryLimiter(5, 10 * 60 * 1000);
  return shared;
}
