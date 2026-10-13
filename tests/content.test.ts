import { describe, expect, it } from "vitest";
import { aboutSchema, blogPostSchema, npcDialogueSchema, printSchema, projectSchema, siteSettingsSchema, timelineItemSchema } from "@/schemas/content";
import projects from "@/content/projects.json";
import prints from "@/content/prints.json";
import blog from "@/content/blog.json";
import timeline from "@/content/timeline.json";
import settings from "@/content/settings.json";
import about from "@/content/about.json";
import npc from "@/content/npc.json";
import { baseStations } from "@/game/layout";
import { isYouTubeId, youtubeEmbedUrl } from "@/lib/youtube";
import { sanitizeProps } from "@/lib/analytics";

describe("seed content", () => {
  it.each([
    ["projects", projectSchema, projects],
    ["prints", printSchema, prints],
    ["blog", blogPostSchema, blog],
    ["timeline", timelineItemSchema, timeline],
  ] as const)("%s validates", (_n, schema, list) => {
    for (const item of list as unknown[]) expect(schema.safeParse(item).error?.issues ?? []).toEqual([]);
  });
  it("singletons validate", () => {
    expect(siteSettingsSchema.safeParse(settings).success).toBe(true);
    expect(aboutSchema.safeParse(about).success).toBe(true);
    expect(npcDialogueSchema.safeParse(npc).success).toBe(true);
  });
  it("seed never ships fake commerce or invented contact details", () => {
    const s = siteSettingsSchema.parse(settings);
    expect(s.commerce.enabled).toBe(false);
    expect(s.publicPhone).toBeNull();
    for (const p of prints) for (const v of p.variants) expect(v.priceMinor).toBeNull();
    for (const p of projects) expect(p.placeholder).toBe(true);
  });
  it("tour only references existing stations", () => {
    const ids = new Set([...baseStations().map((s) => s.id), "gallery"]);
    for (const step of npcDialogueSchema.parse(npc).tour) expect(ids.has(step.stationId)).toBe(true);
  });
  it("rejects music embeds from unknown hosts", () => {
    const bad = structuredClone(settings) as unknown as { music: { embeds: unknown[] } };
    bad.music.embeds = [{ title: "x", url: "https://evil.example/embed" }];
    expect(siteSettingsSchema.safeParse(bad).success).toBe(false);
  });
});

describe("youtube", () => {
  it("validates ids and builds privacy-enhanced embeds", () => {
    expect(isYouTubeId("dQw4w9WgXcQ")).toBe(true);
    expect(isYouTubeId("bad id")).toBe(false);
    expect(youtubeEmbedUrl("dQw4w9WgXcQ", { autoplay: true })).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?.*autoplay=1/);
    expect(() => youtubeEmbedUrl("<script>")).toThrow();
  });
});

describe("analytics", () => {
  it("drops non-whitelisted and personal properties", () => {
    expect(sanitizeProps({ station: "tv", email: "a@b.c", message: "hello" })).toEqual({ station: "tv" });
  });
});
