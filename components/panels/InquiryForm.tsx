"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { projectInquiryBase, projectInquirySchema, fieldErrors } from "@/lib/inquiry/schema";
import type { SiteSettings } from "@/schemas/content";
import { track } from "@/lib/analytics";
import { submitInquiry, type SubmitState } from "./submitInquiry";

/**
 * Multi-step film project inquiry. The draft lives in sessionStorage only
 * (cleared when the tab closes or on successful send; consent is never
 * stored). Success is shown only after the server confirms delivery.
 */

const DRAFT_KEY = "ksv-inquiry-draft";

type Values = {
  name: string;
  company: string;
  email: string;
  phone: string;
  projectType: string;
  dateFrom: string;
  dateTo: string;
  location: string;
  budget: string;
  description: string;
  deliverables: string;
  consent: boolean;
  website: string;
};

const EMPTY: Values = {
  name: "",
  company: "",
  email: "",
  phone: "",
  projectType: "",
  dateFrom: "",
  dateTo: "",
  location: "",
  budget: "",
  description: "",
  deliverables: "",
  consent: false,
  website: "",
};

const STEPS = [
  { title: "About you", fields: ["name", "company", "email", "phone"] },
  { title: "The project", fields: ["projectType", "dateFrom", "dateTo", "location", "budget"] },
  { title: "Details", fields: ["description", "deliverables", "consent"] },
] as const;

type FieldName = (typeof STEPS)[number]["fields"][number];

export function InquiryForm({ settings, compact = false }: { settings: SiteSettings; compact?: boolean }) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<SubmitState>({ kind: "idle" });
  const startedAt = useRef<number>(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    startedAt.current = Date.now();
    track("inquiry_started");
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) setValues({ ...EMPTY, ...(JSON.parse(raw) as Partial<Values>), consent: false, website: "" });
    } catch {
      /* no draft */
    }
  }, []);

  useEffect(() => {
    try {
      const { consent: _c, website: _w, ...draft } = values;
      if (Object.values(draft).some(Boolean)) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* storage unavailable */
    }
  }, [values]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step, status.kind]);

  const set = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const v = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setValues((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors(({ [k]: _drop, ...rest }) => rest);
  };

  const payload = useMemo(() => ({ kind: "project" as const, ...values, startedAt: startedAt.current || Date.now() }), [values]);

  function validateStep(i: number): boolean {
    const fields = STEPS[i]!.fields as readonly FieldName[];
    const shape = Object.fromEntries(fields.map((f) => [f, true])) as Record<FieldName, true>;
    const r = projectInquiryBase.pick(shape).safeParse(payload);
    let errs = r.success ? {} : fieldErrors(r.error);
    if (i === 1 && !errs.dateTo && values.dateFrom && values.dateTo && values.dateFrom > values.dateTo) errs = { ...errs, dateTo: "End date must be after the start date" };
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step < STEPS.length - 1) {
      if (validateStep(step)) setStep(step + 1);
      return;
    }
    const full = projectInquirySchema.safeParse(payload);
    if (!full.success) {
      const errs = fieldErrors(full.error);
      setErrors(errs);
      const bad = STEPS.findIndex((s) => s.fields.some((f) => errs[f]));
      if (bad >= 0) setStep(bad);
      return;
    }
    setStatus({ kind: "submitting" });
    const result = await submitInquiry(payload);
    setStatus(result);
    if (result.kind === "success") {
      track("inquiry_submitted", { category: values.projectType });
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {}
    } else if (result.kind === "invalid") {
      setErrors(result.fields);
      const bad = STEPS.findIndex((s) => s.fields.some((f) => result.fields[f]));
      if (bad >= 0) setStep(bad);
    }
  }

  const mailto = useMemo(() => {
    const subject = encodeURIComponent(`Film project inquiry${values.name ? ` — ${values.name}` : ""}`);
    const body = encodeURIComponent(
      [
        values.projectType && `Project type: ${settings.inquiry.projectTypes.find((t) => t.id === values.projectType)?.label ?? values.projectType}`,
        values.dateFrom && `Dates: ${values.dateFrom}${values.dateTo ? ` → ${values.dateTo}` : ""}`,
        values.location && `Location: ${values.location}`,
        values.budget && `Budget: ${values.budget}`,
        values.description && `\n${values.description}`,
      ]
        .filter(Boolean)
        .join("\n"),
    );
    return `mailto:${settings.contactEmail}?subject=${subject}&body=${body}`;
  }, [values, settings]);

  if (status.kind === "success") {
    return (
      <div className="animate-fade-up py-6 text-center" role="status">
        <p className="eyebrow">Inquiry sent</p>
        <h2 ref={headingRef} tabIndex={-1} className="display mt-3 text-4xl outline-none">
          Thank you, {values.name.split(" ")[0]}.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-muted">
          Your inquiry reached the KSV inbox. You&apos;ll get a personal reply at <strong className="text-paper">{values.email}</strong>.
        </p>
        {status.channel === "dev-log" && (
          <p className="mx-auto mt-4 max-w-md rounded-lg border border-dashed border-amber/60 p-3 text-xs text-amber">
            Development mode: the inquiry was written to the server log, not emailed.
          </p>
        )}
        <button
          className="btn btn-ghost mt-6"
          onClick={() => {
            setValues(EMPTY);
            setStep(0);
            setStatus({ kind: "idle" });
            startedAt.current = Date.now();
          }}
        >
          Send another inquiry
        </button>
      </div>
    );
  }

  const submitting = status.kind === "submitting";
  const types = settings.inquiry.projectTypes;
  const err = (k: string) => errors[k];
  const describedBy = (k: string, hint?: boolean) => [hint && `${k}-hint`, err(k) && `${k}-error`].filter(Boolean).join(" ") || undefined;

  return (
    <form onSubmit={onSubmit} noValidate aria-describedby="inquiry-required-note" className={compact ? "" : "max-w-2xl"}>
      <ol className="mb-6 flex gap-2" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex-1">
            <div className={`h-1 rounded-full ${i <= step ? "bg-amber" : "bg-surface-3"}`} />
            <p className={`mt-2 text-xs ${i === step ? "text-paper" : "text-muted"}`} aria-current={i === step ? "step" : undefined}>
              <span className="sr-only">Step {i + 1} of {STEPS.length}: </span>
              {s.title}
            </p>
          </li>
        ))}
      </ol>

      <h2 ref={headingRef} tabIndex={-1} className="display text-3xl outline-none">
        {STEPS[step]!.title}
      </h2>
      <p id="inquiry-required-note" className="mb-5 mt-1 text-sm text-muted">
        Fields marked <span className="text-amber">*</span> are required.
      </p>

      {/* Honeypot: invisible to people and assistive tech. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" name="website" value={values.website} onChange={set("website")} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {step === 0 && (
          <>
            <Field label="Name" name="name" required error={err("name")}>
              <input id="name" className="field" autoComplete="name" value={values.name} onChange={set("name")} aria-invalid={!!err("name")} aria-describedby={describedBy("name")} required />
            </Field>
            <Field label="Company / organization" name="company" error={err("company")}>
              <input id="company" className="field" autoComplete="organization" value={values.company} onChange={set("company")} />
            </Field>
            <Field label="Email" name="email" required error={err("email")}>
              <input id="email" type="email" inputMode="email" className="field" autoComplete="email" value={values.email} onChange={set("email")} aria-invalid={!!err("email")} aria-describedby={describedBy("email")} required />
            </Field>
            <Field label="Phone" name="phone" error={err("phone")}>
              <input id="phone" type="tel" inputMode="tel" className="field" autoComplete="tel" value={values.phone} onChange={set("phone")} aria-invalid={!!err("phone")} aria-describedby={describedBy("phone")} />
            </Field>
          </>
        )}
        {step === 1 && (
          <>
            <fieldset className="sm:col-span-2" aria-describedby={describedBy("projectType")}>
              <legend className="field-label">
                Project type <span className="text-amber">*</span>
              </legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {types.map((t) => (
                  <label
                    key={t.id}
                    className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-2 text-center text-sm transition has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-amber-strong ${values.projectType === t.id ? "border-amber bg-amber/15 text-amber-strong" : "border-line-strong hover:border-paper/40"}`}
                  >
                    <input type="radio" name="projectType" value={t.id} checked={values.projectType === t.id} onChange={set("projectType")} className="sr-only" />
                    {t.label}
                  </label>
                ))}
              </div>
              {err("projectType") && <ErrorText id="projectType-error">{err("projectType")}</ErrorText>}
            </fieldset>
            <Field label="Shoot date — from" name="dateFrom" error={err("dateFrom")}>
              <input id="dateFrom" type="date" className="field" value={values.dateFrom} onChange={set("dateFrom")} />
            </Field>
            <Field label="Shoot date — to" name="dateTo" error={err("dateTo")}>
              <input id="dateTo" type="date" className="field" value={values.dateTo} min={values.dateFrom || undefined} onChange={set("dateTo")} aria-invalid={!!err("dateTo")} aria-describedby={describedBy("dateTo")} />
            </Field>
            <Field label="Location" name="location" error={err("location")}>
              <input id="location" className="field" placeholder="City, country or 'flexible'" value={values.location} onChange={set("location")} />
            </Field>
            <Field label="Approximate budget" name="budget" error={err("budget")}>
              <select id="budget" className="field" value={values.budget} onChange={set("budget")}>
                <option value="">Prefer not to say</option>
                {settings.inquiry.budgetOptions.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </Field>
          </>
        )}
        {step === 2 && (
          <>
            <Field label="Project description & goals" name="description" required error={err("description")} className="sm:col-span-2" hint="What's the story, who is it for, and what should people feel?">
              <textarea id="description" className="field min-h-36" value={values.description} onChange={set("description")} aria-invalid={!!err("description")} aria-describedby={describedBy("description", true)} required maxLength={5000} />
            </Field>
            <Field label="Deliverables / platforms" name="deliverables" error={err("deliverables")} className="sm:col-span-2" hint="E.g. one 60s film + three vertical cut-downs for Instagram.">
              <textarea id="deliverables" className="field min-h-20" value={values.deliverables} onChange={set("deliverables")} aria-describedby={describedBy("deliverables", true)} maxLength={1000} />
            </Field>
            <div className="sm:col-span-2">
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--color-amber)]" checked={values.consent} onChange={set("consent")} aria-invalid={!!err("consent")} aria-describedby={describedBy("consent")} />
                <span>
                  I agree that Keep Smiling Visuals may store my details and contact me about this inquiry, as described in the{" "}
                  <Link href="/privacy" className="text-amber underline" target={compact ? "_blank" : undefined}>
                    privacy policy
                  </Link>
                  . <span className="text-amber">*</span>
                </span>
              </label>
              {err("consent") && <ErrorText id="consent-error">{err("consent")}</ErrorText>}
            </div>
          </>
        )}
      </div>

      {errors.form && <ErrorText id="form-error">{errors.form}</ErrorText>}
      <SubmitFeedback status={status} mailto={mailto} email={settings.contactEmail} />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          {step > 0 && (
            <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)} disabled={submitting}>
              Back
            </button>
          )}
        </div>
        <button type="submit" className="btn btn-primary min-w-40" disabled={submitting}>
          {step < STEPS.length - 1 ? "Continue" : submitting ? "Sending…" : "Send inquiry"}
        </button>
      </div>
    </form>
  );
}

export function SubmitFeedback({ status, mailto, email }: { status: SubmitState; mailto: string; email: string }) {
  if (status.kind !== "unavailable" && status.kind !== "error" && status.kind !== "rate_limited") return null;
  return (
    <div role="alert" className="mt-5 rounded-xl border border-danger/50 bg-danger/10 p-4 text-sm">
      {status.kind === "rate_limited" ? (
        <p>Too many messages from this connection. Please try again in about {Math.ceil(status.retryAfterSeconds / 60)} minutes, or email us directly.</p>
      ) : status.kind === "unavailable" ? (
        <p>Online sending isn&apos;t available right now — nothing was sent. Your details are still here; you can email them to us instead.</p>
      ) : (
        <p>Something went wrong and your message was <strong>not</strong> sent. Please try again, or email us directly.</p>
      )}
      <a className="btn btn-ghost mt-3 !min-h-9 text-xs" href={mailto}>
        Email {email} instead
      </a>
    </div>
  );
}

export function Field({
  label,
  name,
  required,
  error,
  hint,
  className = "",
  children,
}: {
  label: string;
  name: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="field-label">
        {label} {required ? <span className="text-amber">*</span> : <span className="font-normal text-muted">(optional)</span>}
      </label>
      {hint && (
        <p id={`${name}-hint`} className="-mt-1 mb-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
      {children}
      {error && <ErrorText id={`${name}-error`}>{error}</ErrorText>}
    </div>
  );
}

export function ErrorText({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="mt-1.5 text-sm text-danger">
      {children}
    </p>
  );
}
