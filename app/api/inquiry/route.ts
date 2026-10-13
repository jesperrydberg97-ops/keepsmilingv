import { NextResponse } from "next/server";
import { handleInquiry } from "@/lib/inquiry/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const res = await handleInquiry(req);
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (res.status === 429) headers["Retry-After"] = String(res.body.retryAfterSeconds);
  return NextResponse.json(res.body, { status: res.status, headers });
}

export function GET() {
  return NextResponse.json({ ok: false, error: "method_not_allowed" }, { status: 405, headers: { Allow: "POST" } });
}
