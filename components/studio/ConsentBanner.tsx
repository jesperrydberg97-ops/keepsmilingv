"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { analyticsEndpoint, getConsent, setConsent } from "@/lib/analytics";

/** Only shown when an analytics endpoint is configured; otherwise nothing is collected. */
export function ConsentBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(Boolean(analyticsEndpoint()) && getConsent() === null);
  }, []);
  if (!show) return null;
  const choose = (v: "granted" | "denied") => {
    setConsent(v);
    setShow(false);
  };
  return (
    <div role="region" aria-label="Analytics consent" className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-lg rounded-2xl border border-line-strong bg-surface p-4 text-sm shadow-xl">
      <p>
        May we count anonymous visits (no cookies, no form contents) to improve the studio?{" "}
        <Link href="/privacy" className="text-amber underline">
          Privacy policy
        </Link>
      </p>
      <div className="mt-3 flex gap-2">
        <button className="btn btn-primary !min-h-10 text-sm" onClick={() => choose("granted")}>
          Allow
        </button>
        <button className="btn btn-ghost !min-h-10 text-sm" onClick={() => choose("denied")}>
          No thanks
        </button>
      </div>
    </div>
  );
}
