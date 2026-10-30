"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Print, SiteSettings } from "@/schemas/content";
import { PlaceholderBadge } from "@/components/ui/PlaceholderBadge";
import { formatPrice } from "@/lib/site";
import { track } from "@/lib/analytics";
import { printInquirySchema, fieldErrors } from "@/lib/inquiry/schema";
import { ErrorText, Field, SubmitFeedback } from "./InquiryForm";
import { submitInquiry, type SubmitState } from "./submitInquiry";

/**
 * Photo detail + print options. Until commerce is configured (merchant, tax,
 * shipping, returns), the only purchase path is an honest "Request a print"
 * inquiry — there is deliberately no cart.
 */
export function PrintDetail({ print, settings, compact = false }: { print: Print; settings: SiteSettings; compact?: boolean }) {
  const [variantId, setVariantId] = useState(print.variants[0]!.id);
  const [view, setView] = useState<"photo" | "crop" | "room">("photo");
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const [requesting, setRequesting] = useState(false);
  const variant = print.variants.find((v) => v.id === variantId) ?? print.variants[0]!;

  useEffect(() => {
    track("print_viewed", { print: print.slug });
  }, [print.slug]);

  const imgRatio = print.image.width && print.image.height ? print.image.width / print.image.height : 1.5;
  const variantRatio = variant.widthCm / variant.heightCm;

  return (
    <article className="grid gap-8 lg:grid-cols-[3fr_2fr]">
      <div>
        <div role="tablist" aria-label="Preview mode" className="mb-3 flex gap-2">
          {(
            [
              ["photo", "Photo"],
              ["crop", "Crop preview"],
              ["room", "In a room"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={view === id}
              onClick={() => setView(id)}
              className={`rounded-full border px-3 py-1.5 text-sm ${view === id ? "border-amber bg-amber/15 text-amber-strong" : "border-line-strong text-muted hover:text-paper"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {view === "photo" && (
          <div className="relative overflow-hidden rounded-xl bg-surface-2">
            <button
              className={`block w-full ${zoom ? "cursor-zoom-out" : "cursor-zoom-in"}`}
              aria-label={zoom ? "Zoom out" : "Zoom in"}
              aria-pressed={zoom}
              onClick={() => setZoom((z) => !z)}
              onPointerMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={print.image.src}
                alt={print.image.alt}
                className="w-full transition-transform duration-300"
                style={{ transform: zoom ? "scale(2.2)" : "none", transformOrigin: origin, aspectRatio: imgRatio }}
              />
            </button>
          </div>
        )}
        {view === "crop" && <CropPreview src={print.image.src} imgRatio={imgRatio} variantRatio={variantRatio} />}
        {view === "room" && <RoomMockup src={print.image.src} widthCm={variant.widthCm} heightCm={variant.heightCm} />}
      </div>

      <div>
        <p className="eyebrow">Photographic print</p>
        <h2 className="display mt-2 text-4xl">{print.title}</h2>
        <div className="mt-2">
          <PlaceholderBadge show={print.placeholder} />
        </div>
        {print.location && <p className="mt-2 text-sm text-muted">{print.location}</p>}
        {print.story && <p className="mt-4 text-muted">{print.story}</p>}
        {print.edition && (
          <p className="mt-3 text-sm">
            Limited edition of {print.edition.size}
            {print.edition.remaining !== undefined && ` · ${print.edition.remaining} remaining`}
          </p>
        )}

        <fieldset className="mt-6">
          <legend className="field-label">Size & material</legend>
          <div className="space-y-2">
            {print.variants.map((v) => (
              <label
                key={v.id}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-amber-strong ${v.id === variantId ? "border-amber bg-amber/10" : "border-line-strong"} ${v.available ? "" : "opacity-50"}`}
              >
                <span className="flex items-center gap-3">
                  <input type="radio" name="variant" className="sr-only" value={v.id} checked={v.id === variantId} disabled={!v.available} onChange={() => setVariantId(v.id)} />
                  <span>
                    <span className="font-semibold">{v.size}</span> — {v.widthCm} × {v.heightCm} cm
                    <span className="block text-xs text-muted">{v.material}</span>
                  </span>
                </span>
                <span className="text-right">{v.available ? formatPrice(v.priceMinor, v.currency) : "Unavailable"}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <p className="mt-4 rounded-lg bg-surface-2 p-3 text-sm text-muted">{settings.commerce.disclosure}</p>

        {!requesting ? (
          <button className="btn btn-primary mt-5 w-full" onClick={() => setRequesting(true)}>
            Request a print
          </button>
        ) : (
          <PrintRequestForm print={print} variantLabel={`${variant.size} — ${variant.widthCm} × ${variant.heightCm} cm, ${variant.material}`} settings={settings} compact={compact} />
        )}
      </div>
    </article>
  );
}

function CropPreview({ src, imgRatio, variantRatio }: { src: string; imgRatio: number; variantRatio: number }) {
  // Show the photo with the paper's aspect ratio outlined; outside is shaded.
  const fitsWidth = variantRatio < imgRatio;
  const w = fitsWidth ? (variantRatio / imgRatio) * 100 : 100;
  const h = fitsWidth ? 100 : (imgRatio / variantRatio) * 100;
  return (
    <figure>
      <div className="relative overflow-hidden rounded-xl bg-surface-2" style={{ aspectRatio: imgRatio }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute border-2 border-amber shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]" style={{ width: `${w}%`, height: `${h}%`, left: `${(100 - w) / 2}%`, top: `${(100 - h) / 2}%` }} />
      </div>
      <figcaption className="mt-2 text-sm text-muted">
        {Math.abs(variantRatio - imgRatio) < 0.02 ? "This size matches the photo's proportions — nothing is cropped." : "Shaded areas fall outside this print size."}
      </figcaption>
    </figure>
  );
}

function RoomMockup({ src, widthCm, heightCm }: { src: string; widthCm: number; heightCm: number }) {
  // Wall is 300 cm wide; a 90 cm sofa back gives scale.
  const wallW = 300;
  return (
    <figure>
      <div className="relative overflow-hidden rounded-xl" style={{ aspectRatio: "3 / 2", background: "linear-gradient(#cdbfaa, #b8a78f)" }}>
        <div className="absolute inset-x-0 bottom-0 h-[14%] bg-[#6b5640]" />
        <div className="absolute bottom-[14%] left-1/2 h-[22%] w-[62%] -translate-x-1/2 rounded-t-2xl bg-[#3f4a44]" aria-hidden />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="absolute left-1/2 -translate-x-1/2 border-[6px] border-[#1d1a16] object-cover shadow-2xl"
          style={{ width: `${(widthCm / wallW) * 100}%`, aspectRatio: `${widthCm} / ${heightCm}`, bottom: "42%" }}
        />
      </div>
      <figcaption className="mt-2 text-sm text-muted">Approximate scale above a sofa on a 3 m wall.</figcaption>
    </figure>
  );
}

function PrintRequestForm({ print, variantLabel, settings, compact }: { print: Print; variantLabel: string; settings: SiteSettings; compact: boolean }) {
  const [v, setV] = useState({ name: "", email: "", country: "", message: "", consent: false, website: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<SubmitState>({ kind: "idle" });
  const startedAt = useRef(Date.now());
  const payload = useMemo(
    () => ({ kind: "print" as const, ...v, printSlug: print.slug, printTitle: print.title, variant: variantLabel, startedAt: startedAt.current }),
    [v, print, variantLabel],
  );
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setV((s) => ({ ...s, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const r = printInquirySchema.safeParse(payload);
    if (!r.success) return setErrors(fieldErrors(r.error));
    setErrors({});
    setStatus({ kind: "submitting" });
    const res = await submitInquiry(payload);
    setStatus(res);
    if (res.kind === "invalid") setErrors(res.fields);
    if (res.kind === "success") track("print_request_submitted", { print: print.slug });
  }

  if (status.kind === "success")
    return (
      <div role="status" className="mt-5 rounded-xl border border-success/40 bg-success/10 p-4">
        <p className="font-semibold">Print request sent.</p>
        <p className="mt-1 text-sm text-muted">KSV will reply to {v.email} with pricing, shipping and lead time. Nothing has been charged.</p>
        {status.channel === "dev-log" && <p className="mt-2 text-xs text-amber">Development mode: logged on the server, not emailed.</p>}
      </div>
    );

  const mailto = `mailto:${settings.contactEmail}?subject=${encodeURIComponent(`Print request — ${print.title}`)}&body=${encodeURIComponent(`Print: ${print.title}\nSize: ${variantLabel}\nCountry: ${v.country}\n\n${v.message}`)}`;

  return (
    <form onSubmit={onSubmit} noValidate className="mt-5 space-y-4 rounded-xl border border-line p-4">
      <p className="text-sm">
        Requesting: <strong>{variantLabel}</strong>
      </p>
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <input tabIndex={-1} autoComplete="off" value={v.website} onChange={set("website")} />
      </div>
      <Field label="Name" name="pr-name" required error={errors.name}>
        <input id="pr-name" className="field" autoComplete="name" value={v.name} onChange={set("name")} aria-invalid={!!errors.name} />
      </Field>
      <Field label="Email" name="pr-email" required error={errors.email}>
        <input id="pr-email" type="email" className="field" autoComplete="email" value={v.email} onChange={set("email")} aria-invalid={!!errors.email} />
      </Field>
      <Field label="Delivery country" name="pr-country" required error={errors.country}>
        <input id="pr-country" className="field" autoComplete="country-name" value={v.country} onChange={set("country")} aria-invalid={!!errors.country} />
      </Field>
      <Field label="Message" name="pr-message" error={errors.message}>
        <textarea id="pr-message" className="field min-h-20" value={v.message} onChange={set("message")} maxLength={2000} />
      </Field>
      <div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--color-amber)]" checked={v.consent} onChange={set("consent")} aria-invalid={!!errors.consent} />
          <span>
            I agree that KSV may contact me about this request (
            <Link href="/privacy" className="text-amber underline" target={compact ? "_blank" : undefined}>
              privacy policy
            </Link>
            ). <span className="text-amber">*</span>
          </span>
        </label>
        {errors.consent && <ErrorText id="pr-consent-error">{errors.consent}</ErrorText>}
      </div>
      {errors.form && <ErrorText id="pr-form-error">{errors.form}</ErrorText>}
      <SubmitFeedback status={status} mailto={mailto} email={settings.contactEmail} />
      <button type="submit" className="btn btn-primary w-full" disabled={status.kind === "submitting"}>
        {status.kind === "submitting" ? "Sending…" : "Send print request"}
      </button>
    </form>
  );
}

export function PrintGrid({ prints, onSelect }: { prints: Print[]; onSelect?: (slug: string) => void }) {
  if (prints.length === 0) return <p className="text-muted">No prints are listed yet.</p>;
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {prints.map((p) => {
        const inner = (
          <>
            <div className="overflow-hidden rounded-lg bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image.src} alt={p.image.alt} loading="lazy" className="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
            </div>
            <div className="mt-3 flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold group-hover:text-amber-strong">{p.title}</p>
                <p className="text-sm text-muted">
                  {p.variants.length} sizes · {p.variants.every((v) => v.priceMinor === null) ? "Price on request" : `from ${formatPrice(Math.min(...p.variants.map((v) => v.priceMinor ?? Infinity)), p.variants[0]!.currency)}`}
                </p>
              </div>
              <PlaceholderBadge show={p.placeholder} />
            </div>
          </>
        );
        return (
          <li key={p.slug}>
            {onSelect ? (
              <button className="group block w-full text-left" onClick={() => onSelect(p.slug)}>
                {inner}
              </button>
            ) : (
              <Link className="group block" href={`/prints/${p.slug}`}>
                {inner}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
