export type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; channel: "email" | "dev-log" }
  | { kind: "invalid"; fields: Record<string, string> }
  | { kind: "rate_limited"; retryAfterSeconds: number }
  | { kind: "unavailable" }
  | { kind: "error" };

/** POST to the inquiry endpoint; success only when the server says so. */
export async function submitInquiry(payload: unknown): Promise<SubmitState> {
  try {
    const res = await fetch("/api/inquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => null)) as
      | { ok: true; channel: "email" | "dev-log" }
      | { ok: false; error: string; fields?: Record<string, string>; retryAfterSeconds?: number }
      | null;
    if (res.ok && data?.ok === true) return { kind: "success", channel: data.channel };
    if (data && data.ok === false) {
      if (data.error === "invalid") return { kind: "invalid", fields: data.fields ?? { form: "Please check the form." } };
      if (data.error === "rate_limited") return { kind: "rate_limited", retryAfterSeconds: data.retryAfterSeconds ?? 600 };
      if (data.error === "not_configured") return { kind: "unavailable" };
    }
    return { kind: "error" };
  } catch {
    return { kind: "error" };
  }
}
