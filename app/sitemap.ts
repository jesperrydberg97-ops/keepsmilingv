import type { MetadataRoute } from "next";
import { getBlogPosts, getPrints, getProjects } from "@/lib/content";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, prints, posts] = await Promise.all([getProjects(), getPrints(), getBlogPosts()]);
  const statics = ["", "/projects", "/prints", "/blog", "/about", "/contact", "/timeline", "/music", "/privacy", "/terms"];
  return [
    ...statics.map((p) => ({ url: `${SITE_URL}${p}` })),
    // Placeholder entries are noindex and kept out of the sitemap.
    ...projects.filter((p) => !p.placeholder).map((p) => ({ url: `${SITE_URL}/projects/${p.slug}` })),
    ...prints.filter((p) => !p.placeholder).map((p) => ({ url: `${SITE_URL}/prints/${p.slug}` })),
    ...posts.filter((p) => !p.placeholder).map((p) => ({ url: `${SITE_URL}/blog/${p.slug}`, lastModified: p.date })),
  ];
}
