# Keep Smiling Visuals — Interactive 3D Studio: Plan

Living document. Status of each item is tracked in [`TODO.md`](./TODO.md).

---

## 1. Creative direction

**"Golden hour in a working loft."** You arrive at the end of a shoot day: warm low sun through
steel-framed windows on the west wall, practical lamps already on, a projector throwing the showreel
onto the back wall. The space is lived-in rather than staged: books stacked by the armchair, a
clapperboard on a crate, a cinema camera still on its tripod, notes pinned to a cork board.

| Pillar | What it means in the build |
| --- | --- |
| **Warm, cinematic, believable** | Semi-realistic PBR (oak, plaster, dark steel, leather, brass), ACES tone mapping, one strong key light (sun) and amber practicals. No neon overload, no heavy bloom. |
| **Playful discovery** | Every station is a physical object you'd find in a real studio. Three small easter eggs (shutter, clapper, polaroid) reward curiosity and block nothing. |
| **A clear path to hiring KSV** | Booking desk closest to the entrance; every content panel ends with a CTA that takes you straight there. The guide's first options include "Book a project". |
| **Never in the way** | The 3D studio is the discovery layer. Reading, watching, forms and checkout happen in crisp HTML overlays, and every overlay is also a normal, indexable page. |

**Palette:** ink `#0f0d0b` · surface `#17140f` · paper `#f3ede2` · muted `#b3a895` · **amber `#e8a955`** (single accent) · sage `#9db497` (guide only).
**Type:** Cormorant Garamond (display, inherited from the existing portfolio) · DM Sans (UI/body, chosen for legibility) · DM Mono (labels).

## 2. Top-down zoning (as built — `game/layout.ts` is the source of truth)

```
                         N  (back wall, z = -9)
   x=-12 ┌──────────────────────────────────────────────────────────┐ x=+12
         │ [bookshelf]  crate*  [  SHOWREEL SCREEN  ]  [TIMELINE]  [MUSIC]│
         │  armchair  ⌂table      "keep smiling" neon    shelf    turntable│
         │  READING LOUNGE         pouf      pouf                speakers │
         │ ════ divider                                                   │
         │                  ▮ column              ▮ column          ║     │
  windows│ TV ▐ ─ sofa                                             ║ GAL │
   (W)   │ console              ┌──── rug ────┐                    ║ LERY│
         │ [PROJECT TV]         │   central   │       camera*      ║ 4×  │
  daylight                      │ circulation │       on tripod    ║frame│
         │                      └─────────────┘                          │
         │                                                               │
         │          guide ☺   ◉ spawn        [BOOKING DESK]               │
         │                                    laptop · lamp               │
         │ plant  polaroid*   [ABOUT BOARD]   ▭ door ▭        ☎ PHONE    │
         └──────────────────────────────────────────────────────────┘
                         S  (entrance, z = +9)          * = easter egg
```

* **Entrance → booking desk** is ~5.5 m: the commercially important station is the first thing on the right.
* **Showreel wall** sits on the axis of the door — visible the moment you spawn.
* **Project TV and gallery** are on the two side walls, both in view from the rug.
* The **rug** marks a clear central circulation space; nothing interactive blocks it.
* Two full-height columns give the camera something real to avoid (and test obstruction handling).
* Signage: hanging/wall labels (Booking, Prints, Journal, Timeline, Music) + minimap + Stations menu.

## 3. Architecture & technology decisions

| Concern | Choice | Why / tradeoffs |
| --- | --- | --- |
| Framework | **Next.js 15 App Router + TypeScript** | SSR/SSG for indexable 2D routes, metadata API, route handlers for the inquiry endpoint, Vercel-native. Pinned to the patched 15.5 line rather than 16.x for stability with R3F 9. |
| 3D | **React Three Fiber 9 + Three r180 + Drei** | Declarative scene graph that shares state/types with the React UI. Drei for `useGLTF`, `useAnimations`, `Environment`/`Lightformer`, `PerformanceMonitor`. |
| Collision | **Custom circle-vs-AABB (`game/collision.ts`)** instead of Rapier | One flat floor + box furniture doesn't need a physics engine. ~100 lines, deterministic, unit-tested, zero WASM download (Rapier adds ~1–2 MB). Swap to Rapier's kinematic character controller behind the same function if stairs/ramps/dynamic props are added. |
| Click-to-move | **Grid navmesh + A\* + string-pulling (`game/pathfinding.ts`)** | Baked from the *same* colliders inflated by the avatar radius, so any path found is walkable. ~7k cells, sub-millisecond queries. `recast-navigation` is the upgrade path for multi-level spaces. |
| Camera | **Custom third-person rig (`game/camera.ts`)** | Ray-vs-box obstruction against walls/columns/ceiling, raises over the shoulder in corners, exponential damping, station focus. Pure functions are unit-tested. |
| State | **Zustand** for UI/game state + a plain mutable `runtime` object for per-frame data | No React re-renders at 60 fps; HUD reads runtime via rAF where needed. |
| Styling | **Tailwind CSS v4** with `@theme` tokens in `app/globals.css` | Design tokens in one place; no runtime CSS-in-JS. |
| Motion | CSS keyframes/transitions, honouring `prefers-reduced-motion` | Framer Motion was not needed for the current transitions; avoids ~40 kB. Add it if richer choreography is designed. |
| Content | **Zod-validated models (`schemas/content.ts`)**, JSON seed in `/content` today, **Sanity** in Phase 4 | Pages/stations depend only on `lib/content` async functions, so the CMS swap touches one module. |
| Inquiry | **Route handler + Resend HTTP API** | Validation, honeypot, time-trap, same-origin check, body-size cap, rate limit (Upstash Redis or in-memory). Plain-text email only. 503 when not configured → UI shows mailto fallback; never a fake success. |
| Video | **YouTube IFrame API on `youtube-nocookie.com`, loaded on click** | No YouTube request before the visitor presses play; error codes 101/150 (embedding disabled) show a "Watch on YouTube" fallback. |
| Commerce | **None yet — honest "Request a print"** | Stripe Checkout (hosted) is the recommended path once merchant, tax, shipping and returns are decided. No cart UI exists until then. |
| Analytics | **Opt-in beacon to a configurable cookieless endpoint** | Whitelisted props only, never form text. Disabled entirely unless an endpoint is configured; consent banner only appears then. |
| Hosting | Vercel + CDN for large GLB/KTX2 assets | Small versioned GLBs may live in `/public/models`. |

### Runtime flow

```
page.tsx (server) ── getStudioContent() ──► StudioApp (client)
                                             ├─ EntryScreen (SSR text, CTAs, progress)
                                             ├─ Scene (dynamic import, ssr:false)
                                             │   Room · Stations(Hotspot…) · Guide · Player · CameraRig
                                             ├─ Hud (prompt, joystick, minimap, guide dialogue, toasts)
                                             ├─ OverlayHost (Dialog → shared panels)
                                             └─ StationMenu (accessible fast travel)
input (keys/joystick/click) → runtime → Player.useFrame: intent → stepMovement → collision
                                                       → nearestStation → store.nearestStationId → prompt
interact(station) → analytics → camera focus (desktop) → store.openPanel → Dialog
```

### Folder structure

```
app/                    routes: / (studio), /projects[/slug], /prints[/slug], /blog[/slug],
                        /about, /contact, /timeline, /music, /privacy, /terms, api/inquiry,
                        sitemap.ts, robots.ts
components/ui/          Dialog (focus trap, Esc, Back), YouTubePlayer, PlaceholderBadge
components/panels/      Shared content UIs used by both overlays and pages
components/site/        Header/footer/page shell/JSON-LD for 2D routes
components/studio/      StudioApp, HUD, joystick, minimap, guide dialogue, settings, menus
components/world/       R3F scene: Room, Stations, Hotspot, Player, Avatar, Guide, CameraRig
game/                   Pure logic: layout, collision, pathfinding, movement, camera,
                        interaction, store, runtime, actions, quality, audio
lib/                    content access, inquiry (schema/handler/delivery/rate limit),
                        analytics, youtube, site config, avatar config
schemas/content.ts      Typed + validated content models
content/*.json          Interim, version-controlled seed content (placeholders marked)
public/models/          Avatar GLB slots (see ASSET_PIPELINE.md)
tests/  e2e/            Vitest unit tests · Playwright e2e (desktop + mobile)
```

## 4. Content schemas (summary — see `schemas/content.ts`)

| Model | Key fields | Notes |
| --- | --- | --- |
| **Project** | slug, title, category, summary, description, thumbnail{src,alt}, youtubeId \| null, featured, tags, client, roles, date, relatedImages, seo, placeholder | Categories fixed to the brief's rails; empty categories are hidden. |
| **Print** | slug, title, image, story, location, edition, variants[{size, widthCm, heightCm, material, priceMinor \| null, currency, available, checkoutRef}], shipping, seo | `priceMinor: null` = "Price on request". `checkoutRef` maps to Stripe Price / Shopify variant later. |
| **BlogPost** | slug, title, excerpt, cover, body (structured blocks: paragraph, heading, quote, list, image, youtube), author, date, category, relatedProjects, seo | Rendered as React elements — no raw HTML. |
| **TimelineItem** | id, date \| null, title, description, project, image | Undated allowed — dates are never invented. |
| **SiteSettings** | brand copy, contactEmail, publicPhone \| null, socialLinks (https only), showreel.youtubeId, music {links, embeds (allow-listed hosts)}, inquiry {budgetOptions, projectTypes}, commerce {enabled, provider, disclosure}, stations visibility, feature flags | |
| **About** | mission, founderIntro[], approach[], services[], collaborations[] (verified only), noticeboardNotes | |
| **NPCDialogue** | guideName, greeting, returningGreeting, help, options, tour[{stationId, text}], stationDescriptions | Scripted only. |

Every model has `placeholder: boolean`; placeholder items render a visible badge, are `noindex`, and are excluded from the sitemap.

## 5. Milestones & definition of done

| Phase | Scope | Definition of done | Status |
| --- | --- | --- | --- |
| **0 Discovery** | This plan, owner checklist, assumptions | Plan + checklist reviewed by owner; blockers listed | ✅ drafted — awaiting owner answers (`OWNER_CHECKLIST.md`) |
| **1 Prototype** | Next.js app, tokens, 2D routes, R3F canvas, greybox studio, placeholder avatar, camera, WASD, click-to-move, touch, collision, overlay system | All stations reachable from spawn (unit-tested); desktop + mobile e2e green; no console errors | ✅ done — **real-device mobile check still required** |
| **2 Functional stations** | TV + YouTube, real inquiry endpoint, About/blog/gallery overlays, scripted NPC | Every station opens working, readable UI with placeholder content; inquiry confirms only on server success | ✅ done with seed content (email delivery needs Resend credentials) |
| **3 Art pass** | Authored studio GLB, baked lighting, KTX2, signage, ambient audio, polish of showreel/music/phone/timeline/eggs | Mobile ≥ 45 fps on mid-range Android at low tier; LCP < 2.5 s on 4G for `/`; visual sign-off | ⏳ greybox+ procedural materials in place; authored assets pending |
| **4 CMS & commerce** | Sanity project + embedded Studio, GROQ provider in `lib/content`, print checkout or inquiry | Owner edits a project / post / print without code and sees it live; checkout only if business config supplied | ⏳ blocked on Sanity account + commerce decisions |
| **5 Avatars** | Founder + guide GLBs, retargeted clips | Swapped via `lib/config/avatars.ts` only; camera/collision/interactions unchanged; scale/orientation validated | ⏳ blocked on assets |
| **6 Hardening** | Perf profiling, a11y audit, SEO, security review, analytics, browser/device matrix, release checklist | All acceptance criteria verified on target devices | ⏳ |

## 6. Assumptions (marked defaults — change any of them)

* Contact email `keepsmilingvisuals@gmail.com` and "Gothenburg, Sweden" are taken from the existing `portfolio.html`.
* All projects, clients, stats and awards in `portfolio.html` (e.g. Netflix, Interscope, Sundance, "120+ projects") are treated as **unverified** and were not reused.
* Founder bio copy is adapted from `portfolio.html` and marked "Draft — owner to confirm".
* Budget options are in SEK (Swedish market default); edit in `content/settings.json`.
* No public phone number and no social links are configured, so no `tel:` link or social buttons are shown.
* Print commerce is disabled; prints show "Price on request" and a request form.
