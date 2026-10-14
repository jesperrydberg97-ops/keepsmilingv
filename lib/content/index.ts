import "server-only";
import { z } from "zod";
import {
  aboutSchema,
  blogPostSchema,
  npcDialogueSchema,
  printSchema,
  projectSchema,
  siteSettingsSchema,
  timelineItemSchema,
  type About,
  type BlogPost,
  type NpcDialogue,
  type Print,
  type Project,
  type SiteSettings,
  type TimelineItem,
} from "@/schemas/content";
import projectsJson from "@/content/projects.json";
import printsJson from "@/content/prints.json";
import blogJson from "@/content/blog.json";
import timelineJson from "@/content/timeline.json";
import settingsJson from "@/content/settings.json";
import aboutJson from "@/content/about.json";
import npcJson from "@/content/npc.json";

/**
 * Content access layer. Today it reads the version-controlled JSON files in
 * /content; the CMS provider (Phase 4) plugs in here behind the same async
 * functions, so pages and stations never change.
 */

const isProd = process.env.NODE_ENV === "production";

function parseList<S extends z.ZodTypeAny>(schema: S, raw: unknown[], name: string): z.infer<S>[] {
  const out: z.infer<S>[] = [];
  raw.forEach((item, i) => {
    const r = schema.safeParse(item);
    if (r.success) out.push(r.data);
    else if (isProd) console.error(`[content] skipped invalid ${name}[${i}]`, r.error.issues);
    else throw new Error(`[content] invalid ${name}[${i}]: ${JSON.stringify(r.error.issues, null, 2)}`);
  });
  return out;
}

function assertUniqueSlugs(items: { slug: string }[], name: string) {
  const seen = new Set<string>();
  for (const i of items) {
    if (seen.has(i.slug)) throw new Error(`[content] duplicate ${name} slug "${i.slug}"`);
    seen.add(i.slug);
  }
}

export async function getProjects(): Promise<Project[]> {
  const list = parseList(projectSchema, projectsJson, "projects");
  assertUniqueSlugs(list, "project");
  return list.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

export async function getProject(slug: string): Promise<Project | undefined> {
  return (await getProjects()).find((p) => p.slug === slug);
}

export async function getPrints(): Promise<Print[]> {
  const list = parseList(printSchema, printsJson, "prints");
  assertUniqueSlugs(list, "print");
  return list;
}

export async function getPrint(slug: string): Promise<Print | undefined> {
  return (await getPrints()).find((p) => p.slug === slug);
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  const list = parseList(blogPostSchema, blogJson, "blog");
  assertUniqueSlugs(list, "blog post");
  return list.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getBlogPost(slug: string): Promise<BlogPost | undefined> {
  return (await getBlogPosts()).find((p) => p.slug === slug);
}

export async function getTimeline(): Promise<TimelineItem[]> {
  const list = parseList(timelineItemSchema, timelineJson, "timeline");
  // Dated entries chronologically, undated ones last in authored order.
  return [...list.filter((t) => t.date).sort((a, b) => a.date!.localeCompare(b.date!)), ...list.filter((t) => !t.date)];
}

export async function getSiteSettings(): Promise<SiteSettings> {
  return siteSettingsSchema.parse(settingsJson);
}

export async function getAbout(): Promise<About> {
  return aboutSchema.parse(aboutJson);
}

export async function getNpcDialogue(): Promise<NpcDialogue> {
  return npcDialogueSchema.parse(npcJson);
}

/** Everything the 3D studio needs, fetched once on the server. */
export async function getStudioContent() {
  const [projects, prints, posts, timeline, settings, about, npc] = await Promise.all([
    getProjects(),
    getPrints(),
    getBlogPosts(),
    getTimeline(),
    getSiteSettings(),
    getAbout(),
    getNpcDialogue(),
  ]);
  return { projects, prints, posts, timeline, settings, about, npc };
}
export type StudioContent = Awaited<ReturnType<typeof getStudioContent>>;
