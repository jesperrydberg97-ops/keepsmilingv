"use client";

import Link from "next/link";
import { createContext, useContext } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { InquiryForm } from "@/components/panels/InquiryForm";
import { ProjectBrowser } from "@/components/panels/ProjectBrowser";
import { PrintDetail, PrintGrid } from "@/components/panels/PrintDetail";
import { AboutContent } from "@/components/panels/AboutContent";
import { BlogList } from "@/components/panels/BlogList";
import { BlogArticle } from "@/components/panels/BlogArticle";
import { ShowreelPanel } from "@/components/panels/ShowreelPanel";
import { MusicPanel } from "@/components/panels/MusicPanel";
import { TimelineList } from "@/components/panels/TimelineList";
import { ContactOptions } from "@/components/panels/ContactOptions";
import { resolveStation } from "@/game/actions";
import { runtime, teleport } from "@/game/runtime";
import { useStudio, type ActivePanel } from "@/game/store";
import type { PanelId } from "@/game/types";
import type { StudioContent } from "@/lib/content";
import { SettingsPanel } from "./SettingsPanel";
import { ControlsHelp } from "./ControlsHelp";

export const ContentContext = createContext<StudioContent | null>(null);
export function useContent(): StudioContent {
  const c = useContext(ContentContext);
  if (!c) throw new Error("ContentContext missing");
  return c;
}

const TITLES: Record<PanelId, string> = {
  booking: "Booking desk · Film project inquiry",
  projects: "Project TV",
  print: "Gallery · Print",
  prints: "Gallery · Prints",
  about: "About KSV",
  blog: "Reading lounge · Journal",
  showreel: "Showreel",
  music: "Music corner",
  timeline: "Project timeline",
  contact: "Contact",
  settings: "Settings",
  help: "Controls",
};

const PAGE_ROUTE: Partial<Record<PanelId, (p?: Record<string, string>) => string>> = {
  booking: () => "/contact",
  projects: () => "/projects",
  print: (p) => (p?.slug ? `/prints/${p.slug}` : "/prints"),
  prints: () => "/prints",
  about: () => "/about",
  blog: (p) => (p?.slug ? `/blog/${p.slug}` : "/blog"),
  music: () => "/music",
  timeline: () => "/timeline",
  contact: () => "/contact",
};

/** Walk the visitor to the booking desk (teleport) and open the inquiry. */
export function goToBooking() {
  const st = useStudio.getState();
  const desk = resolveStation("booking");
  if (desk) teleport(desk.approach);
  runtime.focus = null;
  st.openPanel({ id: "booking", stationId: "booking" });
}

export function OverlayHost() {
  const panel = useStudio((s) => s.panel);
  const close = useStudio((s) => s.closePanel);
  if (!panel) return null;

  const onClose = () => {
    runtime.focus = null;
    close();
  };
  const route = PAGE_ROUTE[panel.id]?.(panel.params);
  return (
    <Dialog
      title={TITLES[panel.id]}
      onClose={onClose}
      size={panel.id === "projects" || panel.id === "print" ? "xl" : panel.id === "settings" || panel.id === "help" ? "md" : "lg"}
      headerExtra={
        route ? (
          <Link href={route} className="hidden text-xs text-muted underline-offset-4 hover:text-paper hover:underline sm:inline">
            Open as page ↗
          </Link>
        ) : null
      }
    >
      <PanelBody panel={panel} />
    </Dialog>
  );
}

function PanelBody({ panel }: { panel: ActivePanel }) {
  const c = useContent();
  const open = useStudio((s) => s.openPanel);
  const bookCta = (
    <button className="btn btn-primary" onClick={goToBooking}>
      Start a project at the booking desk
    </button>
  );

  switch (panel.id) {
    case "booking":
      return <InquiryForm settings={c.settings} compact />;
    case "projects":
      return <ProjectBrowser key={panel.params?.slug ?? "all"} projects={c.projects} mode="overlay" onBook={goToBooking} initialSlug={panel.params?.slug} />;
    case "print": {
      const p = c.prints.find((x) => x.slug === panel.params?.slug);
      if (!p) return <PrintGrid prints={c.prints} onSelect={(slug) => open({ id: "print", params: { slug } })} />;
      return (
        <div className="space-y-6">
          <button className="btn btn-ghost !min-h-9 text-sm" onClick={() => open({ id: "prints" })}>
            ← All prints
          </button>
          <PrintDetail key={p.slug} print={p} settings={c.settings} compact />
        </div>
      );
    }
    case "prints":
      return <PrintGrid prints={c.prints} onSelect={(slug) => open({ id: "print", params: { slug } })} />;
    case "about":
      return <AboutContent about={c.about} cta={bookCta} />;
    case "blog": {
      const post = c.posts.find((x) => x.slug === panel.params?.slug);
      if (post)
        return (
          <div className="space-y-6">
            <button className="btn btn-ghost !min-h-9 text-sm" onClick={() => open({ id: "blog" })}>
              ← All posts
            </button>
            <BlogArticle post={post} />
          </div>
        );
      return <BlogList posts={c.posts} onSelect={(slug) => open({ id: "blog", params: { slug } })} />;
    }
    case "showreel":
      return <ShowreelPanel showreel={c.settings.showreel} cta={bookCta} />;
    case "music":
      return <MusicPanel music={c.settings.music} />;
    case "timeline":
      return <TimelineList items={c.timeline} onProject={(slug) => open({ id: "projects", params: { slug } })} />;
    case "contact":
      return (
        <ContactOptions
          settings={c.settings}
          inquiry={
            <button className="btn btn-primary mt-1" onClick={goToBooking}>
              Open the inquiry form
            </button>
          }
        />
      );
    case "settings":
      return <SettingsPanel />;
    case "help":
      return <ControlsHelp />;
  }
}
