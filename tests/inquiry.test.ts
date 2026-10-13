import { describe, expect, it, vi } from "vitest";
import { handleInquiry } from "@/lib/inquiry/handler";
import { createMemoryLimiter } from "@/lib/inquiry/rateLimit";
import { formatInquiry } from "@/lib/inquiry/delivery";
import { parseInquiry } from "@/lib/inquiry/schema";

const NOW = 1_800_000_000_000;
const valid = {
  kind: "project",
  name: "Alex Example",
  email: "alex@example.com",
  projectType: "commercial",
  description: "We would like a 60 second brand film for our spring launch.",
  consent: true,
  website: "",
  startedAt: NOW - 60_000,
};

function req(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/inquiry", {
    method: "POST",
    headers: { "content-type": "application/json", host: "localhost", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const okDeliver = vi.fn(async () => ({ ok: true as const, channel: "email" as const }));
const deps = () => ({ limiter: createMemoryLimiter(100, 60_000), deliver: okDeliver, now: () => NOW });

describe("inquiry validation", () => {
  it("accepts a valid project inquiry", () => {
    expect(parseInquiry(valid).success).toBe(true);
  });
  it("reports specific field errors", () => {
    const r = parseInquiry({ ...valid, email: "nope", description: "short", consent: false });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path[0]);
      expect(paths).toEqual(expect.arrayContaining(["email", "description", "consent"]));
    }
  });
  it("rejects end date before start date", () => {
    const r = parseInquiry({ ...valid, dateFrom: "2026-05-02", dateTo: "2026-05-01" });
    expect(r.success).toBe(false);
  });
  it("validates print requests", () => {
    const r = parseInquiry({ kind: "print", name: "Sam", email: "s@example.com", consent: true, startedAt: NOW, printSlug: "x", printTitle: "X", variant: "", country: "SE" });
    expect(r.success).toBe(false);
  });
});

describe("inquiry handler", () => {
  it("delivers and confirms only after delivery succeeds", async () => {
    const r = await handleInquiry(req(valid), deps());
    expect(r.status).toBe(200);
    expect(okDeliver).toHaveBeenCalledOnce();
  });

  it("never reports success when delivery is not configured", async () => {
    const r = await handleInquiry(req(valid), { ...deps(), deliver: async () => ({ ok: false, reason: "not_configured" }) });
    expect(r.status).toBe(503);
    expect(r.body.ok).toBe(false);
  });

  it("maps provider failure to 502", async () => {
    const r = await handleInquiry(req(valid), { ...deps(), deliver: async () => ({ ok: false, reason: "provider_error" }) });
    expect(r.status).toBe(502);
  });

  it("rejects honeypot submissions without hinting", async () => {
    const deliver = vi.fn();
    const r = await handleInquiry(req({ ...valid, website: "http://spam" }), { ...deps(), deliver });
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).not.toContain("website");
    expect(deliver).not.toHaveBeenCalled();
  });

  it("rejects instant submissions (time trap)", async () => {
    const r = await handleInquiry(req({ ...valid, startedAt: NOW - 500 }), deps());
    expect(r.status).toBe(400);
  });

  it("rejects cross-origin posts", async () => {
    const r = await handleInquiry(req(valid, { origin: "https://evil.example" }), deps());
    expect(r.status).toBe(403);
  });

  it("rejects oversized and non-JSON bodies", async () => {
    expect((await handleInquiry(req({ ...valid, description: "x".repeat(30_000) }), deps())).status).toBe(413);
    const r = new Request("http://localhost/api/inquiry", { method: "POST", headers: { "content-type": "text/plain", host: "localhost" }, body: "hi" });
    expect((await handleInquiry(r, deps())).status).toBe(415);
  });

  it("rate limits per client", async () => {
    const d = { ...deps(), limiter: createMemoryLimiter(2, 60_000, () => NOW) };
    const h = { "x-forwarded-for": "203.0.113.9" };
    expect((await handleInquiry(req(valid, h), d)).status).toBe(200);
    expect((await handleInquiry(req(valid, h), d)).status).toBe(200);
    const third = await handleInquiry(req(valid, h), d);
    expect(third.status).toBe(429);
  });
});

describe("email formatting", () => {
  it("strips line breaks from the subject", () => {
    const parsed = parseInquiry({ ...valid, name: "Eve\r\nBcc: x@y.z" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(formatInquiry(parsed.data).subject).not.toMatch(/[\r\n]/);
  });
});
