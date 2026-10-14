import { z } from "zod";

/**
 * Inquiry payloads shared by the client form (for instant validation) and the
 * server endpoint (authoritative validation). Keep limits tight: this data is
 * emailed to the KSV inbox and nothing else.
 */

const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  trimmed(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const PROJECT_TYPE_IDS = ["commercial", "event", "music-video", "documentary", "social", "product", "photography", "other"] as const;

const contactFields = {
  name: trimmed(120).min(2, "Please enter your name"),
  email: trimmed(200).email("Please enter a valid email address"),
  consent: z.literal(true, { errorMap: () => ({ message: "Please accept the privacy policy so we can reply" }) }),
  /** Honeypot — must stay empty. Hidden from humans and assistive tech. */
  website: z.string().max(0, "spam").optional().default(""),
  /** Client timestamp when the form was opened (ms). Used as a light time-trap. */
  startedAt: z.number().int().positive(),
};

export const projectInquiryBase = z.object({
  kind: z.literal("project"),
  ...contactFields,
  company: optionalText(160),
  phone: optionalText(40).refine((v) => !v || /^[+()\d\s.-]{5,40}$/.test(v), "Please enter a valid phone number"),
  projectType: z.enum(PROJECT_TYPE_IDS, { errorMap: () => ({ message: "Please choose a project type" }) }),
  dateFrom: optionalText(10).refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use the date picker"),
  dateTo: optionalText(10).refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use the date picker"),
  location: optionalText(160),
  budget: optionalText(80),
  description: trimmed(5000).min(20, "Tell us a little more about the project (at least 20 characters)"),
  deliverables: optionalText(1000),
});

export const projectInquirySchema = projectInquiryBase.refine((d) => !d.dateFrom || !d.dateTo || d.dateFrom <= d.dateTo, {
  path: ["dateTo"],
  message: "End date must be after the start date",
});

export const printInquirySchema = z.object({
  kind: z.literal("print"),
  ...contactFields,
  printSlug: trimmed(96).min(1),
  printTitle: trimmed(200).min(1),
  variant: trimmed(200).min(1, "Please choose a size"),
  country: trimmed(80).min(2, "Please enter the delivery country"),
  message: optionalText(2000),
});

export type ProjectInquiry = z.infer<typeof projectInquirySchema>;
export type PrintInquiry = z.infer<typeof printInquirySchema>;
export type Inquiry = ProjectInquiry | PrintInquiry;

/** Pick the schema by `kind` so field errors stay specific (a plain union would hide them). */
export function parseInquiry(input: unknown): z.SafeParseReturnType<unknown, Inquiry> {
  const kind = typeof input === "object" && input !== null ? (input as { kind?: unknown }).kind : undefined;
  if (kind === "print") return printInquirySchema.safeParse(input);
  return projectInquirySchema.safeParse(input);
}

/** Minimum time a human plausibly needs to fill the form. */
export const MIN_FILL_MS = 3000;
/** Forms older than this are rejected (stale tab / replay). */
export const MAX_FILL_MS = 1000 * 60 * 60 * 12;

/** Flatten zod issues to { field: message } for the UI. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
