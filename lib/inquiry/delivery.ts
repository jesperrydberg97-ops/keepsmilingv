import type { Inquiry } from "./schema";

/**
 * Transactional delivery of inquiries to the KSV inbox via Resend's HTTP API.
 * Plain-text email only: visitor input is never interpreted as HTML.
 */

export type DeliveryResult =
  | { ok: true; channel: "email" | "dev-log"; id?: string }
  | { ok: false; reason: "not_configured" | "provider_error" };

export function deliveryConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.INQUIRY_TO_EMAIL;
  const from = process.env.INQUIRY_FROM_EMAIL;
  const devLog = process.env.NODE_ENV !== "production" && process.env.INQUIRY_DEV_LOG === "1";
  return { apiKey, to, from, devLog, configured: Boolean(apiKey && to && from) };
}

/** Strip control characters (incl. CR/LF for header-ish fields). */
export function oneLine(v: string): string {
  return v.replace(/[\u0000-\u001f\u007f]+/g, " ").trim();
}

export function formatInquiry(i: Inquiry): { subject: string; text: string } {
  const lines: [string, string | undefined][] = [
    ["Name", i.name],
    ["Email", i.email],
  ];
  let subject: string;
  if (i.kind === "project") {
    subject = `New film inquiry — ${oneLine(i.projectType)} — ${oneLine(i.name)}`;
    lines.push(
      ["Company", i.company],
      ["Phone", i.phone],
      ["Project type", i.projectType],
      ["Dates", i.dateFrom || i.dateTo ? `${i.dateFrom ?? "?"} → ${i.dateTo ?? "?"}` : undefined],
      ["Location", i.location],
      ["Budget", i.budget],
      ["Deliverables / platforms", i.deliverables],
      ["Description", `\n${i.description}`],
    );
  } else {
    subject = `Print request — ${oneLine(i.printTitle)} — ${oneLine(i.name)}`;
    lines.push(["Print", `${i.printTitle} (${i.printSlug})`], ["Size / material", i.variant], ["Delivery country", i.country], ["Message", i.message ? `\n${i.message}` : undefined]);
  }
  const text = [
    ...lines.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
    "",
    "The sender consented to the privacy policy and to being contacted about this inquiry.",
    "Sent from the Keep Smiling Visuals website.",
  ].join("\n");
  return { subject: subject.slice(0, 180), text };
}

export async function deliverInquiry(i: Inquiry): Promise<DeliveryResult> {
  const cfg = deliveryConfig();
  const { subject, text } = formatInquiry(i);

  if (!cfg.configured) {
    if (cfg.devLog) {
      console.info(`[inquiry:dev-log] ${subject}\n${text}`);
      return { ok: true, channel: "dev-log" };
    }
    return { ok: false, reason: "not_configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: cfg.from,
        to: [cfg.to],
        reply_to: oneLine(i.email),
        subject,
        text,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error("[inquiry] provider rejected message", res.status);
      return { ok: false, reason: "provider_error" };
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, channel: "email", id: data.id };
  } catch (err) {
    console.error("[inquiry] provider unreachable", err instanceof Error ? err.message : err);
    return { ok: false, reason: "provider_error" };
  }
}
