# Keep Smiling Visuals — Interactive 3D Studio

An explorable, game-like studio website for **Keep Smiling Visuals** (film, photography, visual
storytelling — Gothenburg). Visitors walk a founder avatar around a warm loft and interact with
physical objects: the **booking desk** (project inquiry), **project TV** (portfolio), **gallery wall**
(prints), **noticeboard** (about), **reading lounge** (journal), **showreel wall**, **music corner**
(Free Music Plug), **timeline shelf** and **telephone** (contact). A separate scripted **welcome guide**
greets visitors at the entrance.

Everything is also available as normal, accessible, indexable pages — the 3D studio is never required.

> **Status:** Phase 1 (prototype) and Phase 2 (functional stations) are implemented with clearly
> marked placeholder content. See [`docs/TODO.md`](docs/TODO.md) for what is verified vs. what still
> needs credentials, real assets or owner input, and [`docs/OWNER_CHECKLIST.md`](docs/OWNER_CHECKLIST.md)
> for what to supply.

## Quick start

```bash
npm install          # Node ≥ 20.9
cp .env.example .env.local
npm run dev          # http://localhost:3000
```

To test the inquiry form locally without an email provider, set `INQUIRY_DEV_LOG=1` in
`.env.local` — submissions are printed to the server console and the UI clearly says it was a dev
log. Without it (and in production without `RESEND_API_KEY`) the endpoint answers 503 and the form
offers a pre-filled email instead. It never pretends to have sent anything.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build && npm start` | Production build / server |
| `npm run typecheck` | TypeScript, strict |
| `npm test` | Vitest unit tests: collision, navmesh reachability of every station, movement, camera, interaction, inquiry API, content validation |
| `npm run test:e2e` | Playwright (builds, starts on :3100, desktop + mobile). Uses software WebGL, so it runs headless in CI. |

## Controls

WASD / ↑↓ move · ←→ rotate camera · Shift sprint · click/tap floor to walk · drag to look · wheel/pinch
to zoom · **E**/Enter or click/tap an object to interact · Esc / Back closes panels · **Stations** menu
for instant travel. Touch devices get a joystick and an Interact button.

## Editing content (until the CMS is connected)

Content lives in [`content/`](content) as JSON and is validated against
[`schemas/content.ts`](schemas/content.ts) at build time and in tests:

* `projects.json` — set `youtubeId` (the 11-character ID from the YouTube URL) to make a project playable
* `prints.json`, `blog.json`, `timeline.json`, `about.json`, `npc.json`
* `settings.json` — contact email, showreel ID, music links/embeds, inquiry budget options, feature flags

Items with `"placeholder": true` show a visible badge and are excluded from search indexing.
Phase 4 replaces these files with Sanity behind the same `lib/content` functions.

## Architecture

See [`docs/PLAN.md`](docs/PLAN.md) for creative direction, the top-down zoning diagram, technology
decisions and tradeoffs, schemas and milestones. Character asset specs are in
[`docs/ASSET_PIPELINE.md`](docs/ASSET_PIPELINE.md).

```
app/                routes (studio at /, 2D pages, /api/inquiry, sitemap, robots)
components/world/   R3F scene (room, stations, avatar, guide, camera)
components/studio/  studio shell, HUD, overlays, menus
components/panels/  content UIs shared by overlays and pages
game/               pure, tested game logic (layout, collision, pathfinding, movement, camera)
lib/                content access, inquiry backend, analytics, YouTube, config
```

`portfolio.html` is the previous static one-page site, kept for reference only. Its project list,
client names and stats were not carried over because they could not be verified.
