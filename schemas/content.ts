import { z } from "zod";

/**
 * Typed content models. These zod schemas are the contract between the CMS
 * (or the interim JSON files in /content) and every page and station.
 * Content is validated at load time, so a malformed CMS entry fails loudly in
 * development and is skipped (not rendered half-broken) in production.
 *
 * `placeholder: true` marks seed content that is NOT factual. The UI renders a
 * visible "Placeholder" badge for it and it must be replaced before launch.
 */

const slug = z
  .string()
  .min(1)
  .max(96)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case");

/** YouTube video IDs are 11 chars of [A-Za-z0-9_-]. */
export const youtubeId = z.string().regex(/^[A-Za-z0-9_-]{11}$/, "invalid YouTube video ID");

/** ISO date (YYYY-MM-DD) or partial (YYYY / YYYY-MM). */
const isoDate = z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/, "use YYYY, YYYY-MM or YYYY-MM-DD");

const localImage = z.object({
  src: z.string().min(1),
  alt: z.string().min(1, "alt text is required"),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});
export type ImageAsset = z.infer<typeof localImage>;

const seo = z
  .object({
    title: z.string().max(70).optional(),
    description: z.string().max(170).optional(),
  })
  .optional();

export const PROJECT_CATEGORIES = [
  { id: "commercials", label: "Commercials" },
  { id: "events", label: "Events" },
  { id: "music-videos", label: "Music Videos" },
  { id: "documentaries", label: "Documentaries" },
  { id: "padel-sports", label: "Padel / Sports" },
  { id: "travel", label: "Travel / Moving Postcards" },
  { id: "behind-the-scenes", label: "Behind the Scenes" },
] as const;
export type ProjectCategoryId = (typeof PROJECT_CATEGORIES)[number]["id"];
const categoryId = z.enum(PROJECT_CATEGORIES.map((c) => c.id) as [ProjectCategoryId, ...ProjectCategoryId[]]);

export const projectSchema = z.object({
  slug,
  title: z.string().min(1),
  category: categoryId,
  summary: z.string().min(1).max(280),
  description: z.string().optional(),
  thumbnail: localImage.optional(),
  youtubeId: youtubeId.nullable(),
  featured: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  client: z.string().optional(),
  roles: z.array(z.string()).default([]),
  date: isoDate.optional(),
  relatedImages: z.array(localImage).default([]),
  seo,
  placeholder: z.boolean().default(false),
});
export type Project = z.infer<typeof projectSchema>;

const printVariant = z.object({
  id: z.string().min(1),
  size: z.string().min(1),
  /** Width × height in cm, used for crop preview. */
  widthCm: z.number().positive(),
  heightCm: z.number().positive(),
  material: z.string().min(1),
  /** Minor units (öre/cents). null = price on request. */
  priceMinor: z.number().int().nonnegative().nullable(),
  currency: z.enum(["SEK", "EUR"]).default("SEK"),
  available: z.boolean().default(true),
  /** Stripe Price ID / Shopify variant GID once commerce is configured. */
  checkoutRef: z.string().optional(),
});
export type PrintVariant = z.infer<typeof printVariant>;

export const printSchema = z.object({
  slug,
  title: z.string().min(1),
  image: localImage,
  story: z.string().optional(),
  location: z.string().optional(),
  edition: z.object({ size: z.number().int().positive(), remaining: z.number().int().nonnegative().optional() }).optional(),
  variants: z.array(printVariant).min(1),
  shipping: z
    .object({ regions: z.array(z.string()).default([]), leadTimeDays: z.number().int().positive().optional(), notes: z.string().optional() })
    .optional(),
  seo,
  placeholder: z.boolean().default(false),
});
export type Print = z.infer<typeof printSchema>;

/** Safe, structured rich text — never raw HTML. */
const richBlock = z.discriminatedUnion("type", [
  z.object({ type: z.literal("paragraph"), text: z.string() }),
  z.object({ type: z.literal("heading"), text: z.string(), level: z.union([z.literal(2), z.literal(3)]).default(2) }),
  z.object({ type: z.literal("quote"), text: z.string(), cite: z.string().optional() }),
  z.object({ type: z.literal("list"), items: z.array(z.string()) }),
  z.object({ type: z.literal("image"), image: localImage, caption: z.string().optional() }),
  z.object({ type: z.literal("youtube"), youtubeId, title: z.string() }),
]);
export type RichBlock = z.infer<typeof richBlock>;

export const blogPostSchema = z.object({
  slug,
  title: z.string().min(1),
  excerpt: z.string().max(300),
  cover: localImage.optional(),
  body: z.array(richBlock),
  author: z.string().min(1),
  date: isoDate,
  category: z.string().min(1),
  relatedProjects: z.array(slug).default([]),
  seo,
  placeholder: z.boolean().default(false),
});
export type BlogPost = z.infer<typeof blogPostSchema>;

export const timelineItemSchema = z.object({
  id: z.string().min(1),
  /** null = undated; never invent dates. */
  date: isoDate.nullable(),
  title: z.string().min(1),
  description: z.string(),
  project: slug.optional(),
  image: localImage.optional(),
  placeholder: z.boolean().default(false),
});
export type TimelineItem = z.infer<typeof timelineItemSchema>;

const httpsUrl = z.string().url().refine((u) => u.startsWith("https://"), "must be https");

export const ALLOWED_MUSIC_EMBED_HOSTS = ["open.spotify.com", "w.soundcloud.com", "bandcamp.com", "www.youtube-nocookie.com"];

export const siteSettingsSchema = z.object({
  brandName: z.string(),
  tagline: z.string(),
  description: z.string(),
  baseLocation: z.string().optional(),
  contactEmail: z.string().email(),
  /** Only set when a real public business number exists. */
  publicPhone: z.string().nullable(),
  socialLinks: z.array(z.object({ label: z.string(), url: httpsUrl })).default([]),
  showreel: z.object({ youtubeId: youtubeId.nullable(), title: z.string() }),
  music: z.object({
    projectName: z.string(),
    description: z.string(),
    links: z.array(z.object({ label: z.string(), url: httpsUrl })).default([]),
    embeds: z
      .array(
        z.object({
          title: z.string(),
          url: httpsUrl.refine((u) => ALLOWED_MUSIC_EMBED_HOSTS.includes(new URL(u).hostname), "embed host not allowed"),
          height: z.number().int().positive().default(152),
        }),
      )
      .default([]),
    placeholder: z.boolean().default(false),
  }),
  inquiry: z.object({
    budgetOptions: z.array(z.string()).min(1),
    projectTypes: z.array(z.object({ id: z.string(), label: z.string() })).min(1),
  }),
  commerce: z.object({
    /** Stays false until merchant, tax, shipping and returns are configured. */
    enabled: z.boolean(),
    provider: z.enum(["none", "stripe", "shopify"]),
    disclosure: z.string(),
  }),
  stations: z.record(z.string(), z.boolean()).default({}),
  features: z.object({
    easterEggs: z.boolean().default(true),
    welcomeGuide: z.boolean().default(true),
  }),
});
export type SiteSettings = z.infer<typeof siteSettingsSchema>;

export const aboutSchema = z.object({
  mission: z.string(),
  founderIntro: z.array(z.string()),
  approach: z.array(z.object({ title: z.string(), text: z.string() })),
  services: z.array(z.object({ title: z.string(), text: z.string() })),
  /** Only verified collaborations, with the client's permission. */
  collaborations: z.array(z.object({ name: z.string(), url: httpsUrl.optional() })).default([]),
  noticeboardNotes: z.array(z.string()).default([]),
  placeholder: z.boolean().default(false),
});
export type About = z.infer<typeof aboutSchema>;

export const npcDialogueSchema = z.object({
  guideName: z.string(),
  greeting: z.string(),
  options: z.array(
    z.object({
      id: z.enum(["explore", "work", "book", "tour"]),
      label: z.string(),
    }),
  ),
  returningGreeting: z.string(),
  help: z.string(),
  tour: z.array(z.object({ stationId: z.string(), text: z.string() })).min(1),
  stationDescriptions: z.record(z.string(), z.string()).default({}),
});
export type NpcDialogue = z.infer<typeof npcDialogueSchema>;
